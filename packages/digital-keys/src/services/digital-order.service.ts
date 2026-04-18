import { Inject, Injectable } from '@nestjs/common';
import { ID } from '@vendure/common/lib/shared-types';
import {
    RequestContext,
    TransactionalConnection,
    Logger,
    EventBus,
    Order,
    Customer,
} from '@vendure/core';
import { PLUGIN_INIT_OPTIONS, loggerCtx } from '../constants';
import { DigitalOrder } from '../entities/digital-order.entity';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalProductMedia } from '../entities/digital-product-media.entity';
import { DigitalKeyService } from './digital-key.service';
import {
    DeliveryType,
    DigitalOrderStatus,
    DigitalProductsPluginOptions,
    ChatSessionInput,
    MediaAccessLevel,
} from '../types';
import {
    DigitalDeliveryItem,
    DigitalOrderNotificationEvent,
} from '../events/digital-order-notification.event';

function buildChatUrl(
    options: DigitalProductsPluginOptions,
    input: ChatSessionInput,
): string | null {
    const cfg = options.chatProvider;
    if (!cfg) return null;

    switch (cfg.provider) {
        case 'url-template': {
            const tpl = cfg.urlTemplate ?? '';
            return tpl
                .replace(/\{\{order_id\}\}/g, String(input.orderId))
                .replace(/\{\{email\}\}/g, encodeURIComponent(input.customerEmail))
                .replace(/\{\{product_id\}\}/g, String(input.productId))
                .replace(/\{\{product_name\}\}/g, encodeURIComponent(input.productName));
        }
        case 'crisp': {
            const base = cfg.crispWebsiteUrl ?? '';
            const params = new URLSearchParams({
                order_id: String(input.orderId),
                email: input.customerEmail,
            });
            return `${base}?${params.toString()}`;
        }
        case 'custom': {
            return cfg.customProvider ? cfg.customProvider(input) : null;
        }
        default:
            return null;
    }
}

@Injectable()
export class DigitalOrderService {
    constructor(
        private connection: TransactionalConnection,
        private digitalKeyService: DigitalKeyService,
        private eventBus: EventBus,
        @Inject(PLUGIN_INIT_OPTIONS) private options: DigitalProductsPluginOptions,
    ) {}

    private normalizeString(value: unknown): string {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }

    findOne(
        ctx: RequestContext,
        id: ID,
    ): Promise<DigitalOrder | null> {
        return this.connection.getRepository(ctx, DigitalOrder).findOne({
            where: { id },
            relations: ['order', 'keys', 'keys.digitalProduct'],
        });
    }

    findByOrderId(ctx: RequestContext, orderId: ID): Promise<DigitalOrder | null> {
        return this.connection.getRepository(ctx, DigitalOrder).findOne({
            where: { orderId },
            relations: ['order', 'keys', 'keys.digitalProduct'],
        });
    }

