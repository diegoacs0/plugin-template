import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestContext, TransactionalConnection, Logger } from '@vendure/core';
import { DeepPartial } from '@vendure/core';
import { Repository } from 'typeorm';
import { DigitalKeyService } from '../digital-key.service';
import { DigitalProductKey } from '../../entities/digital-product-key.entity';
import { KeyStatus } from '../../types';
import { DigitalVariantStockService } from '../digital-variant-stock.service';

describe('DigitalKeyService', () => {
    let service: DigitalKeyService;
    let connection: Partial<TransactionalConnection>;
    let repository: Partial<Repository<DigitalProductKey>>;
    let listQueryBuilder: any;
    let digitalVariantStockService: Partial<DigitalVariantStockService>;
    let ctx: Partial<RequestContext>;

    beforeEach(() => {
        repository = {
            create: vi.fn((input: DeepPartial<DigitalProductKey>) => ({
                ...input,
                id: `key-${Math.random()}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
            save: vi.fn(async (entities: any) => (Array.isArray(entities) ? entities : [entities])),
            find: vi.fn(async () => []),
            count: vi.fn(async () => 0),
            remove: vi.fn(async () => []),
        };

        connection = {
            getRepository: vi.fn(() => repository),
        };

        listQueryBuilder = {
            build: vi.fn(() => ({
                getManyAndCount: vi.fn(async () => [[], 0]),
            })),
        };

        digitalVariantStockService = {
            syncVariantStockFromDigitalProduct: vi.fn(async () => undefined),
        };

        ctx = { isAuthorized: vi.fn(() => true) };

        vi.spyOn(Logger, 'info').mockImplementation(() => {});
        vi.spyOn(Logger, 'error').mockImplementation(() => {});

        service = new DigitalKeyService(
            connection as TransactionalConnection,
            listQueryBuilder,
            digitalVariantStockService as DigitalVariantStockService,
            {
                provide: Symbol('MOCK'),
                useValue: { enabled: true },
            } as any,
        );
    });

    describe('addKeys', () => {
        it('should add multiple keys to a digital product', async () => {
            const input = {
                digitalProductId: 'dp-1',
                codes: ['KEY-001', 'KEY-002', 'KEY-003'],
            };

            const result = await service.addKeys(
                ctx as RequestContext,
                input.digitalProductId,
                input.codes,
            );

            expect(repository.create).toHaveBeenCalledTimes(3);
            expect(repository.save).toHaveBeenCalled();
            expect(result).toHaveLength(3);
            expect(digitalVariantStockService.syncVariantStockFromDigitalProduct).toHaveBeenCalledWith(
                ctx,
                'dp-1',
            );
        });

        it('should normalize codes by trimming whitespace', async () => {
            const codes = ['  CODE-001  ', 'CODE-002'];

            await service.addKeys(ctx as RequestContext, 'dp-1', codes);

            const createCalls = (repository.create as any).mock.calls;
            expect(createCalls[0][0].code).toBe('CODE-001');
            expect(createCalls[1][0].code).toBe('CODE-002');
        });

        it('should filter out empty codes', async () => {
            const codes = ['CODE-001', '   ', '', 'CODE-002'];

            await service.addKeys(ctx as RequestContext, 'dp-1', codes);

            // Only 2 codes should be added
            expect((repository.create as any).mock.calls.length).toBe(2);
        });

        it('should throw error if no valid codes provided', async () => {
            const codes = ['   ', '', '  '];

            await expect(
                service.addKeys(ctx as RequestContext, 'dp-1', codes),
            ).rejects.toThrow('At least one non-empty key code is required');
        });

        it('should throw error if digitalProductId is empty', async () => {
            await expect(
                service.addKeys(ctx as RequestContext, '', ['CODE-001']),
            ).rejects.toThrow('Digital product ID is required');
        });

        it('should set status to AVAILABLE for new keys', async () => {
            await service.addKeys(ctx as RequestContext, 'dp-1', ['CODE-001']);

            const createCall = (repository.create as any).mock.calls[0][0];
            expect(createCall.status).toBe(KeyStatus.AVAILABLE);
        });
    });

    describe('assignKeys', () => {
        it('should assign available keys to a digital order', async () => {
            const mockKeys = [
                { id: 'k-1', code: 'CODE-001', status: KeyStatus.AVAILABLE },
                { id: 'k-2', code: 'CODE-002', status: KeyStatus.AVAILABLE },
            ];

            (repository.find as any).mockResolvedValueOnce(mockKeys);

            const result = await service.assignKeys(
                ctx as RequestContext,
                'dp-1',
                'do-1',
                2,
            );

            expect(result).toHaveLength(2);
            expect(repository.save).toHaveBeenCalled();
            expect(digitalVariantStockService.syncVariantStockFromDigitalProduct).toHaveBeenCalledWith(
                ctx,
                'dp-1',
            );
        });

        it('should throw error if not enough keys available', async () => {
            (repository.find as any).mockResolvedValueOnce([
                { id: 'k-1', code: 'CODE-001', status: KeyStatus.AVAILABLE },
            ]);

            await expect(
                service.assignKeys(ctx as RequestContext, 'dp-1', 'do-1', 5),
            ).rejects.toThrow('Not enough license keys for digital product');
        });

        it('should throw error if quantity is invalid', async () => {
            await expect(
                service.assignKeys(ctx as RequestContext, 'dp-1', 'do-1', 0),
            ).rejects.toThrow('Quantity must be greater than zero');
        });

        it('should throw error if digitalProductId is empty', async () => {
            await expect(
                service.assignKeys(ctx as RequestContext, '', 'do-1', 1),
            ).rejects.toThrow('Digital product ID is required');
        });

        it('should throw error if digitalOrderId is empty', async () => {
            await expect(
                service.assignKeys(ctx as RequestContext, 'dp-1', '', 1),
            ).rejects.toThrow('Digital order ID is required');
        });

        it('should mark keys as ASSIGNED and set digitalOrderId', async () => {
            const mockKey = {
                id: 'k-1',
                code: 'CODE-001',
                status: KeyStatus.AVAILABLE,
            };

            (repository.find as any).mockResolvedValueOnce([mockKey]);

            await service.assignKeys(ctx as RequestContext, 'dp-1', 'do-1', 1);

            const saveCall = (repository.save as any).mock.calls[0][0];
            expect(saveCall[0].status).toBe(KeyStatus.ASSIGNED);
            expect(saveCall[0].digitalOrderId).toBe('do-1');
        });
    });

    describe('revokeKeys', () => {
        it('should revoke assigned keys back to available', async () => {
            const mockKeys = [
                { id: 'k-1', code: 'CODE-001', status: KeyStatus.ASSIGNED },
                { id: 'k-2', code: 'CODE-002', status: KeyStatus.ASSIGNED },
            ];

            (repository.find as any).mockResolvedValueOnce(mockKeys);

            const result = await service.revokeKeys(ctx as RequestContext, ['k-1', 'k-2']);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe(KeyStatus.AVAILABLE);
            expect(result[0].digitalOrderId).toBeNull();
            expect(digitalVariantStockService.syncVariantStockFromDigitalProduct).toHaveBeenCalledWith(
                ctx,
                'dp-1',
            );
        });
    });

    describe('countAvailable', () => {
        it('should return count of available keys', async () => {
            (repository.count as any).mockResolvedValueOnce(5);

            const result = await service.countAvailable(ctx as RequestContext, 'dp-1');

            expect(result).toBe(5);
            expect(repository.count).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        digitalProductId: 'dp-1',
                        status: KeyStatus.AVAILABLE,
                    },
                }),
            );
        });
    });

    describe('deleteKeys', () => {
        it('should delete available keys', async () => {
            const mockKeys = [
                { id: 'k-1', status: KeyStatus.AVAILABLE },
                { id: 'k-2', status: KeyStatus.AVAILABLE },
            ];

            (repository.find as any).mockResolvedValueOnce(mockKeys);

            const result = await service.deleteKeys(ctx as RequestContext, ['k-1', 'k-2']);

            expect(result.result).toBe('DELETED');
            expect(repository.remove).toHaveBeenCalled();
            expect(digitalVariantStockService.syncVariantStockFromDigitalProduct).toHaveBeenCalledWith(
                ctx,
                'dp-1',
            );
        });

        it('should not delete assigned or revoked keys', async () => {
            (repository.find as any).mockResolvedValueOnce([]);

            const result = await service.deleteKeys(ctx as RequestContext, ['k-1']);

            expect(repository.remove).toHaveBeenCalledWith([]);
        });

        it('should handle deletion errors gracefully', async () => {
            (repository.find as any).mockResolvedValueOnce([{ id: 'k-1' }]);
            (repository.remove as any).mockRejectedValueOnce(new Error('DB error'));

            const result = await service.deleteKeys(ctx as RequestContext, ['k-1']);

            expect(result.result).toBe('NOT_DELETED');
            expect(result.message).toContain('DB error');
        });
    });

    describe('findByDigitalProductId', () => {
        it('should return keys for a digital product', async () => {
            const mockKeys = [
                { id: 'k-1', code: 'CODE-001', status: KeyStatus.AVAILABLE },
                { id: 'k-2', code: 'CODE-002', status: KeyStatus.ASSIGNED },
            ];

            (repository.find as any).mockResolvedValueOnce(mockKeys);

            const result = await service.findByDigitalProductId(
                ctx as RequestContext,
                'dp-1',
            );

            expect(result).toHaveLength(2);
        });

        it('should filter by status if provided', async () => {
            const mockKeys = [
                { id: 'k-1', code: 'CODE-001', status: KeyStatus.AVAILABLE },
            ];

            (repository.find as any).mockResolvedValueOnce(mockKeys);

            await service.findByDigitalProductId(
                ctx as RequestContext,
                'dp-1',
                KeyStatus.AVAILABLE,
            );

            const findCall = (repository.find as any).mock.calls[0][0];
            expect(findCall.where.status).toBe(KeyStatus.AVAILABLE);
        });
    });
});
