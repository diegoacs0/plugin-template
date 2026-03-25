import {
    FulfillmentHandler,
    LanguageCode,
    OrderLine,
    TransactionalConnection,
    Logger,
    Injector,
} from '@vendure/core';
import { In } from 'typeorm';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalProductMedia } from '../entities/digital-product-media.entity';
import { MediaAccessLevel } from '../types';
import { loggerCtx } from '../constants';

let connection: TransactionalConnection;

/**
 * Fulfillment handler for digital products.
 * Collects download URLs from all digital product media (MAIN access level)
 * and stores them on the Fulfillment's customFields.
 */
export const digitalFulfillmentHandler = new FulfillmentHandler({
    code: 'digital-fulfillment',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Handles fulfillment of digital products (files, keys, services)',
        },
    ],
    args: {},
    init(injector: Injector) {
        connection = injector.get(TransactionalConnection);
    },
    createFulfillment: async (ctx, orders, lines) => {
        const digitalDownloadUrls: string[] = [];

        const orderLines = await connection.getRepository(ctx, OrderLine).find({
            where: {
                id: In(lines.map(l => l.orderLineId)) as any,
            },
            relations: {
                productVariant: true,
            },
        });

        for (const orderLine of orderLines) {
            // Check if this variant has a linked digital product
            const digitalProducts = await connection
                .getRepository(ctx, DigitalProduct)
                .find({
                    where: { productVariantId: orderLine.productVariant.id },
                });

            for (const dp of digitalProducts) {
                const mainMedias = await connection
                    .getRepository(ctx, DigitalProductMedia)
                    .find({
                        where: {
                            digitalProductId: dp.id,
                            accessLevel: MediaAccessLevel.MAIN,
                        },
                    });

                for (const media of mainMedias) {
                    digitalDownloadUrls.push(media.fileUrl);
                }
            }
        }

        Logger.info(
            `Digital fulfillment created with ${digitalDownloadUrls.length} download URLs`,
            loggerCtx,
        );

        return {
            method: 'Digital Fulfillment',
            trackingCode: 'DIGITAL',
            customFields: {
                downloadUrls: digitalDownloadUrls,
            },
        };
    },
});
