import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestContext, TransactionalConnection, Logger, EventBus, Order, Customer } from '@vendure/core';
import { Repository } from 'typeorm';
import { DigitalOrderService } from '../digital-order.service';
import { DigitalOrder } from '../../entities/digital-order.entity';
import { DigitalProduct } from '../../entities/digital-product.entity';
import { DigitalProductMedia } from '../../entities/digital-product-media.entity';
import { DigitalOrderStatus, DeliveryType, MediaAccessLevel, DigitalProductsPluginOptions } from '../../types';
import { DigitalOrderNotificationEvent } from '../../events/digital-order-notification.event';
import { DigitalKeyService } from '../digital-key.service';

describe('DigitalOrderService', () => {
    let service: DigitalOrderService;
    let connection: Partial<TransactionalConnection>;
    let digitalOrderRepo: Partial<Repository<DigitalOrder>>;
    let digitalProductRepo: Partial<Repository<DigitalProduct>>;
    let mediaRepo: Partial<Repository<DigitalProductMedia>>;
    let digitalKeyService: Partial<DigitalKeyService>;
    let eventBus: Partial<EventBus>;
    let ctx: Partial<RequestContext>;

    const mockPluginOptions: DigitalProductsPluginOptions = {
        enabled: true,
        autoFulfill: true,
        chatProvider: {
            provider: 'url-template',
            urlTemplate: 'https://support.example.com/chat?order={{order_id}}&email={{email}}',
        },
    };

    beforeEach(() => {
        let savedEntity: any = null;

        digitalOrderRepo = {
            create: vi.fn((input: any) => ({ ...input, id: 'do-1' })),
            save: vi.fn(async (entity: any) => {
                savedEntity = { ...entity };
                return savedEntity;
            }),
            findOne: vi.fn(async () => savedEntity || { id: 'do-1', status: DigitalOrderStatus.FULFILLED }),
            find: vi.fn(async () => []),
        };

        digitalProductRepo = {
            find: vi.fn(async () => []),
        };

        mediaRepo = {
            find: vi.fn(async () => []),
        };

        digitalKeyService = {
            assignKeys: vi.fn(async (ctx, dpId, doId, qty) => [
                { id: 'k-1', code: 'KEY-001' },
                { id: 'k-2', code: 'KEY-002' },
            ]),
        };

        eventBus = {
            publish: vi.fn(),
        };

        connection = {
            getRepository: vi.fn((ctx, entity) => {
                if (entity === DigitalOrder) return digitalOrderRepo;
                if (entity === DigitalProduct) return digitalProductRepo;
                if (entity === DigitalProductMedia) return mediaRepo;
                return {};
            }),
            getEntityOrThrow: vi.fn(async () => ({
                id: 'do-1',
                status: DigitalOrderStatus.PENDING,
            })),
        };

        ctx = { isAuthorized: vi.fn(() => true) };

        vi.spyOn(Logger, 'info').mockImplementation(() => {});
        vi.spyOn(Logger, 'error').mockImplementation(() => {});
        vi.spyOn(Logger, 'warn').mockImplementation(() => {});

        service = new DigitalOrderService(
            connection as TransactionalConnection,
            digitalKeyService as DigitalKeyService,
            eventBus as EventBus,
            mockPluginOptions,
        );
    });

    describe('createForOrder — FILE delivery', () => {
        it('should collect download URLs from MAIN media for FILE delivery', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'eBook PDF',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            const mediaItems: DigitalProductMedia[] = [
                {
                    id: 'm-1',
                    fileUrl: 'https://s3.example.com/book.pdf',
                    fileName: 'book.pdf',
                    accessLevel: MediaAccessLevel.MAIN,
                } as any,
            ];

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);
            (mediaRepo.find as any).mockResolvedValueOnce(mediaItems);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com', firstName: 'John', lastName: 'Doe' } as any,
            } as any;

            const result = await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            expect(result.status).toBe(DigitalOrderStatus.PENDING);
            expect(eventBus.publish).toHaveBeenCalledWith(
                expect.any(DigitalOrderNotificationEvent),
            );

            const event = (eventBus.publish as any).mock.calls[0][0];
            expect(event.items[0].downloadUrls).toContain('https://s3.example.com/book.pdf');
        });

        it('should log warning if FILE product has no MAIN media', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'eBook PDF',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);
            (mediaRepo.find as any).mockResolvedValueOnce([]); // No MAIN media

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com' } as any,
            } as any;

            await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            expect(Logger.warn).toHaveBeenCalled();
        });
    });

    describe('createForOrder — KEY delivery', () => {
        it('should assign keys for KEY delivery type', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Premium License',
                deliveryType: DeliveryType.KEY,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com', firstName: 'Jane' } as any,
            } as any;

            const result = await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 2 },
            ]);

            expect(digitalKeyService.assignKeys).toHaveBeenCalledWith(
                ctx,
                'dp-1',
                expect.any(String),
                2,
            );

            expect(result.status).not.toBe(DigitalOrderStatus.FAILED);
        });

        it('should mark order as FAILED if not enough keys available', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Premium License',
                deliveryType: DeliveryType.KEY,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);
            (digitalKeyService.assignKeys as any).mockRejectedValueOnce(
                new Error('Not enough keys available'),
            );

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com' } as any,
            } as any;

            const result = await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 10 },
            ]);

            expect(result.status).toBe(DigitalOrderStatus.FAILED);
            expect(result.failureReason).toContain('Not enough keys');
        });
    });

    describe('createForOrder — SERVICE delivery', () => {
        it('should generate chat URL for SERVICE delivery', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Premium Support',
                deliveryType: DeliveryType.SERVICE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'user@example.com', firstName: 'Alice' } as any,
            } as any;

            const result = await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            const event = (eventBus.publish as any).mock.calls[0][0];
            expect(event.items[0].serviceSessionUrl).toBeTruthy();
            expect(event.items[0].serviceSessionUrl).toMatch(/https:\/\/support\.example\.com\/chat/);
            expect(event.items[0].serviceSessionUrl).toMatch(/order=ord-1/);
            expect(event.items[0].serviceSessionUrl).toMatch(/user%40example\.com/);
        });

        it('should handle missing chatProvider gracefully', async () => {
            const serviceWithNoChatProvider = new DigitalOrderService(
                connection as TransactionalConnection,
                digitalKeyService as DigitalKeyService,
                eventBus as EventBus,
                { provide: Symbol('MOCK'), useValue: { ...mockPluginOptions, chatProvider: undefined } } as any,
            );

            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Support Service',
                deliveryType: DeliveryType.SERVICE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com' } as any,
            } as any;

            await serviceWithNoChatProvider.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            expect(Logger.warn).toHaveBeenCalled();
        });
    });

    describe('createForOrder — Multi-product variants', () => {
        it('should deliver multiple digital products for a single variant', async () => {
            const product1: DigitalProduct = {
                id: 'dp-1',
                name: 'eBook',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            const product2: DigitalProduct = {
                id: 'dp-2',
                name: 'License',
                deliveryType: DeliveryType.KEY,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([product1, product2]);
            (mediaRepo.find as any).mockResolvedValueOnce([
                {
                    id: 'm-1',
                    fileUrl: 'https://s3.example.com/ebook.pdf',
                    accessLevel: MediaAccessLevel.MAIN,
                } as any,
            ]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'test@example.com' } as any,
            } as any;

            const result = await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct: product1, quantity: 1 },
                { digitalProduct: product2, quantity: 1 },
            ]);

            const event = (eventBus.publish as any).mock.calls[0][0];
            expect(event.items).toHaveLength(2);
            expect(event.items[0].deliveryType).toBe(DeliveryType.FILE);
            expect(event.items[1].deliveryType).toBe(DeliveryType.KEY);
        });
    });

    describe('createForOrder — Email notification', () => {
        it('should emit notification event with customer data', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Product',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);
            (mediaRepo.find as any).mockResolvedValueOnce([]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { emailAddress: 'john@example.com', firstName: 'John', lastName: 'Smith' } as any,
            } as any;

            await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            const event = (eventBus.publish as any).mock.calls[0][0];
            expect(event.customerEmail).toBe('john@example.com');
            expect(event.customerName).toBe('John Smith');
            expect(event.orderCode).toBe('T0001-ABC');
        });

        it('should skip notification if customer email is missing', async () => {
            const digitalProduct: DigitalProduct = {
                id: 'dp-1',
                name: 'Product',
                deliveryType: DeliveryType.FILE,
                productVariantId: 'pv-1',
                keys: [],
                medias: [],
            } as any;

            (digitalProductRepo.find as any).mockResolvedValueOnce([digitalProduct]);
            (mediaRepo.find as any).mockResolvedValueOnce([]);

            const order: Order = {
                id: 'ord-1',
                code: 'T0001-ABC',
                customer: { firstName: 'NoEmail' } as any,
            } as any;

            await service.createForOrder(ctx as RequestContext, 'ord-1', order, [
                { digitalProduct, quantity: 1 },
            ]);

            expect(Logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('no customer email found'),
                expect.anything(),
            );
            expect(eventBus.publish).not.toHaveBeenCalled();
        });
    });

    describe('findFailed', () => {
        it('should return all failed digital orders', async () => {
            const failedOrders = [
                {
                    id: 'do-1',
                    status: DigitalOrderStatus.FAILED,
                    failureReason: 'Out of stock',
                } as any,
                {
                    id: 'do-2',
                    status: DigitalOrderStatus.FAILED,
                    failureReason: 'Service error',
                } as any,
            ];

            (digitalOrderRepo.find as any).mockResolvedValueOnce(failedOrders);

            const result = await service.findFailed(ctx as RequestContext);

            expect(result).toHaveLength(2);
            expect(result[0].status).toBe(DigitalOrderStatus.FAILED);
        });
    });

    describe('markFulfilled', () => {
        it('should mark a digital order as fulfilled', async () => {
            (connection.getEntityOrThrow as any).mockResolvedValueOnce({
                id: 'do-1',
                status: DigitalOrderStatus.PENDING,
            });

            const result = await service.markFulfilled(ctx as RequestContext, 'do-1');

            expect(result.status).toBe(DigitalOrderStatus.FULFILLED);
        });
    });
});
