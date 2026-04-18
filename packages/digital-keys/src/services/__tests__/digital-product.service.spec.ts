import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestContext, TransactionalConnection, Logger } from '@vendure/core';
import { DeepPartial, ID } from '@vendure/core';
import { Repository } from 'typeorm';
import { DigitalProductService } from '../digital-product.service';
import { DigitalProduct } from '../../entities/digital-product.entity';
import { DeliveryType } from '../../types';
import { DigitalVariantStockService } from '../digital-variant-stock.service';

describe('DigitalProductService', () => {
    let service: DigitalProductService;
    let connection: Partial<TransactionalConnection>;
    let repository: Partial<Repository<DigitalProduct>>;
    let listQueryBuilder: any;
    let digitalVariantStockService: Partial<DigitalVariantStockService>;
    let ctx: Partial<RequestContext>;

    beforeEach(() => {
        // Mock repository
        repository = {
            create: vi.fn((input: DeepPartial<DigitalProduct>) => ({
                ...input,
                id: 'dp-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
            save: vi.fn(async (entity: DigitalProduct) => ({ ...entity, id: 'dp-1' })),
            findOne: vi.fn(async () => ({
                id: 'dp-1',
                name: 'Test Product',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            })),
            find: vi.fn(async () => []),
            remove: vi.fn(async () => []),
        };

        // Mock connection
        connection = {
            getRepository: vi.fn(() => repository),
            getEntityOrThrow: vi.fn(async () => ({
                id: 'dp-1',
                name: 'Test Product',
                productVariantId: 'pv-1',
            })),
        };

        listQueryBuilder = {
            build: vi.fn(() => ({
                getManyAndCount: vi.fn(async () => [[], 0]),
            })),
        };

        digitalVariantStockService = {
            syncVariantStock: vi.fn(async () => undefined),
        };

        ctx = {
            isAuthorized: vi.fn(() => true),
        };

        // Mock Logger
        vi.spyOn(Logger, 'info').mockImplementation(() => {});
        vi.spyOn(Logger, 'error').mockImplementation(() => {});

        // Create service instance
        service = new DigitalProductService(
            connection as TransactionalConnection,
            listQueryBuilder,
            digitalVariantStockService as DigitalVariantStockService,
            {
                provide: Symbol('MOCK'),
                useValue: {
                    enabled: true,
                },
            } as any,
        );
    });

    describe('create', () => {
        it('should create a digital product with valid input', async () => {
            const input = {
                name: '  Test Product  ',
                deliveryType: DeliveryType.KEY,
                productVariantId: 'pv-123',
            };

            const result = await service.create(ctx as RequestContext, input);

            expect(repository.create).toHaveBeenCalled();
            expect(repository.save).toHaveBeenCalled();
            expect(result.id).toBe('dp-1');
            expect(digitalVariantStockService.syncVariantStock).toHaveBeenCalledWith(
                ctx,
                'pv-123',
            );
        });

        it('should normalize name by trimming whitespace', async () => {
            const input = {
                name: '  Padded Name  ',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-123',
            };

            await service.create(ctx as RequestContext, input);

            const createCall = (repository.create as any).mock.calls[0][0];
            expect(createCall.name).toBe('Padded Name');
        });

        it('should throw error if name is empty', async () => {
            const input = {
                name: '   ',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-123',
            };

            await expect(service.create(ctx as RequestContext, input)).rejects.toThrow(
                'Digital product name is required',
            );
        });

        it('should throw error if productVariantId is empty', async () => {
            const input = {
                name: 'Valid Name',
                deliveryType: DeliveryType.FILE,
                productVariantId: '',
            };

            await expect(service.create(ctx as RequestContext, input)).rejects.toThrow(
                'Product Variant ID is required',
            );
        });

        it('should handle optional chatTemplate and instructionsTemplate', async () => {
            const input = {
                name: 'Service Product',
                deliveryType: DeliveryType.SERVICE,
                productVariantId: 'pv-123',
                chatTemplate: '<p>Chat instructions</p>',
                instructionsTemplate: '<p>Post-purchase info</p>',
            };

            await service.create(ctx as RequestContext, input);

            const createCall = (repository.create as any).mock.calls[0][0];
            expect(createCall.chatTemplate).toBe('<p>Chat instructions</p>');
            expect(createCall.instructionsTemplate).toBe('<p>Post-purchase info</p>');
        });
    });

    describe('update', () => {
        it('should update a digital product', async () => {
            const input = {
                id: 'dp-1',
                name: 'Updated Name',
                deliveryType: DeliveryType.KEY,
            };

            await service.update(ctx as RequestContext, input);

            expect(repository.save).toHaveBeenCalled();
            expect(digitalVariantStockService.syncVariantStock).toHaveBeenCalledWith(
                ctx,
                'pv-1',
            );
        });

        it('should throw error if product ID is invalid', async () => {
            (connection.getEntityOrThrow as any).mockRejectedValueOnce(
                new Error('Entity not found'),
            );

            const input = {
                id: '',
                name: 'Updated Name',
            };

            await expect(service.update(ctx as RequestContext, input)).rejects.toThrow(
                'Entity not found',
            );
        });
    });

    describe('delete', () => {
        it('should delete a digital product', async () => {
            const result = await service.delete(ctx as RequestContext, 'dp-1');

            expect(repository.remove).toHaveBeenCalled();
            expect(result.result).toBe('DELETED');
            expect(digitalVariantStockService.syncVariantStock).toHaveBeenCalledWith(
                ctx,
                'pv-1',
            );
        });

        it('should return error response on deletion failure', async () => {
            (repository.remove as any).mockRejectedValueOnce(new Error('DB Error'));

            const result = await service.delete(ctx as RequestContext, 'dp-1');

            expect(result.result).toBe('NOT_DELETED');
            expect(result.message).toContain('DB Error');
        });
    });

    describe('findOne', () => {
        it('should find a digital product by ID', async () => {
            const result = await service.findOne(ctx as RequestContext, 'dp-1');

            expect(result).toEqual(expect.objectContaining({ id: 'dp-1' }));
        });

        it('should return null if product not found', async () => {
            (repository.findOne as any).mockResolvedValueOnce(null);

            const result = await service.findOne(ctx as RequestContext, 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByVariantId', () => {
        it('should return all digital products for a variant', async () => {
            const mockProducts: DigitalProduct[] = [
                {
                    id: 'dp-1',
                    name: 'Product 1',
                    deliveryType: DeliveryType.FILE,
                    productVariantId: 'pv-1',
                    keys: [],
                    medias: [],
                } as any,
                {
                    id: 'dp-2',
                    name: 'Product 2',
                    deliveryType: DeliveryType.KEY,
                    productVariantId: 'pv-1',
                    keys: [],
                    medias: [],
                } as any,
            ];

            (repository.find as any).mockResolvedValueOnce(mockProducts);

            const result = await service.findByVariantId(ctx as RequestContext, 'pv-1');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Product 1');
            expect(result[1].name).toBe('Product 2');
        });
    });
});
