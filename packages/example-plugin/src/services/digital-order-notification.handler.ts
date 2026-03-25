import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, Logger } from '@vendure/core';
import { DigitalOrderNotificationEvent } from '../events/digital-order-notification.event';
import { loggerCtx } from '../constants';

/**
 * Listens to {@link DigitalOrderNotificationEvent} and logs a summary.
 *
 * In production you should install `@vendure/email-plugin` and register a
 * proper `EmailEventListener` for this event (see dev-server/vendure-config.ts
 * for the wiring example). This service acts as a fallback that always logs
 * the delivery result and can be extended.
 */
@Injectable()
export class DigitalOrderNotificationHandler implements OnModuleInit {
    private sub: any; // Subscription — typed as any to avoid dual rxjs declarations

    constructor(private eventBus: EventBus) {}

    onModuleInit() {
        this.sub = this.eventBus
            .ofType(DigitalOrderNotificationEvent)
            .subscribe(event => this.handleEvent(event));
    }

    private handleEvent(event: DigitalOrderNotificationEvent): void {
        if (!event.success) {
            Logger.error(
                `[DELIVERY FAILURE] Order ${event.orderCode} (id=${event.orderId}) ` +
                    `\u2014 delivery FAILED for customer <${event.customerEmail}>.\n` +
                    `Reason: ${event.errorMessage ?? 'unknown'}`,
                loggerCtx,
            );
            return;
        }

        const summary = event.items
            .map(item => {
                const parts: string[] = [`  \u2022 "${item.digitalProductName}" [${item.deliveryType}]`];
                if (item.keys.length) parts.push(`    keys: ${item.keys.join(', ')}`);
                if (item.downloadUrls.length)
                    parts.push(`    downloads: ${item.downloadUrls.join(', ')}`);
                if (item.serviceSessionUrl)
                    parts.push(`    service URL: ${item.serviceSessionUrl}`);
                return parts.join('\n');
            })
            .join('\n');

        Logger.info(
            `[DELIVERY OK] Order ${event.orderCode} fulfilled for <${event.customerEmail}>:\n${summary}\n` +
                `(Wire @vendure/email-plugin with DigitalOrderNotificationEvent to send a real email)`,
            loggerCtx,
        );
    }

    onModuleDestroy() {
        this.sub?.unsubscribe();
    }
}
