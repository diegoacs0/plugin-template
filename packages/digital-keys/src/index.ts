/**
 * This file should export the public API of the plugin.
 * This typically includes the Plugin class itself, as well as:
 *
 * - entities
 * - services which might be used externally
 * - events
 * - custom strategies that can be configured by the user of the plugin
 */
// ─── Plugin ──────────────────────────────────────────────────────────────────
export { DigitalProductsPlugin } from './example.plugin';

// ─── Types ───────────────────────────────────────────────────────────────────
export {
    DeliveryType,
    KeyStatus,
    MediaAccessLevel,
    DigitalOrderStatus,
    DigitalProductsPluginOptions,
    ChatProviderType,
    ChatProviderConfig,
    ChatSessionInput,
    CreateDigitalProductInput,
    UpdateDigitalProductInput,
    AddDigitalProductKeysInput,
    CreateDigitalMediaInput,
    DigitalDeliveryItem,
} from './types';

// ─── Entities ────────────────────────────────────────────────────────────────
export { DigitalProduct } from './entities/digital-product.entity';
export { DigitalProductKey } from './entities/digital-product-key.entity';
export { DigitalProductMedia } from './entities/digital-product-media.entity';
export { DigitalOrder } from './entities/digital-order.entity';

// ─── Services ────────────────────────────────────────────────────────────────
export { DigitalProductService } from './services/digital-product.service';
export { DigitalKeyService } from './services/digital-key.service';
export { DigitalMediaService } from './services/digital-media.service';
export { DigitalOrderService } from './services/digital-order.service';
export { DigitalVariantStockService } from './services/digital-variant-stock.service';

// ─── Config (for advanced customization) ─────────────────────────────────────
export { digitalFulfillmentHandler } from './config/digital-fulfillment-handler';
export { digitalShippingEligibilityChecker } from './config/digital-shipping-eligibility-checker';
export { DigitalShippingLineAssignmentStrategy } from './config/digital-shipping-line-assignment-strategy';
export { digitalOrderProcess } from './config/digital-order-process';

// ─── Lib (utilities) ─────────────────────────────────────────────────────────
export { createLiveChatSessionUrl } from './lib/live-chat';
export { renderTemplate } from './lib/template-engine';
export { sanitizeRenderedHtml } from './lib/html-sanitizer';
