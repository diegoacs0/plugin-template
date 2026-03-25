// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * The type of digital delivery for a product variant.
 */
export enum DeliveryType {
    /** Downloadable file (PDF, ZIP, etc.) */
    FILE = 'file',
    /** License key / serial code */
    KEY = 'key',
    /** Service / live-chat session */
    SERVICE = 'service',
}

/**
 * Status of a license key.
 */
export enum KeyStatus {
    AVAILABLE = 'available',
    ASSIGNED = 'assigned',
    REVOKED = 'revoked',
}

/**
 * Access level for media files.
 */
export enum MediaAccessLevel {
    /** Private — only accessible after purchase (download) */
    MAIN = 'main',
    /** Public — preview media accessible before purchase */
    PREVIEW = 'preview',
}

/**
 * Status of a digital product order.
 */
export enum DigitalOrderStatus {
    PENDING = 'pending',
    FULFILLED = 'fulfilled',
    FAILED = 'failed',
}

// ─── Plugin Options ──────────────────────────────────────────────────────────

/**
 * Chat provider type for service delivery.
 */
export type ChatProviderType = 'url-template' | 'crisp' | 'custom';

export interface ChatProviderConfig {
    /** The active chat provider type */
    provider: ChatProviderType;
    /** URL template with placeholders: {{order_id}}, {{email}}, {{product_id}}, {{product_name}} */
    urlTemplate?: string;
    /** Crisp chat embed URL */
    crispWebsiteUrl?: string;
    /** Custom provider factory function */
    customProvider?: (input: ChatSessionInput) => string;
}

export interface ChatSessionInput {
    orderId: string;
    productId: string;
    productName: string;
    customerEmail: string;
}

export interface DigitalProductsPluginOptions {
    /**
     * Whether the plugin is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * Chat provider configuration for service delivery.
     */
    chatProvider?: ChatProviderConfig;

    /**
     * Template name used for digital order email notifications.
     * @default 'digital-order-notification'
     */
    notificationTemplate?: string;

    /**
     * Whether to auto-fulfill digital products upon payment settlement.
     * @default true
     */
    autoFulfill?: boolean;

    /**
     * Maximum number of download attempts per media file.
     * Set to 0 for unlimited.
     * @default 0
     */
    maxDownloadAttempts?: number;
}

// ─── Input/Output Types ──────────────────────────────────────────────────────

export interface CreateDigitalProductInput {
    name: string;
    deliveryType: DeliveryType;
    productVariantId: string;
    chatTemplate?: string;
    instructionsTemplate?: string;
}

export interface UpdateDigitalProductInput {
    id: string;
    name?: string;
    deliveryType?: DeliveryType;
    chatTemplate?: string;
    instructionsTemplate?: string;
}

export interface AddDigitalProductKeysInput {
    digitalProductId: string;
    keys: string[];
}

export interface CreateDigitalMediaInput {
    digitalProductId: string;
    accessLevel: MediaAccessLevel;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize?: number;
}

export interface DigitalDeliveryItem {
    index: number;
    key: string | null;
    downloadUrls: string[];
    serviceSessionUrl: string | null;
    productId: string;
    productName: string;
}
