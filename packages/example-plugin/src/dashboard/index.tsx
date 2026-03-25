import { defineDashboardExtension } from '@vendure/dashboard';
import { Download } from 'lucide-react';
import { DigitalProductListPage } from './routes/digital-product-list';
import { DigitalProductDetailRoute } from './routes/digital-product-detail';
import { VariantDigitalProductsBlock } from './components/variant-digital-products-block';
import { VariantDigitalActionButton } from './components/variant-digital-action-button';

defineDashboardExtension({
    // ── Custom routes ────────────────────────────────────────────────
    routes: [
        {
            path: '/digital-products',
            loader: () => ({ breadcrumb: 'Digital Products' }),
            navMenuItem: {
                id: 'digital-products',
                title: 'Digital Products',
                sectionId: 'catalog',
                icon: Download,
            },
            component: () => <DigitalProductListPage />,
        },
        {
            path: '/digital-products/$id',
            loader: () => ({
                breadcrumb: [
                    { path: '/digital-products', label: 'Digital Products' },
                    'Detail',
                ],
            }),
            component: (route) => <DigitalProductDetailRoute route={route} />,
        },
    ],

    // ── Page blocks on existing pages ────────────────────────────────
    pageBlocks: [
        {
            id: 'variant-digital-products',
            title: 'Digital Products',
            location: {
                pageId: 'product-variant-detail',
                column: 'side',
                position: {
                    blockId: 'facet-values',
                    order: 'after',
                },
            },
            component: VariantDigitalProductsBlock,
        },
    ],

    // ── Action bar items on existing pages ───────────────────────────
    actionBarItems: [
        {
            pageId: 'product-variant-detail',
            component: VariantDigitalActionButton,
        },
    ],
});
