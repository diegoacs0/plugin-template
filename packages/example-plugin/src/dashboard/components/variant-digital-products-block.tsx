import { useState, useEffect, useCallback } from 'react';
import { Button } from '@vendure/dashboard';
import {
    PlusIcon,
    FileIcon,
    KeyIcon,
    MessageSquareIcon,
    Trash2Icon,
    ExternalLinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, getErrorMessage } from '../lib/api';
import { confirmAction } from '../lib/browser';
import {
    GET_DIGITAL_PRODUCTS_BY_VARIANT,
    DELETE_DIGITAL_PRODUCT,
} from '../lib/queries';

interface LinkedDigitalProduct {
    id: string;
    name: string;
    deliveryType: string;
    availableKeyCount: number;
    medias: { id: string }[];
}

const TYPE_ICONS: Record<string, typeof FileIcon> = {
    file: FileIcon,
    key: KeyIcon,
    service: MessageSquareIcon,
};

const DASHBOARD_BASE = '/dashboard';

function getDigitalProductHref(id: string) {
    return `${DASHBOARD_BASE}/digital-products/${id}`;
}

/**
 * PageBlock component to show on the `product-variant-detail` page.
 * Shows digital products linked to the variant, allows navigating to
 * the digital product detail, creating new ones, and deleting.
 */
export function VariantDigitalProductsBlock({ context }: { context: any }) {
    const [products, setProducts] = useState<LinkedDigitalProduct[]>([]);
    const [loading, setLoading] = useState(true);

    // The entity is the ProductVariant — get its ID
    const variantId = context?.entity?.id;

    const fetchProducts = useCallback(async () => {
        if (!variantId) return;
        setLoading(true);
        try {
            const data = await api.query(GET_DIGITAL_PRODUCTS_BY_VARIANT, { productVariantId: variantId });
            setProducts(data.digitalProductsByVariant ?? []);
        } catch (_e) {
            // Silent fail — variant may not have any digital products
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [variantId]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleDelete = async (dp: LinkedDigitalProduct) => {
        if (!confirmAction(`Delete digital product "${dp.name}"?`)) return;
        try {
            await api.mutate(DELETE_DIGITAL_PRODUCT, { id: dp.id });
            toast.success(`Deleted "${dp.name}"`);
            fetchProducts();
        } catch (err: any) {
            toast.error('Delete failed', { description: getErrorMessage(err) });
        }
    };

    if (loading) {
        return (
            <div className="text-sm text-muted-foreground py-2">
                Loading digital products…
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {products.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                    No digital products linked to this variant.
                </div>
            ) : (
                <div className="space-y-2">
                    {products.map(dp => {
                        const Icon = TYPE_ICONS[dp.deliveryType] || FileIcon;
                        return (
                            <div
                                key={dp.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <a
                                            href={getDigitalProductHref(dp.id)}
                                            className="font-medium text-sm text-primary hover:underline"
                                        >
                                            {dp.name}
                                        </a>
                                        <div className="text-xs text-muted-foreground">
                                            {dp.deliveryType === 'key'
                                                ? `${dp.availableKeyCount} key(s) available`
                                                : dp.deliveryType === 'file'
                                                    ? `${dp.medias.length} media file(s)`
                                                    : 'Service session'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" asChild>
                                        <a
                                            href={getDigitalProductHref(dp.id)}
                                            title={`Open ${dp.name}`}
                                            aria-label={`Open ${dp.name}`}
                                        >
                                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(dp)}
                                    >
                                        <Trash2Icon className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Button variant="outline" size="sm" asChild>
                <a href={`${DASHBOARD_BASE}/digital-products/new`}>
                    <PlusIcon className="mr-1 h-3.5 w-3.5" />
                    Add Digital Product
                </a>
            </Button>
        </div>
    );
}
