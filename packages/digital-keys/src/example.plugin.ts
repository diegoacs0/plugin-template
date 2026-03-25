import { LanguageCode, PluginCommonModule, VendurePlugin, Type } from '@vendure/core';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { DigitalProductAdminResolver } from './api/digital-product-admin.resolver';
import { DigitalProductShopResolver } from './api/digital-product-shop.resolver';
import {
    digitalProductPermission,
    digitalKeyPermission,
    digitalOrderPermission,
    PLUGIN_INIT_OPTIONS,
} from './constants';
import { DigitalProductsPluginOptions } from './types';

// Entities
import { DigitalProduct } from './entities/digital-product.entity';
import { DigitalProductKey } from './entities/digital-product-key.entity';
import { DigitalProductMedia } from './entities/digital-product-media.entity';
import { DigitalOrder } from './entities/digital-order.entity';

// Services
import { DigitalProductService } from './services/digital-product.service';
import { DigitalKeyService } from './services/digital-key.service';
import { DigitalMediaService } from './services/digital-media.service';
import { DigitalOrderService } from './services/digital-order.service';
import { DigitalOrderNotificationHandler } from './services/digital-order-notification.handler';

// Config strategies
import { digitalFulfillmentHandler } from './config/digital-fulfillment-handler';
import { digitalShippingEligibilityChecker } from './config/digital-shipping-eligibility-checker';
import { DigitalShippingLineAssignmentStrategy } from './config/digital-shipping-line-assignment-strategy';
import { digitalOrderProcess } from './config/digital-order-process';

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
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        {
            provide: PLUGIN_INIT_OPTIONS,
            useFactory: () => DigitalProductsPlugin.options,
        },
        DigitalProductService,
        DigitalKeyService,
        DigitalMediaService,
        DigitalOrderService,
        DigitalOrderNotificationHandler,
    ],
    adminApiExtensions: {
        resolvers: [DigitalProductAdminResolver],
        schema: adminApiExtensions,
    },
    shopApiExtensions: {
        resolvers: [DigitalProductShopResolver],
        schema: shopApiExtensions,
    },
    entities: [
        DigitalProduct,
        DigitalProductKey,
        DigitalProductMedia,
        DigitalOrder,
    ],
    dashboard: './dashboard/index.tsx',
    configuration: config => {
        // ── Custom permissions ───────────────────────────────────────
        config.authOptions.customPermissions.push(
            digitalProductPermission,
            digitalKeyPermission,
            digitalOrderPermission,
        );

        // ── Custom fields ───────────────────────────────────────────
        config.customFields.ProductVariant.push({
            type: 'boolean',
            name: 'isDigital',
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'This product is digital' }],
            public: true,
        });

        config.customFields.ShippingMethod.push({
            type: 'boolean',
            name: 'digitalFulfilmentOnly',
            defaultValue: false,
            label: [{ languageCode: LanguageCode.en, value: 'Digital fulfilment only' }],
            public: true,
        });

        config.customFields.Fulfillment.push({
            type: 'string',
            name: 'downloadUrls',
            nullable: true,
            list: true,
            label: [{ languageCode: LanguageCode.en, value: 'URLs of digital downloads' }],
            public: true,
        });

        // ── Fulfillment handler ─────────────────────────────────────
        config.shippingOptions.fulfillmentHandlers.push(digitalFulfillmentHandler);

        // ── Shipping eligibility checker ────────────────────────────
        config.shippingOptions.shippingEligibilityCheckers.push(
            digitalShippingEligibilityChecker,
        );

        // ── Shipping line assignment strategy ───────────────────────
        config.shippingOptions.shippingLineAssignmentStrategy =
            new DigitalShippingLineAssignmentStrategy();

        // ── Order process ───────────────────────────────────────────
        const opts = DigitalProductsPlugin.options;
        if (opts.autoFulfill !== false) {
            config.orderOptions.process.push(digitalOrderProcess);
        }

        return config;
    },
    compatibility: '^3.5.0',
})
export class DigitalProductsPlugin {
    /** @internal */
    static options: DigitalProductsPluginOptions = {
        enabled: true,
        autoFulfill: true,
        maxDownloadAttempts: 0,
        notificationTemplate: 'digital-order-notification',
    };

    /**
     * Initialize the plugin with the given options.
     */
    static init(options: DigitalProductsPluginOptions): Type<DigitalProductsPlugin> {
        this.options = {
            ...this.options,
            ...options,
        };
        return DigitalProductsPlugin;
    }
}
