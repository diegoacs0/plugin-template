"use strict";
// ─── Enums ────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalOrderStatus = exports.MediaAccessLevel = exports.KeyStatus = exports.DeliveryType = void 0;
/**
 * The type of digital delivery for a product variant.
 */
var DeliveryType;
(function (DeliveryType) {
    /** Downloadable file (PDF, ZIP, etc.) */
    DeliveryType["FILE"] = "file";
    /** License key / serial code */
    DeliveryType["KEY"] = "key";
    /** Service / live-chat session */
    DeliveryType["SERVICE"] = "service";
})(DeliveryType || (exports.DeliveryType = DeliveryType = {}));
/**
 * Status of a license key.
 */
var KeyStatus;
(function (KeyStatus) {
    KeyStatus["AVAILABLE"] = "available";
    KeyStatus["ASSIGNED"] = "assigned";
    KeyStatus["REVOKED"] = "revoked";
})(KeyStatus || (exports.KeyStatus = KeyStatus = {}));
/**
 * Access level for media files.
 */
var MediaAccessLevel;
(function (MediaAccessLevel) {
    /** Private — only accessible after purchase (download) */
    MediaAccessLevel["MAIN"] = "main";
    /** Public — preview media accessible before purchase */
    MediaAccessLevel["PREVIEW"] = "preview";
})(MediaAccessLevel || (exports.MediaAccessLevel = MediaAccessLevel = {}));
/**
 * Status of a digital product order.
 */
var DigitalOrderStatus;
(function (DigitalOrderStatus) {
    DigitalOrderStatus["PENDING"] = "pending";
    DigitalOrderStatus["FULFILLED"] = "fulfilled";
    DigitalOrderStatus["FAILED"] = "failed";
})(DigitalOrderStatus || (exports.DigitalOrderStatus = DigitalOrderStatus = {}));
