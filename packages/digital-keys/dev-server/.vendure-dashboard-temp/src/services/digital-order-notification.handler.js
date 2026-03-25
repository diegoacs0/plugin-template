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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalOrderNotificationHandler = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@vendure/core");
const digital_order_notification_event_1 = require("../events/digital-order-notification.event");
const constants_1 = require("../constants");
/**
 * Listens to {@link DigitalOrderNotificationEvent} and logs a summary.
 *
 * In production you should install `@vendure/email-plugin` and register a
 * proper `EmailEventListener` for this event (see dev-server/vendure-config.ts
 * for the wiring example). This service acts as a fallback that always logs
 * the delivery result and can be extended.
 */
let DigitalOrderNotificationHandler = class DigitalOrderNotificationHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    onModuleInit() {
        this.sub = this.eventBus
            .ofType(digital_order_notification_event_1.DigitalOrderNotificationEvent)
            .subscribe(event => this.handleEvent(event));
    }
    handleEvent(event) {
        if (!event.success) {
            core_1.Logger.error(`[DELIVERY FAILURE] Order ${event.orderCode} (id=${event.orderId}) ` +
                `\u2014 delivery FAILED for customer <${event.customerEmail}>.\n` +
                `Reason: ${event.errorMessage ?? 'unknown'}`, constants_1.loggerCtx);
            return;
        }
        const summary = event.items
            .map(item => {
            const parts = [`  \u2022 "${item.digitalProductName}" [${item.deliveryType}]`];
            if (item.keys.length)
                parts.push(`    keys: ${item.keys.join(', ')}`);
            if (item.downloadUrls.length)
                parts.push(`    downloads: ${item.downloadUrls.join(', ')}`);
            if (item.serviceSessionUrl)
                parts.push(`    service URL: ${item.serviceSessionUrl}`);
            return parts.join('\n');
        })
            .join('\n');
        core_1.Logger.info(`[DELIVERY OK] Order ${event.orderCode} fulfilled for <${event.customerEmail}>:\n${summary}\n` +
            `(Wire @vendure/email-plugin with DigitalOrderNotificationEvent to send a real email)`, constants_1.loggerCtx);
    }
    onModuleDestroy() {
        this.sub?.unsubscribe();
    }
};
exports.DigitalOrderNotificationHandler = DigitalOrderNotificationHandler;
exports.DigitalOrderNotificationHandler = DigitalOrderNotificationHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.EventBus])
], DigitalOrderNotificationHandler);
