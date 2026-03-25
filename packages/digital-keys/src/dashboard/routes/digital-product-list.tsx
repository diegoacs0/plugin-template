import { useState, useEffect, useCallback } from 'react';
import {
    Page,
    PageBlock,
    PageLayout,
    PageTitle,
    PageActionBar,
    PageActionBarRight,
    Button,
} from '@vendure/dashboard';
import { PlusIcon, Trash2Icon, RefreshCwIcon, FileIcon, KeyIcon, MessageSquareIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, getErrorMessage } from '../lib/api';
import { confirmAction } from '../lib/browser';
import { GET_DIGITAL_PRODUCTS, DELETE_DIGITAL_PRODUCT } from '../lib/queries';
import { FailedDeliveryBanner } from '../components/failed-delivery-banner';

interface DigitalProductRow {
    id: string;
    createdAt: string;
    name: string;
    deliveryType: string;
    availableKeyCount: number;
    productVariant: { id: string; name: string; sku: string };
    medias: { id: string }[];
}

const DELIVERY_ICONS: Record<string, typeof FileIcon> = {
    file: FileIcon,
    key: KeyIcon,
    service: MessageSquareIcon,
};

const DELIVERY_LABELS: Record<string, string> = {
    file: 'File',
    key: 'Key',
    service: 'Service',
};

const DASHBOARD_BASE = '/dashboard';

function getDigitalProductHref(id: string) {
    return `${DASHBOARD_BASE}/digital-products/${id}`;
}

export function DigitalProductListPage() {
    const [items, setItems] = useState<DigitalProductRow[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const pageSize = 25;

    const fetchData = useCallback(async () => {
        setActionError(null);
        setLoading(true);
        try {
            const data = await api.query(GET_DIGITAL_PRODUCTS, {
                options: { skip: page * pageSize, take: pageSize },
            });
            setItems(data.digitalProducts?.items ?? []);
            setTotalItems(data.digitalProducts?.totalItems ?? 0);
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Failed to load digital products', { description: message });
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string, name: string) => {
        setActionError(null);
        if (!confirmAction(`Delete digital product "${name}"? This also deletes its keys and media.`)) return;
        try {
            const data = await api.mutate(DELETE_DIGITAL_PRODUCT, { id });
            if (data.deleteDigitalProduct.result === 'DELETED') {
                toast.success(`Deleted "${name}"`);
                fetchData();
            } else {
                const message = data.deleteDigitalProduct.message || 'Unknown error';
                setActionError(message);
                toast.error('Failed to delete', { description: message });
            }
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Delete failed', { description: message });
        }
    };

    const handleBulkDelete = async () => {
        setActionError(null);
        if (selected.size === 0) return;
        if (!confirmAction(`Delete ${selected.size} digital product(s)?`)) return;

        const failures: string[] = [];
        for (const id of selected) {
            try {
                await api.mutate(DELETE_DIGITAL_PRODUCT, { id });
            } catch (e) {
                failures.push(`${id}: ${getErrorMessage(e)}`);
            }
        }

        if (failures.length > 0) {
            const message = `Failed to delete ${failures.length} item(s).`;
            setActionError(message);
            toast.error('Bulk delete completed with errors', { description: message });
        } else {
            toast.success(`Deleted ${selected.size} product(s)`);
        }

        setSelected(new Set());
        fetchData();
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === items.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(items.map(i => i.id)));
        }
    };

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <Page pageId="digital-products-list">
            <PageTitle>Digital Products</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    {selected.size > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Delete {selected.size} selected
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCwIcon className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button asChild>
                        <a href={`${DASHBOARD_BASE}/digital-products/new`}>
                            <PlusIcon className="mr-2 h-4 w-4" />
                            New Digital Product
                        </a>
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <PageBlock column="main" blockId="digital-products-table">
                    <FailedDeliveryBanner />

                    {actionError && (
                        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                            {actionError}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            Loading…
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center">
                            <p className="text-muted-foreground mb-4">
                                No digital products yet. Create one to get started.
                            </p>
                            <Button asChild variant="outline">
                                <a href={`${DASHBOARD_BASE}/digital-products/new`}>
                                    <PlusIcon className="mr-2 h-4 w-4" />
                                    Create Digital Product
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-10 px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    title="Select all"
                                                    checked={selected.size === items.length && items.length > 0}
                                                    onChange={toggleAll}
                                                    className="rounded"
                                                />
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium">Name</th>
                                            <th className="px-4 py-2 text-left font-medium">Type</th>
                                            <th className="px-4 py-2 text-left font-medium">Variant</th>
                                            <th className="px-4 py-2 text-left font-medium">Keys</th>
                                            <th className="px-4 py-2 text-left font-medium">Media</th>
                                            <th className="px-4 py-2 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => {
                                            const Icon = DELIVERY_ICONS[item.deliveryType] || FileIcon;
                                            return (
                                                <tr key={item.id} className="border-b hover:bg-muted/25">
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            title="Select row"
                                                            checked={selected.has(item.id)}
                                                            onChange={() => toggleSelect(item.id)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <a
                                                            href={getDigitalProductHref(item.id)}
                                                            className="font-medium text-primary hover:underline"
                                                        >
                                                            {item.name}
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                                                            <Icon className="h-3 w-3" />
                                                            {DELIVERY_LABELS[item.deliveryType] || item.deliveryType}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-muted-foreground">
                                                        {item.productVariant.name}
                                                        {item.productVariant.sku && (
                                                            <span className="ml-1 text-xs opacity-60">
                                                                ({item.productVariant.sku})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-xs">
                                                        {item.deliveryType === 'key'
                                                            ? `${item.availableKeyCount} avail.`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-xs">
                                                        {item.medias.length}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <a href={getDigitalProductHref(item.id)}>
                                                                    Edit
                                                                </a>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(item.id, item.name)}
                                                            >
                                                                <Trash2Icon className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 0}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages - 1}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </PageBlock>

                <PageBlock column="side" blockId="digital-products-sidebar">
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4">
                            <h3 className="font-medium mb-2">Summary</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <p>Total: <strong className="text-foreground">{totalItems}</strong> digital product(s)</p>
                            </div>
                        </div>
                        <div className="rounded-lg border p-4">
                            <h3 className="font-medium mb-2">Delivery Types</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2"><FileIcon className="h-4 w-4" /> <strong>File</strong> — Downloadable content</li>
                                <li className="flex items-center gap-2"><KeyIcon className="h-4 w-4" /> <strong>Key</strong> — License keys auto-assigned</li>
                                <li className="flex items-center gap-2"><MessageSquareIcon className="h-4 w-4" /> <strong>Service</strong> — Chat/support sessions</li>
                            </ul>
                        </div>
                    </div>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}
