import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    ID,
    Logger,
    RequestContext,
    RequestContextService,
    StockMovementService,
    TransactionalConnection,
} from '@vendure/core';
import { loggerCtx } from '../constants';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalProductKey } from '../entities/digital-product-key.entity';
import { DeliveryType, KeyStatus } from '../types';

@Injectable()
export class DigitalVariantStockService implements OnModuleInit {
    constructor(
        private connection: TransactionalConnection,
        private stockMovementService: StockMovementService,
        private requestContextService: RequestContextService,
    ) {}

    async onModuleInit(): Promise<void> {
        const ctx = await this.requestContextService.create({
            apiType: 'admin',
        });
        await this.syncAllVariantStocks(ctx);
    }

    private normalizeString(value: unknown): string {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }

    async syncVariantStockFromDigitalProduct(
        ctx: RequestContext,
        digitalProductId: ID,
    ): Promise<void> {
        const normalizedDigitalProductId = this.normalizeString(digitalProductId);
        if (!normalizedDigitalProductId) {
            return;
        }

        const digitalProduct = await this.connection
            .getRepository(ctx, DigitalProduct)
            .findOne({
                where: { id: normalizedDigitalProductId },
                select: ['id', 'productVariantId'],
            });

        if (!digitalProduct?.productVariantId) {
            return;
        }

        await this.syncVariantStock(ctx, digitalProduct.productVariantId);
    }

    async syncVariantStock(ctx: RequestContext, variantId: ID): Promise<void> {
        const normalizedVariantId = this.normalizeString(variantId);
        if (!normalizedVariantId) {
            return;
        }

        const productRepo = this.connection.getRepository(ctx, DigitalProduct);
        const keyRepo = this.connection.getRepository(ctx, DigitalProductKey);
        const digitalProducts = await productRepo.find({
            where: { productVariantId: normalizedVariantId },
            select: ['id', 'deliveryType'],
        });

        if (digitalProducts.length === 0) {
            return;
        }

        const constrainedStocks: number[] = [];
        for (const digitalProduct of digitalProducts) {
            if (digitalProduct.deliveryType !== DeliveryType.KEY) {
                continue;
            }
            const availableKeys = await keyRepo.count({
                where: {
                    digitalProductId: digitalProduct.id,
                    status: KeyStatus.AVAILABLE,
                },
            });
            constrainedStocks.push(availableKeys);
        }

        if (constrainedStocks.length === 0) {
            return;
        }

        const minAvailableStock = Math.max(0, Math.min(...constrainedStocks));

        await this.stockMovementService.adjustProductVariantStock(
            ctx,
            normalizedVariantId,
            minAvailableStock,
        );

        Logger.info(
            `Synced stockOnHand for variant ${normalizedVariantId} to ${minAvailableStock} ` +
                `(minimum available keys across linked digital products).`,
            loggerCtx,
        );
    }

    private async syncAllVariantStocks(ctx: RequestContext): Promise<void> {
        const productRepo = this.connection.getRepository(DigitalProduct);
        const keyRepo = this.connection.getRepository(DigitalProductKey);

        const keyDigitalProducts = await productRepo.find({
            where: { deliveryType: DeliveryType.KEY },
            select: ['id', 'productVariantId'],
        });

        const digitalProductIdsByVariant = new Map<string, string[]>();
        for (const digitalProduct of keyDigitalProducts) {
            const variantId = this.normalizeString(digitalProduct.productVariantId);
            if (!variantId) {
                continue;
            }
            const existing = digitalProductIdsByVariant.get(variantId) ?? [];
            existing.push(String(digitalProduct.id));
            digitalProductIdsByVariant.set(variantId, existing);
        }

        for (const [variantId, digitalProductIds] of digitalProductIdsByVariant.entries()) {
            const availableCounts: number[] = [];

            for (const digitalProductId of digitalProductIds) {
                const available = await keyRepo.count({
                    where: {
                        digitalProductId,
                        status: KeyStatus.AVAILABLE,
                    },
                });
                availableCounts.push(available);
            }

            if (availableCounts.length === 0) {
                continue;
            }

            const minAvailableStock = Math.max(0, Math.min(...availableCounts));
            await this.stockMovementService.adjustProductVariantStock(
                ctx,
                variantId,
                minAvailableStock,
            );

            Logger.info(
                `Backfilled stockOnHand for variant ${variantId} to ${minAvailableStock}.`,
                loggerCtx,
            );
        }
    }
}
