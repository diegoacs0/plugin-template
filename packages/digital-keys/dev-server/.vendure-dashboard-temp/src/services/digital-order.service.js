"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalOrderService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@vendure/core");
const constants_1 = require("../constants");
const digital_order_entity_1 = require("../entities/digital-order.entity");
const digital_product_media_entity_1 = require("../entities/digital-product-media.entity");
const digital_key_service_1 = require("./digital-key.service");
const types_1 = require("../types");
const digital_order_notification_event_1 = require("../events/digital-order-notification.event");
function buildChatUrl(options, input) {
    const cfg = options.chatProvider;
    if (!cfg)
        return null;
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
let DigitalOrderService = class DigitalOrderService {
    constructor(connection, digitalKeyService, eventBus, options) {
        this.connection = connection;
        this.digitalKeyService = digitalKeyService;
        this.eventBus = eventBus;
        this.options = options;
    }
    normalizeString(value) {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }
    findOne(ctx, id) {
        return this.connection.getRepository(ctx, digital_order_entity_1.DigitalOrder).findOne({
            where: { id },
            relations: ['order', 'keys', 'keys.digitalProduct'],
        });
    }
    findByOrderId(ctx, orderId) {
        return this.connection.getRepository(ctx, digital_order_entity_1.DigitalOrder).findOne({
            where: { orderId },
            relations: ['order', 'keys', 'keys.digitalProduct'],
        });
    }
    /**
     * Find all DigitalOrders with FAILED status (for admin alerting).
     */
    findFailed(ctx) {
        return this.connection.getRepository(ctx, digital_order_entity_1.DigitalOrder).find({
            where: { status: types_1.DigitalOrderStatus.FAILED },
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
    async createForOrder(ctx, orderId, order, digitalProducts) {
        const normalizedOrderId = this.normalizeString(orderId);
        if (!normalizedOrderId) {
            throw new Error('Order ID is required');
        }
        // Resolve customer email + name for notifications
        const customer = order.customer;
        const customerEmail = customer?.emailAddress ?? '';
        const customerName = customer?.firstName && customer?.lastName
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : customerEmail;
        // Create the DigitalOrder record
        const repository = this.connection.getRepository(ctx, digital_order_entity_1.DigitalOrder);
        const digitalOrder = repository.create({
            orderId: normalizedOrderId,
            status: types_1.DigitalOrderStatus.PENDING,
            failureReason: null,
        });
        const saved = await repository.save(digitalOrder);
        const deliveredItems = [];
        const failureMessages = [];
        // ── Process each digital product ──────────────────────────────────────
        for (const { digitalProduct: dp, quantity } of digitalProducts) {
            const item = {
                digitalProductId: dp.id,
                digitalProductName: dp.name,
                deliveryType: dp.deliveryType,
                keys: [],
                downloadUrls: [],
                serviceSessionUrl: null,
            };
            try {
                switch (dp.deliveryType) {
                    // ── FILE ────────────────────────────────────────────────
                    case types_1.DeliveryType.FILE: {
                        const mainMedias = await this.connection
                            .getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia)
                            .find({
                            where: {
                                digitalProductId: dp.id,
                                accessLevel: types_1.MediaAccessLevel.MAIN,
                            },
                        });
                        item.downloadUrls = mainMedias.map(m => m.fileUrl);
                        if (item.downloadUrls.length === 0) {
                            core_1.Logger.warn(`Digital product ${dp.id} ("${dp.name}") deliveryType=file ` +
                                `has no MAIN media files attached.`, constants_1.loggerCtx);
                        }
                        break;
                    }
                    // ── KEY ─────────────────────────────────────────────────
                    case types_1.DeliveryType.KEY: {
                        const assignedKeys = await this.digitalKeyService.assignKeys(ctx, dp.id, saved.id, quantity);
                        item.keys = assignedKeys.map(k => k.code);
                        break;
                    }
                    // ── SERVICE ─────────────────────────────────────────────
                    case types_1.DeliveryType.SERVICE: {
                        const url = buildChatUrl(this.options, {
                            orderId: String(orderId),
                            productId: String(dp.id),
                            productName: dp.name,
                            customerEmail,
                        });
                        if (!url) {
                            core_1.Logger.warn(`Digital product ${dp.id} ("${dp.name}") deliveryType=service ` +
                                `but no chatProvider is configured in plugin options.`, constants_1.loggerCtx);
                        }
                        item.serviceSessionUrl = url;
                        break;
                    }
                }
                deliveredItems.push(item);
            }
            catch (err) {
                const msg = `Failed to deliver "${dp.name}" ` +
                    `(type=${dp.deliveryType}, id=${dp.id}): ${err.message}`;
                core_1.Logger.error(msg, constants_1.loggerCtx);
                failureMessages.push(msg);
                deliveredItems.push(item); // still include so customer sees what failed
            }
        }
        // ── Persist final status ───────────────────────────────────────────────
        if (failureMessages.length > 0) {
            saved.status = types_1.DigitalOrderStatus.FAILED;
            saved.failureReason = failureMessages.join('\n');
            await repository.save(saved);
            core_1.Logger.error(`[DELIVERY FAILURE] Digital order ${saved.id} for Vendure order ${orderId} ` +
                `marked FAILED:\n${saved.failureReason}`, constants_1.loggerCtx);
        }
        // ── Emit notification event (email + any other handler) ────────────────
        if (customerEmail) {
            this.eventBus.publish(new digital_order_notification_event_1.DigitalOrderNotificationEvent(ctx, orderId, order.code ?? String(orderId), customerEmail, customerName, deliveredItems, failureMessages.length === 0, failureMessages.length > 0 ? failureMessages.join('\n') : undefined));
        }
        else {
            core_1.Logger.warn(`Digital order ${saved.id}: no customer email found — notification skipped.`, constants_1.loggerCtx);
        }
        core_1.Logger.info(`Created digital order ${saved.id} for order ${orderId} — ` +
            `${deliveredItems.length} product(s), ${failureMessages.length} failure(s).`, constants_1.loggerCtx);
        return this.findOne(ctx, saved.id);
    }
    /**
     * Mark a digital order as fulfilled.
     */
    async markFulfilled(ctx, digitalOrderId) {
        const order = await this.connection.getEntityOrThrow(ctx, digital_order_entity_1.DigitalOrder, digitalOrderId);
        order.status = types_1.DigitalOrderStatus.FULFILLED;
        return this.connection
            .getRepository(ctx, digital_order_entity_1.DigitalOrder)
            .save(order);
    }
};
exports.DigitalOrderService = DigitalOrderService;
exports.DigitalOrderService = DigitalOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(constants_1.PLUGIN_INIT_OPTIONS)),
    __metadata("design:paramtypes", [core_1.TransactionalConnection,
        digital_key_service_1.DigitalKeyService,
        core_1.EventBus, Object])
], DigitalOrderService);
