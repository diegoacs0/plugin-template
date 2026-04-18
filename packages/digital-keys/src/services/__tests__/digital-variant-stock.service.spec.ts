import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    RequestContext,
    RequestContextService,
    StockMovementService,
    TransactionalConnection,
} from '@vendure/core';
import { Repository } from 'typeorm';
import { DigitalVariantStockService } from '../digital-variant-stock.service';
import { DigitalProduct } from '../../entities/digital-product.entity';
import { DigitalProductKey } from '../../entities/digital-product-key.entity';
import { DeliveryType, KeyStatus } from '../../types';

describe('DigitalVariantStockService', () => {
    let service: DigitalVariantStockService;
    let connection: Partial<TransactionalConnection>;
    let digitalProductRepo: Partial<Repository<DigitalProduct>>;
    let digitalKeyRepo: Partial<Repository<DigitalProductKey>>;
    let ctx: Partial<RequestContext>;
    let stockMovementService: Partial<StockMovementService>;
    let requestContextService: Partial<RequestContextService>;

    beforeEach(() => {
        digitalProductRepo = {
            find: vi.fn(async () => []),
            findOne: vi.fn(async () => null),
        };

        digitalKeyRepo = {
            count: vi.fn(async () => 0),
        };

        connection = {
            getRepository: vi.fn((...args: any[]) => {
                const entity = args.length === 1 ? args[0] : args[1];
                if (entity === DigitalProduct) {
                    return digitalProductRepo;
                }
                if (entity === DigitalProductKey) {
                    return digitalKeyRepo;
                }
                return {};
            }) as any,
        };

        stockMovementService = {
            adjustProductVariantStock: vi.fn(async () => []),
        };

        requestContextService = {
            create: vi.fn(async () => ({}) as RequestContext),
        };

        ctx = {};
        service = new DigitalVariantStockService(
            connection as TransactionalConnection,
            stockMovementService as StockMovementService,
            requestContextService as RequestContextService,
        );
    });

    it('syncs stockOnHand using the lowest available key stock across linked digital products', async () => {
        (digitalProductRepo.find as any).mockResolvedValueOnce([
            { id: 'dp-key-1', deliveryType: DeliveryType.KEY },
            { id: 'dp-key-2', deliveryType: DeliveryType.KEY },
            { id: 'dp-file', deliveryType: DeliveryType.FILE },
        ]);

        (digitalKeyRepo.count as any)
            .mockResolvedValueOnce(7)
            .mockResolvedValueOnce(3);

        await service.syncVariantStock(ctx as RequestContext, 'pv-1');

        expect(stockMovementService.adjustProductVariantStock).toHaveBeenCalledTimes(1);
        expect(stockMovementService.adjustProductVariantStock).toHaveBeenCalledWith(
            ctx,
            'pv-1',
            3,
        );
    });

    it('updates stock whenever linked KEY digital products exist', async () => {
        (digitalProductRepo.find as any).mockResolvedValueOnce([
            { id: 'dp-key-1', deliveryType: DeliveryType.KEY },
        ]);
        (digitalKeyRepo.count as any).mockResolvedValueOnce(5);
        await service.syncVariantStock(ctx as RequestContext, 'pv-1');

        expect(stockMovementService.adjustProductVariantStock).toHaveBeenCalledTimes(1);
        expect(stockMovementService.adjustProductVariantStock).toHaveBeenCalledWith(
            ctx,
            'pv-1',
            5,
        );
    });

    it('does nothing when there are no key-based digital products', async () => {
        (digitalProductRepo.find as any).mockResolvedValueOnce([
            { id: 'dp-file', deliveryType: DeliveryType.FILE },
            { id: 'dp-service', deliveryType: DeliveryType.SERVICE },
        ]);

        await service.syncVariantStock(ctx as RequestContext, 'pv-1');

        expect(digitalKeyRepo.count).not.toHaveBeenCalled();
        expect(stockMovementService.adjustProductVariantStock).not.toHaveBeenCalled();
    });

    it('resolves variant by digital product id and delegates sync', async () => {
        (digitalProductRepo.findOne as any).mockResolvedValueOnce({
            id: 'dp-1',
            productVariantId: 'pv-1',
        });

        const syncSpy = vi.spyOn(service, 'syncVariantStock').mockResolvedValueOnce();

        await service.syncVariantStockFromDigitalProduct(ctx as RequestContext, 'dp-1');

        expect(syncSpy).toHaveBeenCalledWith(ctx, 'pv-1');
    });

    it('counts only AVAILABLE keys when computing stock', async () => {
        (digitalProductRepo.find as any).mockResolvedValueOnce([
            { id: 'dp-key-1', deliveryType: DeliveryType.KEY },
        ]);
        (digitalKeyRepo.count as any).mockResolvedValueOnce(4);
        await service.syncVariantStock(ctx as RequestContext, 'pv-1');

        expect(digitalKeyRepo.count).toHaveBeenCalledWith({
            where: {
                digitalProductId: 'dp-key-1',
                status: KeyStatus.AVAILABLE,
            },
        });
    });

    it('backfills stale variant stock on module init', async () => {
        (digitalProductRepo.find as any).mockResolvedValueOnce([
            { id: 'dp-key-1', productVariantId: 'pv-1' },
        ]);
        (digitalKeyRepo.count as any).mockResolvedValueOnce(2);

        await service.onModuleInit();

        expect(requestContextService.create).toHaveBeenCalledWith({ apiType: 'admin' });
        expect(stockMovementService.adjustProductVariantStock).toHaveBeenCalledWith(
            expect.any(Object),
            'pv-1',
            2,
        );
    });
});
