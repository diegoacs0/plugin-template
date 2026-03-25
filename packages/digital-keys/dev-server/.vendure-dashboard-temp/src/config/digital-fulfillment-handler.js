"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalFulfillmentHandler = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const digital_product_entity_1 = require("../entities/digital-product.entity");
const digital_product_media_entity_1 = require("../entities/digital-product-media.entity");
const types_1 = require("../types");
const constants_1 = require("../constants");
let connection;
/**
 * Fulfillment handler for digital products.
 * Collects download URLs from all digital product media (MAIN access level)
 * and stores them on the Fulfillment's customFields.
 */
exports.digitalFulfillmentHandler = new core_1.FulfillmentHandler({
    code: 'digital-fulfillment',
    description: [
        {
            languageCode: core_1.LanguageCode.en,
            value: 'Handles fulfillment of digital products (files, keys, services)',
        },
    ],
    args: {},
    init(injector) {
        connection = injector.get(core_1.TransactionalConnection);
    },
    createFulfillment: async (ctx, orders, lines) => {
        const digitalDownloadUrls = [];
        const orderLines = await connection.getRepository(ctx, core_1.OrderLine).find({
            where: {
                id: (0, typeorm_1.In)(lines.map(l => l.orderLineId)),
            },
            relations: {
                productVariant: true,
            },
        });
        for (const orderLine of orderLines) {
            // Check if this variant has a linked digital product
            const digitalProducts = await connection
                .getRepository(ctx, digital_product_entity_1.DigitalProduct)
                .find({
                where: { productVariantId: orderLine.productVariant.id },
            });
            for (const dp of digitalProducts) {
                const mainMedias = await connection
                    .getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia)
                    .find({
                    where: {
                        digitalProductId: dp.id,
                        accessLevel: types_1.MediaAccessLevel.MAIN,
                    },
                });
                for (const media of mainMedias) {
                    digitalDownloadUrls.push(media.fileUrl);
                }
            }
        }
        core_1.Logger.info(`Digital fulfillment created with ${digitalDownloadUrls.length} download URLs`, constants_1.loggerCtx);
        return {
            method: 'Digital Fulfillment',
            trackingCode: 'DIGITAL',
            customFields: {
                downloadUrls: digitalDownloadUrls,
            },
        };
    },
});
