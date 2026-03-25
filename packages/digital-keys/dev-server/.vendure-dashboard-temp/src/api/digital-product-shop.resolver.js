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
exports.DigitalProductShopResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@vendure/core");
const common_1 = require("@nestjs/common");
const digital_product_service_1 = require("../services/digital-product.service");
const digital_media_service_1 = require("../services/digital-media.service");
const digital_order_service_1 = require("../services/digital-order.service");
const digital_key_service_1 = require("../services/digital-key.service");
const constants_1 = require("../constants");
const types_1 = require("../types");
const live_chat_1 = require("../lib/live-chat");
const template_engine_1 = require("../lib/template-engine");
const html_sanitizer_1 = require("../lib/html-sanitizer");
let DigitalProductShopResolver = class DigitalProductShopResolver {
    constructor(digitalProductService, digitalMediaService, digitalOrderService, digitalKeyService, orderService, options) {
        this.digitalProductService = digitalProductService;
        this.digitalMediaService = digitalMediaService;
        this.digitalOrderService = digitalOrderService;
        this.digitalKeyService = digitalKeyService;
        this.orderService = orderService;
        this.options = options;
    }
    /**
     * Get all digital orders for the currently authenticated customer.
     */
    async myDigitalOrders(ctx) {
        if (!ctx.activeUserId)
            return [];
        // findAll with the Shop API RequestContext already scopes to the active customer
        const orders = await this.orderService.findAll(ctx, {
            filter: {
                state: { notEq: 'AddingItems' },
            },
        });
        const results = [];
        for (const order of orders.items) {
            const digitalOrder = await this.digitalOrderService.findByOrderId(ctx, order.id);
            if (!digitalOrder)
                continue;
            const items = await this.buildCustomerDigitalProducts(ctx, digitalOrder.id, order.id, order.customer?.emailAddress);
            results.push({
                digitalOrder,
                items,
            });
        }
        return results;
    }
    /**
     * Get digital order details for a specific Vendure Order.
     */
    async myDigitalOrder(ctx, args) {
        const digitalOrder = await this.digitalOrderService.findByOrderId(ctx, args.orderId);
        if (!digitalOrder)
            return null;
        // Verify the order belongs to the current user
        const order = await this.orderService.findOne(ctx, args.orderId);
        if (!order || !ctx.activeUserId)
            return null;
        // In the Shop API context, findOne already scopes by active customer,
        // so if the order was found it belongs to the current user.
        const items = await this.buildCustomerDigitalProducts(ctx, digitalOrder.id, order.id, order.customer?.emailAddress);
        return {
            digitalOrder,
            items,
        };
    }
    /**
     * Get preview media for a digital product (public access).
     */
    async digitalProductPreview(ctx, args) {
        const dp = await this.digitalProductService.findOne(ctx, args.digitalProductId);
        if (!dp)
            return null;
        const previewMedias = await this.digitalMediaService.findByDigitalProductId(ctx, dp.id, types_1.MediaAccessLevel.PREVIEW);
        return {
            id: dp.id,
            name: dp.name,
            deliveryType: dp.deliveryType,
            previewMedias,
        };
    }
    // ─── Helpers ─────────────────────────────────────────────────────────
    async buildCustomerDigitalProducts(ctx, digitalOrderId, orderId, customerEmail) {
        const digitalOrder = await this.digitalOrderService.findOne(ctx, digitalOrderId);
        if (!digitalOrder)
            return [];
        // Get all unique digital products referenced by the assigned keys
        const digitalProductIds = [
            ...new Set(digitalOrder.keys.map(k => k.digitalProductId)),
        ];
        const results = [];
        for (const dpId of digitalProductIds) {
            const dp = await this.digitalProductService.findOne(ctx, dpId);
            if (!dp)
                continue;
            // Keys assigned to this order for this digital product
            const assignedKeys = digitalOrder.keys.filter(k => k.digitalProductId === dpId);
            // Download URLs for MAIN media
            const mainMedias = await this.digitalMediaService.findByDigitalProductId(ctx, dpId, types_1.MediaAccessLevel.MAIN);
            const downloadUrls = mainMedias.map(m => m.fileUrl);
            // Service session URL
            let serviceSessionUrl = null;
            if (dp.deliveryType === types_1.DeliveryType.SERVICE && this.options.chatProvider) {
                serviceSessionUrl = (0, live_chat_1.createLiveChatSessionUrl)(this.options.chatProvider, {
                    orderId: String(orderId),
                    productId: String(dp.id),
                    productName: dp.name,
                    customerEmail: customerEmail ?? '',
                });
            }
            // Rendered instructions HTML
            let instructionsHtml = null;
            if (dp.instructionsTemplate) {
                const rendered = (0, template_engine_1.renderTemplate)({
                    template: dp.instructionsTemplate,
                    values: {
                        order: { id: orderId },
                        product: { id: dp.id, name: dp.name },
                        keys: assignedKeys.map(k => k.code),
                        customer: { email: customerEmail ?? '' },
                    },
                });
                instructionsHtml = (0, html_sanitizer_1.sanitizeRenderedHtml)(rendered);
            }
            results.push({
                digitalProduct: dp,
                keys: assignedKeys,
                downloadUrls,
                serviceSessionUrl,
                instructionsHtml,
            });
        }
        return results;
    }
};
exports.DigitalProductShopResolver = DigitalProductShopResolver;
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(core_1.Permission.Authenticated),
    __param(0, (0, core_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext]),
    __metadata("design:returntype", Promise)
], DigitalProductShopResolver.prototype, "myDigitalOrders", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(core_1.Permission.Authenticated),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductShopResolver.prototype, "myDigitalOrder", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(core_1.Permission.Public),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductShopResolver.prototype, "digitalProductPreview", null);
exports.DigitalProductShopResolver = DigitalProductShopResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __param(5, (0, common_1.Inject)(constants_1.PLUGIN_INIT_OPTIONS)),
    __metadata("design:paramtypes", [digital_product_service_1.DigitalProductService,
        digital_media_service_1.DigitalMediaService,
        digital_order_service_1.DigitalOrderService,
        digital_key_service_1.DigitalKeyService,
        core_1.OrderService, Object])
], DigitalProductShopResolver);
