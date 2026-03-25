"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalOrderNotificationEvent = void 0;
const core_1 = require("@vendure/core");
/**
 * Emitted after a digital order is processed.
 * Consumed by the email handler to send delivery notification to the customer.
 */
class DigitalOrderNotificationEvent extends core_1.VendureEvent {
    constructor(ctx, 
    /** The Vendure Order ID */
    orderId, 
    /** Human-readable order code (e.g. T0001-ABCD) */
    orderCode, 
    /** Customer email address */
    customerEmail, 
    /** Customer's display name or email if name is unavailable */
    customerName, 
    /** All digital items delivered in this order */
    items, 
    /** Whether the overall delivery succeeded */
    success, 
    /** Error message if success is false */
    errorMessage) {
        super();
        this.ctx = ctx;
        this.orderId = orderId;
        this.orderCode = orderCode;
        this.customerEmail = customerEmail;
        this.customerName = customerName;
        this.items = items;
        this.success = success;
        this.errorMessage = errorMessage;
    }
}
exports.DigitalOrderNotificationEvent = DigitalOrderNotificationEvent;
