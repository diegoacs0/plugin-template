"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DigitalProductsPlugin_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalProductsPlugin = void 0;
const core_1 = require("@vendure/core");
const api_extensions_1 = require("./api/api-extensions");
const digital_product_admin_resolver_1 = require("./api/digital-product-admin.resolver");
const digital_product_shop_resolver_1 = require("./api/digital-product-shop.resolver");
const constants_1 = require("./constants");
// Entities
const digital_product_entity_1 = require("./entities/digital-product.entity");
const digital_product_key_entity_1 = require("./entities/digital-product-key.entity");
const digital_product_media_entity_1 = require("./entities/digital-product-media.entity");
const digital_order_entity_1 = require("./entities/digital-order.entity");
// Services
const digital_product_service_1 = require("./services/digital-product.service");
const digital_key_service_1 = require("./services/digital-key.service");
const digital_media_service_1 = require("./services/digital-media.service");
const digital_order_service_1 = require("./services/digital-order.service");
const digital_order_notification_handler_1 = require("./services/digital-order-notification.handler");
// Config strategies
const digital_fulfillment_handler_1 = require("./config/digital-fulfillment-handler");
const digital_shipping_eligibility_checker_1 = require("./config/digital-shipping-eligibility-checker");
const digital_shipping_line_assignment_strategy_1 = require("./config/digital-shipping-line-assignment-strategy");
const digital_order_process_1 = require("./config/digital-order-process");
/**
 * @description
 * Digital Products Plugin for Vendure — adds support for three delivery types:
 *
 * | Type | Description |
 * |------|-------------|
 * | **File** | Downloadable files (PDFs, ZIPs, etc.) |
 * | **Key** | License keys / serial codes auto-assigned at checkout |
 * | **Service** | Live-chat / service sessions with configurable providers |
 *
 * ## Features
 * - Multi-variant digital products per product variant
 * - File uploads with main (private) and preview (public) access levels
 * - License key management with bulk import and auto-assignment
 * - HTML template engine for service and instruction pages
 * - Pluggable live chat providers (URL template, Crisp, or custom)
 * - Automatic order fulfillment when payment settles
 * - Full Admin and Shop GraphQL APIs
 *
 * @example
 * ```ts
 * import { DigitalProductsPlugin } from './plugins/digital-products';
 *
 * const config = {
 *   plugins: [
 *     DigitalProductsPlugin.init({
 *       autoFulfill: true,
 *       chatProvider: {
 *         provider: 'url-template',
 *         urlTemplate: 'https://support.example.com/chat?order={{order_id}}&email={{email}}',
 *       },
 *     }),
 *   ],
 * };
 * ```
 *
 * @category Plugin
 */
let DigitalProductsPlugin = DigitalProductsPlugin_1 = class DigitalProductsPlugin {
    /**
     * Initialize the plugin with the given options.
     */
    static init(options) {
        this.options = {
            ...this.options,
            ...options,
        };
        return DigitalProductsPlugin_1;
    }
};
exports.DigitalProductsPlugin = DigitalProductsPlugin;
/** @internal */
DigitalProductsPlugin.options = {
    enabled: true,
    autoFulfill: true,
    maxDownloadAttempts: 0,
    notificationTemplate: 'digital-order-notification',
};
exports.DigitalProductsPlugin = DigitalProductsPlugin = DigitalProductsPlugin_1 = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        providers: [
            {
                provide: constants_1.PLUGIN_INIT_OPTIONS,
                useFactory: () => DigitalProductsPlugin.options,
            },
            digital_product_service_1.DigitalProductService,
            digital_key_service_1.DigitalKeyService,
            digital_media_service_1.DigitalMediaService,
            digital_order_service_1.DigitalOrderService,
            digital_order_notification_handler_1.DigitalOrderNotificationHandler,
        ],
        adminApiExtensions: {
            resolvers: [digital_product_admin_resolver_1.DigitalProductAdminResolver],
            schema: api_extensions_1.adminApiExtensions,
        },
        shopApiExtensions: {
            resolvers: [digital_product_shop_resolver_1.DigitalProductShopResolver],
            schema: api_extensions_1.shopApiExtensions,
        },
        entities: [
            digital_product_entity_1.DigitalProduct,
            digital_product_key_entity_1.DigitalProductKey,
            digital_product_media_entity_1.DigitalProductMedia,
            digital_order_entity_1.DigitalOrder,
        ],
        dashboard: './dashboard/index.tsx',
        configuration: config => {
            // ── Custom permissions ───────────────────────────────────────
            config.authOptions.customPermissions.push(constants_1.digitalProductPermission, constants_1.digitalKeyPermission, constants_1.digitalOrderPermission);
            // ── Custom fields ───────────────────────────────────────────
            config.customFields.ProductVariant.push({
                type: 'boolean',
                name: 'isDigital',
                defaultValue: false,
                label: [{ languageCode: core_1.LanguageCode.en, value: 'This product is digital' }],
                public: true,
            });
            config.customFields.ShippingMethod.push({
                type: 'boolean',
                name: 'digitalFulfilmentOnly',
                defaultValue: false,
                label: [{ languageCode: core_1.LanguageCode.en, value: 'Digital fulfilment only' }],
                public: true,
            });
            config.customFields.Fulfillment.push({
                type: 'string',
                name: 'downloadUrls',
                nullable: true,
                list: true,
                label: [{ languageCode: core_1.LanguageCode.en, value: 'URLs of digital downloads' }],
                public: true,
            });
            // ── Fulfillment handler ─────────────────────────────────────
            config.shippingOptions.fulfillmentHandlers.push(digital_fulfillment_handler_1.digitalFulfillmentHandler);
            // ── Shipping eligibility checker ────────────────────────────
            config.shippingOptions.shippingEligibilityCheckers.push(digital_shipping_eligibility_checker_1.digitalShippingEligibilityChecker);
            // ── Shipping line assignment strategy ───────────────────────
            config.shippingOptions.shippingLineAssignmentStrategy =
                new digital_shipping_line_assignment_strategy_1.DigitalShippingLineAssignmentStrategy();
            // ── Order process ───────────────────────────────────────────
            const opts = DigitalProductsPlugin.options;
            if (opts.autoFulfill !== false) {
                config.orderOptions.process.push(digital_order_process_1.digitalOrderProcess);
            }
            return config;
        },
        compatibility: '^3.5.0',
    })
], DigitalProductsPlugin);
