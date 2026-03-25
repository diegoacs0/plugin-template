import { Button } from '@vendure/dashboard';
import { DownloadIcon } from 'lucide-react';

const DASHBOARD_BASE = '/dashboard';

/**
 * Action bar button that shows on the product-variant-detail page.
 * Allows quick navigation to create a new digital product for this variant.
 */
export function VariantDigitalActionButton({ context }: { context: any }) {
    const isDigital = context?.entity?.customFields?.isDigital;

    if (!isDigital) return null;

    return (
        <Button variant="outline" size="sm" asChild>
            <a href={`${DASHBOARD_BASE}/digital-products/new`}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Add Digital Product
            </a>
        </Button>
    );
}
