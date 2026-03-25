"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalOrderProcess = void 0;
const core_1 = require("@vendure/core");
const digital_fulfillment_handler_1 = require("./digital-fulfillment-handler");
const digital_product_entity_1 = require("../entities/digital-product.entity");
const digital_order_service_1 = require("../services/digital-order.service");
const types_1 = require("../types");
const constants_1 = require("../constants");
let orderService;
let connection;
let digitalOrderService;
/**
 * Custom OrderProcess that automatically fulfills digital products
 * when an order transitions to PaymentSettled.
 *
 * It also creates a DigitalOrder record and assigns license keys.
 */
exports.digitalOrderProcess = {
    init(injector) {
        orderService = injector.get(core_1.OrderService);
        connection = injector.get(core_1.TransactionalConnection);
        digitalOrderService = injector.get(digital_order_service_1.DigitalOrderService);
    },
    async onTransitionEnd(fromState, toState, data) {
        if (fromState === 'ArrangingPayment' &&
            (toState === 'PaymentAuthorized' || toState === 'PaymentSettled')) {
            // We need to load order lines with their productVariant + customFields
            // because data.order.lines may not have the relations eagerly loaded.
            const order = await orderService.findOne(data.ctx, data.order.id, ['lines', 'lines.productVariant']);
            if (!order)
                return;
            const digitalOrderLines = order.lines.filter((l) => l.productVariant?.customFields?.isDigital);
            if (!digitalOrderLines.length)
                return;
            core_1.Logger.info(`Order ${order.code}: ${digitalOrderLines.length} digital line(s) detected, auto-fulfilling...`, constants_1.loggerCtx);
            try {
                // 1. Collect digital products and quantities
                const digitalProductsToProcess = [];
                for (const line of digitalOrderLines) {
                    const dps = await connection
                        .getRepository(data.ctx, digital_product_entity_1.DigitalProduct)
                        .find({
                        where: { productVariantId: line.productVariant.id },
                    });
                    for (const dp of dps) {
                        digitalProductsToProcess.push({
                            digitalProduct: dp,
                            quantity: line.quantity,
                        });
                    }
                }
                // 2. Create DigitalOrder — handles FILE/KEY/SERVICE delivery types
                if (digitalProductsToProcess.length > 0) {
                    const existing = await digitalOrderService.findByOrderId(data.ctx, order.id);
                    if (!existing) {
                        // Load order with customer relation for email notification
                        const orderWithCustomer = await orderService.findOne(data.ctx, order.id, ['lines', 'lines.productVariant', 'customer']) ?? order;
                        const savedDigitalOrder = await digitalOrderService.createForOrder(data.ctx, order.id, orderWithCustomer, digitalProductsToProcess);
                        // Only mark as fulfilled if it's not already failed
                        if (savedDigitalOrder.status !== types_1.DigitalOrderStatus.FAILED) {
                            await digitalOrderService.markFulfilled(data.ctx, savedDigitalOrder.id);
                        }
                    }
                }
                // 3. Create Vendure Fulfillment for the digital lines
                await orderService.createFulfillment(data.ctx, {
                    lines: digitalOrderLines.map((l) => ({
                        orderLineId: l.id,
                        quantity: l.quantity,
                    })),
                    handler: {
                        code: digital_fulfillment_handler_1.digitalFulfillmentHandler.code,
                        arguments: [],
                    },
                });
                core_1.Logger.info(`Order ${order.code}: digital products fulfilled successfully`, constants_1.loggerCtx);
            }
            catch (err) {
                core_1.Logger.error(`Order ${order.code}: failed to auto-fulfill digital products: ${err.message}`, constants_1.loggerCtx);
            }
        }
    },
};
