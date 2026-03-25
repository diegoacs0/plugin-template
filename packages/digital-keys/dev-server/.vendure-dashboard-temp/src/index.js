"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRenderedHtml = exports.renderTemplate = exports.createLiveChatSessionUrl = exports.digitalOrderProcess = exports.DigitalShippingLineAssignmentStrategy = exports.digitalShippingEligibilityChecker = exports.digitalFulfillmentHandler = exports.DigitalOrderService = exports.DigitalMediaService = exports.DigitalKeyService = exports.DigitalProductService = exports.DigitalOrder = exports.DigitalProductMedia = exports.DigitalProductKey = exports.DigitalProduct = exports.DigitalOrderStatus = exports.MediaAccessLevel = exports.KeyStatus = exports.DeliveryType = exports.DigitalProductsPlugin = void 0;
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
var example_plugin_1 = require("./example.plugin");
Object.defineProperty(exports, "DigitalProductsPlugin", { enumerable: true, get: function () { return example_plugin_1.DigitalProductsPlugin; } });
// ─── Types ───────────────────────────────────────────────────────────────────
var types_1 = require("./types");
Object.defineProperty(exports, "DeliveryType", { enumerable: true, get: function () { return types_1.DeliveryType; } });
Object.defineProperty(exports, "KeyStatus", { enumerable: true, get: function () { return types_1.KeyStatus; } });
Object.defineProperty(exports, "MediaAccessLevel", { enumerable: true, get: function () { return types_1.MediaAccessLevel; } });
Object.defineProperty(exports, "DigitalOrderStatus", { enumerable: true, get: function () { return types_1.DigitalOrderStatus; } });
// ─── Entities ────────────────────────────────────────────────────────────────
var digital_product_entity_1 = require("./entities/digital-product.entity");
Object.defineProperty(exports, "DigitalProduct", { enumerable: true, get: function () { return digital_product_entity_1.DigitalProduct; } });
var digital_product_key_entity_1 = require("./entities/digital-product-key.entity");
Object.defineProperty(exports, "DigitalProductKey", { enumerable: true, get: function () { return digital_product_key_entity_1.DigitalProductKey; } });
var digital_product_media_entity_1 = require("./entities/digital-product-media.entity");
Object.defineProperty(exports, "DigitalProductMedia", { enumerable: true, get: function () { return digital_product_media_entity_1.DigitalProductMedia; } });
var digital_order_entity_1 = require("./entities/digital-order.entity");
Object.defineProperty(exports, "DigitalOrder", { enumerable: true, get: function () { return digital_order_entity_1.DigitalOrder; } });
// ─── Services ────────────────────────────────────────────────────────────────
var digital_product_service_1 = require("./services/digital-product.service");
Object.defineProperty(exports, "DigitalProductService", { enumerable: true, get: function () { return digital_product_service_1.DigitalProductService; } });
var digital_key_service_1 = require("./services/digital-key.service");
Object.defineProperty(exports, "DigitalKeyService", { enumerable: true, get: function () { return digital_key_service_1.DigitalKeyService; } });
var digital_media_service_1 = require("./services/digital-media.service");
Object.defineProperty(exports, "DigitalMediaService", { enumerable: true, get: function () { return digital_media_service_1.DigitalMediaService; } });
var digital_order_service_1 = require("./services/digital-order.service");
Object.defineProperty(exports, "DigitalOrderService", { enumerable: true, get: function () { return digital_order_service_1.DigitalOrderService; } });
// ─── Config (for advanced customization) ─────────────────────────────────────
var digital_fulfillment_handler_1 = require("./config/digital-fulfillment-handler");
Object.defineProperty(exports, "digitalFulfillmentHandler", { enumerable: true, get: function () { return digital_fulfillment_handler_1.digitalFulfillmentHandler; } });
var digital_shipping_eligibility_checker_1 = require("./config/digital-shipping-eligibility-checker");
Object.defineProperty(exports, "digitalShippingEligibilityChecker", { enumerable: true, get: function () { return digital_shipping_eligibility_checker_1.digitalShippingEligibilityChecker; } });
var digital_shipping_line_assignment_strategy_1 = require("./config/digital-shipping-line-assignment-strategy");
Object.defineProperty(exports, "DigitalShippingLineAssignmentStrategy", { enumerable: true, get: function () { return digital_shipping_line_assignment_strategy_1.DigitalShippingLineAssignmentStrategy; } });
var digital_order_process_1 = require("./config/digital-order-process");
Object.defineProperty(exports, "digitalOrderProcess", { enumerable: true, get: function () { return digital_order_process_1.digitalOrderProcess; } });
// ─── Lib (utilities) ─────────────────────────────────────────────────────────
var live_chat_1 = require("./lib/live-chat");
Object.defineProperty(exports, "createLiveChatSessionUrl", { enumerable: true, get: function () { return live_chat_1.createLiveChatSessionUrl; } });
var template_engine_1 = require("./lib/template-engine");
Object.defineProperty(exports, "renderTemplate", { enumerable: true, get: function () { return template_engine_1.renderTemplate; } });
var html_sanitizer_1 = require("./lib/html-sanitizer");
Object.defineProperty(exports, "sanitizeRenderedHtml", { enumerable: true, get: function () { return html_sanitizer_1.sanitizeRenderedHtml; } });
