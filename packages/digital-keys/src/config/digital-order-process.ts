import {
    Injector,
    Logger,
    OrderProcess,
    OrderService,
    TransactionalConnection,
} from '@vendure/core';
import { digitalFulfillmentHandler } from './digital-fulfillment-handler';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalOrderService } from '../services/digital-order.service';
import { DigitalOrderStatus } from '../types';
import { loggerCtx } from '../constants';

let orderService: OrderService;
let connection: TransactionalConnection;
let digitalOrderService: DigitalOrderService;

/**
 * Custom OrderProcess that automatically fulfills digital products
 * when an order transitions to PaymentSettled.
 *
 * It also creates a DigitalOrder record and assigns license keys.
 */
export const digitalOrderProcess: OrderProcess<string> = {
    init(injector: Injector) {
        orderService = injector.get(OrderService);
        connection = injector.get(TransactionalConnection);
        digitalOrderService = injector.get(DigitalOrderService);
    },

    async onTransitionEnd(fromState, toState, data) {
        if (
            fromState === 'ArrangingPayment' &&
            (toState === 'PaymentAuthorized' || toState === 'PaymentSettled')
        ) {
            // We need to load order lines with their productVariant + customFields
            // because data.order.lines may not have the relations eagerly loaded.
            const order = await orderService.findOne(data.ctx, data.order.id, ['lines', 'lines.productVariant']);
            if (!order) return;

            const digitalOrderLines = order.lines.filter(
                (l: any) => l.productVariant?.customFields?.isDigital,
            );

            if (!digitalOrderLines.length) return;

            Logger.info(
                `Order ${order.code}: ${digitalOrderLines.length} digital line(s) detected, auto-fulfilling...`,
                loggerCtx,
            );

            try {
                // 1. Collect digital products and quantities
                const digitalProductsToProcess: Array<{
                    digitalProduct: DigitalProduct;
                    quantity: number;
                }> = [];

                for (const line of digitalOrderLines) {
                    const dps = await connection
                        .getRepository(data.ctx, DigitalProduct)
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
                        const orderWithCustomer = await orderService.findOne(
                            data.ctx,
                            order.id,
                            ['lines', 'lines.productVariant', 'customer'],
                        ) ?? order;

                        const savedDigitalOrder = await digitalOrderService.createForOrder(
                            data.ctx,
                            order.id,
                            orderWithCustomer as any,
                            digitalProductsToProcess,
                        );

                        // Only mark as fulfilled if it's not already failed
                        if (savedDigitalOrder.status !== DigitalOrderStatus.FAILED) {
                            await digitalOrderService.markFulfilled(data.ctx, savedDigitalOrder.id);
                        }
                    }
                }

                // 3. Create Vendure Fulfillment for the digital lines
                await orderService.createFulfillment(data.ctx, {
                    lines: digitalOrderLines.map((l: any) => ({
                        orderLineId: l.id,
                        quantity: l.quantity,
                    })),
                    handler: {
                        code: digitalFulfillmentHandler.code,
                        arguments: [],
                    },
                });

                Logger.info(
                    `Order ${order.code}: digital products fulfilled successfully`,
                    loggerCtx,
                );
            } catch (err: any) {
                Logger.error(
                    `Order ${order.code}: failed to auto-fulfill digital products: ${err.message}`,
                    loggerCtx,
                );
            }
        }
    },
};
