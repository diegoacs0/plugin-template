import { RequestContext, VendureEvent } from '@vendure/core';
import { ID } from '@vendure/common/lib/shared-types';

export interface DigitalDeliveryItem {
    digitalProductId: ID;
    digitalProductName: string;
    deliveryType: 'file' | 'key' | 'service';
    /** Assigned license key codes (for KEY delivery) */
    keys: string[];
    /** Direct download URLs (for FILE delivery) */
    downloadUrls: string[];
    /** Service / chat session URL (for SERVICE delivery) */
    serviceSessionUrl: string | null;
}

/**
 * Emitted after a digital order is processed.
 * Consumed by the email handler to send delivery notification to the customer.
 */
export class DigitalOrderNotificationEvent extends VendureEvent {
    constructor(
        public readonly ctx: RequestContext,
        /** The Vendure Order ID */
        public readonly orderId: ID,
        /** Human-readable order code (e.g. T0001-ABCD) */
        public readonly orderCode: string,
        /** Customer email address */
        public readonly customerEmail: string,
        /** Customer's display name or email if name is unavailable */
        public readonly customerName: string,
        /** All digital items delivered in this order */
        public readonly items: DigitalDeliveryItem[],
        /** Whether the overall delivery succeeded */
        public readonly success: boolean,
        /** Error message if success is false */
        public readonly errorMessage?: string,
    ) {
        super();
    }
}