    /**
     * Find all DigitalOrders with FAILED status (for admin alerting).
     */
    findFailed(ctx: RequestContext): Promise<DigitalOrder[]> {
        return this.connection.getRepository(ctx, DigitalOrder).find({
            where: { status: DigitalOrderStatus.FAILED },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Create a DigitalOrder for a Vendure Order.
     *
     * For each digital product:
     * - FILE    → collects download URLs from MAIN media files
     * - KEY     → assigns N keys from the inventory pool
     * - SERVICE → generates a chat session URL via the chatProvider config
     *
     * All digital products linked to a given variant are processed.
     * Partial failures (e.g. not enough keys) mark the order as `failed` and
     * record the reason; other products still proceed.
     *
     * A {@link DigitalOrderNotificationEvent} is emitted at the end so the
     * EmailPlugin (or any other subscriber) can send a delivery email.
     */
    async createForOrder(
        ctx: RequestContext,
        orderId: ID,
        order: Order,
        digitalProducts: Array<{ digitalProduct: DigitalProduct; quantity: number }>,
    ): Promise<DigitalOrder> {
        const normalizedOrderId = this.normalizeString(orderId);
        if (!normalizedOrderId) {
            throw new Error('Order ID is required');
        }

        // Resolve customer email + name for notifications
        const customer: Customer | undefined = (order as any).customer;
        const customerEmail = customer?.emailAddress ?? '';
        const customerName =
            customer?.firstName && customer?.lastName
                ? `${customer.firstName} ${customer.lastName}`.trim()
                : customerEmail;

        // Create the DigitalOrder record
        const repository = this.connection.getRepository(ctx, DigitalOrder);
        const digitalOrder = repository.create({
            orderId: normalizedOrderId,
            status: DigitalOrderStatus.PENDING,
            failureReason: null,
        });
        const saved = await repository.save(digitalOrder);

        const deliveredItems: DigitalDeliveryItem[] = [];
        const failureMessages: string[] = [];

        // ── Process each digital product ──────────────────────────────────────
        for (const { digitalProduct: dp, quantity } of digitalProducts) {
            const item: DigitalDeliveryItem = {
                digitalProductId: dp.id,
                digitalProductName: dp.name,
                deliveryType: dp.deliveryType as 'file' | 'key' | 'service',
                keys: [],
                downloadUrls: [],
                serviceSessionUrl: null,
            };

            try {
                switch (dp.deliveryType) {
                    // ── FILE ────────────────────────────────────────────────
                    case DeliveryType.FILE: {
                        const mainMedias = await this.connection
                            .getRepository(ctx, DigitalProductMedia)
                            .find({
                                where: {
                                    digitalProductId: dp.id,
                                    accessLevel: MediaAccessLevel.MAIN,
                                },
                            });
                        item.downloadUrls = mainMedias.map(m => m.fileUrl);

                        if (item.downloadUrls.length === 0) {
                            Logger.warn(
                                `Digital product ${dp.id} ("${dp.name}") deliveryType=file ` +
                                    `has no MAIN media files attached.`,
                                loggerCtx,
                            );
                        }
                        break;
                    }

                    // ── KEY ─────────────────────────────────────────────────
                    case DeliveryType.KEY: {
                        const assignedKeys = await this.digitalKeyService.assignKeys(
                            ctx,
                            dp.id,
                            saved.id,
                            quantity,
                        );
                        item.keys = assignedKeys.map(k => k.code);
                        break;
                    }

                    // ── SERVICE ─────────────────────────────────────────────
                    case DeliveryType.SERVICE: {
                        const url = buildChatUrl(this.options, {
                            orderId: String(orderId),
                            productId: String(dp.id),
                            productName: dp.name,
                            customerEmail,
                        });

                        if (!url) {
                            Logger.warn(
                                `Digital product ${dp.id} ("${dp.name}") deliveryType=service ` +
                                    `but no chatProvider is configured in plugin options.`,
                                loggerCtx,
                            );
                        }

                        item.serviceSessionUrl = url;
                        break;
                    }
                }

                deliveredItems.push(item);
            } catch (err: any) {
                const msg =
                    `Failed to deliver "${dp.name}" ` +
                    `(type=${dp.deliveryType}, id=${dp.id}): ${err.message}`;
                Logger.error(msg, loggerCtx);
                failureMessages.push(msg);
                deliveredItems.push(item); // still include so customer sees what failed
            }
        }

        // ── Persist final status ───────────────────────────────────────────────
        if (failureMessages.length > 0) {
            saved.status = DigitalOrderStatus.FAILED;
            saved.failureReason = failureMessages.join('\n');
            await repository.save(saved);

            Logger.error(
                `[DELIVERY FAILURE] Digital order ${saved.id} for Vendure order ${orderId} ` +
                    `marked FAILED:\n${saved.failureReason}`,
                loggerCtx,
            );
        } else {
            saved.status = DigitalOrderStatus.FULFILLED;
            await repository.save(saved);

            Logger.info(
                `Digital order ${saved.id} for Vendure order ${orderId} marked FULFILLED`,
                loggerCtx,
            );
        }

        // ── Emit notification event (email + any other handler) ────────────────
        if (customerEmail) {
            this.eventBus.publish(
                new DigitalOrderNotificationEvent(
                    ctx,
                    orderId,
                    (order as any).code ?? String(orderId),
                    customerEmail,
                    customerName,
                    deliveredItems,
                    failureMessages.length === 0,
                    failureMessages.length > 0 ? failureMessages.join('\n') : undefined,
                ),
            );
        } else {
            Logger.warn(
                `Digital order ${saved.id}: no customer email found — notification skipped.`,
                loggerCtx,
            );
        }

        Logger.info(
            `Created digital order ${saved.id} for order ${orderId} — ` +
                `${deliveredItems.length} product(s), ${failureMessages.length} failure(s).`,
            loggerCtx,
        );

        return this.findOne(ctx, saved.id) as Promise<DigitalOrder>;
    }

    /**
     * Mark a digital order as fulfilled.
     */
    async markFulfilled(
        ctx: RequestContext,
        digitalOrderId: ID,
    ): Promise<DigitalOrder> {
        const order = await this.connection.getEntityOrThrow(
            ctx,
            DigitalOrder,
            digitalOrderId,
        );
        order.status = DigitalOrderStatus.FULFILLED;
        return this.connection
            .getRepository(ctx, DigitalOrder)
            .save(order);
    }
}
