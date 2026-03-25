import { useState, useEffect, useCallback } from 'react';
import {
    Page,
    PageBlock,
    PageLayout,
    PageTitle,
    PageActionBar,
    PageActionBarRight,
    Button,
    Input,
    DetailFormGrid,
} from '@vendure/dashboard';
import type { AnyRoute } from '@tanstack/react-router';
import {
    SaveIcon,
    Trash2Icon,
    PlusIcon,
    ArrowLeftIcon,
    KeyIcon,
    FileIcon,
    MessageSquareIcon,
    CopyIcon,
    DownloadIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, getErrorMessage } from '../lib/api';
import { confirmAction, copyToClipboard, navigateTo, openInNewTab } from '../lib/browser';
import {
    GET_DIGITAL_PRODUCT,
    GET_PRODUCT_VARIANTS,
    CREATE_DIGITAL_PRODUCT,
    UPDATE_DIGITAL_PRODUCT,
    DELETE_DIGITAL_PRODUCT,
    ADD_DIGITAL_PRODUCT_KEYS,
    DELETE_DIGITAL_PRODUCT_KEYS,
    CREATE_DIGITAL_MEDIA,
    DELETE_DIGITAL_MEDIA,
} from '../lib/queries';

interface DigitalProductDetail {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    deliveryType: string;
    chatTemplate: string | null;
    instructionsTemplate: string | null;
    availableKeyCount: number;
    productVariant: { id: string; name: string; sku: string; product: { id: string; name: string } };
    keys: Array<{ id: string; createdAt: string; code: string; status: string }>;
    medias: Array<{
        id: string;
        createdAt: string;
        accessLevel: string;
        fileName: string;
        fileUrl: string;
        mimeType: string;
        fileSize: number | null;
        downloadCount: number;
    }>;
}

interface ProductVariantOption {
    id: string;
    name: string;
    sku: string;
    product: { id: string; name: string };
}

const DASHBOARD_BASE = '/dashboard';

function getDigitalProductsHref() {
    return `${DASHBOARD_BASE}/digital-products`;
}

function getDigitalProductHref(id: string) {
    return `${DASHBOARD_BASE}/digital-products/${id}`;
}

function getEventValue(event: { target: unknown }): string {
    return ((event.target as { value?: string } | null)?.value ?? '').toString();
}

/**
 * Route wrapper component — extracts the $id param from the Tanstack route
 * and passes it to the detail page. This is the component referenced in
 * defineDashboardExtension({ routes }).
 */
export function DigitalProductDetailRoute({ route }: { route: AnyRoute }) {
    const params = route.useParams() as { id: string };
    return <DigitalProductDetailPage id={params.id} />;
}

export function DigitalProductDetailPage({ id }: { id: string }) {
    const isNew = id === 'new';

    // Form state
    const [name, setName] = useState('');
    const [deliveryType, setDeliveryType] = useState('file');
    const [productVariantId, setProductVariantId] = useState('');
    const [chatTemplate, setChatTemplate] = useState('');
    const [instructionsTemplate, setInstructionsTemplate] = useState('');
    const [variantSearch, setVariantSearch] = useState('');
    const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
    const [variantsLoading, setVariantsLoading] = useState(false);

    // Entity state
    const [entity, setEntity] = useState<DigitalProductDetail | null>(null);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Key management
    const [newKeysText, setNewKeysText] = useState('');
    const [addingKeys, setAddingKeys] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    // Media management
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaFileName, setMediaFileName] = useState('');
    const [mediaMimeType, setMediaMimeType] = useState('application/octet-stream');
    const [mediaAccessLevel, setMediaAccessLevel] = useState('main');
    const [addingMedia, setAddingMedia] = useState(false);
    const [selectedMedias, setSelectedMedias] = useState<Set<string>>(new Set());

    const fetchProduct = useCallback(async () => {
        if (isNew) return;
        setLoading(true);
        try {
            const data = await api.query(
                GET_DIGITAL_PRODUCT, { id },
            );
            if (data.digitalProduct) {
                const p = data.digitalProduct;
                setEntity(p);
                setName(p.name);
                setDeliveryType(p.deliveryType);
                setProductVariantId(p.productVariant.id);
                setChatTemplate(p.chatTemplate || '');
                setInstructionsTemplate(p.instructionsTemplate || '');
            } else {
                toast.error('Digital product not found');
                navigateTo(getDigitalProductsHref());
            }
        } catch (err: any) {
            toast.error('Failed to load product', { description: getErrorMessage(err) });
        } finally {
            setLoading(false);
        }
    }, [id, isNew]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    const fetchVariants = useCallback(async () => {
        if (!isNew) return;
        setVariantsLoading(true);
        try {
            const data = await api.query(GET_PRODUCT_VARIANTS, {
                options: { take: 250, skip: 0 },
            });
            setVariantOptions(data.productVariants?.items ?? []);
        } catch (err: any) {
            toast.error('Failed to load product variants', { description: getErrorMessage(err) });
        } finally {
            setVariantsLoading(false);
        }
    }, [isNew]);

    useEffect(() => { fetchVariants(); }, [fetchVariants]);

    const filteredVariants = variantOptions.filter(variant => {
        const q = variantSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            variant.id.toLowerCase().includes(q) ||
            variant.name.toLowerCase().includes(q) ||
            variant.sku.toLowerCase().includes(q) ||
            variant.product.name.toLowerCase().includes(q)
        );
    });

    // ─── Save (create / update) ──────────────────────────────────────

    const handleSave = async () => {
        setActionError(null);
        if (!name.trim()) {
            const message = 'Name is required';
            setActionError(message);
            toast.error(message);
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                if (!productVariantId.trim()) {
                    const message = 'Product Variant ID is required';
                    setActionError(message);
                    toast.error(message);
                    setSaving(false);
                    return;
                }
                const data = await api.mutate(CREATE_DIGITAL_PRODUCT, {
                    input: {
                        name: name.trim(),
                        deliveryType,
                        productVariantId: productVariantId.trim(),
                        chatTemplate: chatTemplate || null,
                        instructionsTemplate: instructionsTemplate || null,
                    },
                }) as { createDigitalProduct: { id: string; name: string } };
                toast.success(`Created "${data.createDigitalProduct.name}"`);
                navigateTo(getDigitalProductHref(data.createDigitalProduct.id));
            } else {
                await api.mutate(UPDATE_DIGITAL_PRODUCT, {
                    input: {
                        id,
                        name: name.trim(),
                        deliveryType,
                        chatTemplate: chatTemplate || null,
                        instructionsTemplate: instructionsTemplate || null,
                    },
                });
                toast.success('Updated successfully');
                fetchProduct();
            }
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Save failed', { description: message });
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete product ──────────────────────────────────────────────

    const handleDelete = async () => {
        setActionError(null);
        if (!entity) return;
        if (!confirmAction(`Delete "${entity.name}"? This will also delete all associated keys and media.`)) return;
        try {
            const data = await api.mutate(DELETE_DIGITAL_PRODUCT, { id });
            if (data.deleteDigitalProduct.result === 'DELETED') {
                toast.success('Deleted');
                navigateTo(getDigitalProductsHref());
            } else {
                toast.error('Delete failed', { description: data.deleteDigitalProduct.message });
            }
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Delete failed', { description: message });
        }
    };

    // ─── Key management ──────────────────────────────────────────────

    const handleAddKeys = async () => {
        setActionError(null);
        const keys = newKeysText
            .split(/[\n,;]+/)
            .map(k => k.trim())
            .filter(Boolean);
        if (!keys.length) {
            const message = 'Enter at least one key';
            setActionError(message);
            toast.error(message);
            return;
        }
        setAddingKeys(true);
        try {
            const data = await api.mutate(ADD_DIGITAL_PRODUCT_KEYS, {
                input: { digitalProductId: id, keys },
            });
            toast.success(`Added ${data.addDigitalProductKeys.length} key(s)`);
            setNewKeysText('');
            fetchProduct();
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Failed to add keys', { description: message });
        } finally {
            setAddingKeys(false);
        }
    };

    const handleDeleteSelectedKeys = async () => {
        setActionError(null);
        if (selectedKeys.size === 0) return;
        if (!confirmAction(`Delete ${selectedKeys.size} key(s)? Only available (unassigned) keys will be deleted.`)) return;
        try {
            await api.mutate(DELETE_DIGITAL_PRODUCT_KEYS, { ids: Array.from(selectedKeys) });
            toast.success(`Deleted ${selectedKeys.size} key(s)`);
            setSelectedKeys(new Set());
            fetchProduct();
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Delete failed', { description: message });
        }
    };

    // ─── Media management ────────────────────────────────────────────

    const handleAddMedia = async () => {
        setActionError(null);
        if (!mediaUrl.trim() || !mediaFileName.trim()) {
            const message = 'URL and filename are required';
            setActionError(message);
            toast.error(message);
            return;
        }
        setAddingMedia(true);
        try {
            await api.mutate(CREATE_DIGITAL_MEDIA, {
                input: {
                    digitalProductId: id,
                    accessLevel: mediaAccessLevel,
                    fileUrl: mediaUrl.trim(),
                    fileName: mediaFileName.trim(),
                    mimeType: mediaMimeType.trim(),
                },
            });
            toast.success('Media added');
            setMediaUrl('');
            setMediaFileName('');
            fetchProduct();
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Failed to add media', { description: message });
        } finally {
            setAddingMedia(false);
        }
    };

    const handleDeleteSelectedMedias = async () => {
        setActionError(null);
        if (selectedMedias.size === 0) return;
        if (!confirmAction(`Delete ${selectedMedias.size} media file(s)?`)) return;
        try {
            await api.mutate(DELETE_DIGITAL_MEDIA, { ids: Array.from(selectedMedias) });
            toast.success(`Deleted ${selectedMedias.size} media file(s)`);
            setSelectedMedias(new Set());
            fetchProduct();
        } catch (err: any) {
            const message = getErrorMessage(err);
            setActionError(message);
            toast.error('Delete failed', { description: message });
        }
    };

    // ─── Render ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <Page pageId="digital-product-detail">
                <PageTitle>Loading…</PageTitle>
                <PageLayout>
                    <PageBlock column="main" blockId="loading">
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            Loading digital product…
                        </div>
                    </PageBlock>
                </PageLayout>
            </Page>
        );
    }

    return (
        <Page pageId="digital-product-detail">
            <PageTitle>{isNew ? 'New Digital Product' : entity?.name ?? ''}</PageTitle>
            <PageActionBar>
                <Button variant="ghost" size="sm" asChild>
                    <a href={getDigitalProductsHref()}>
                        <ArrowLeftIcon className="mr-2 h-4 w-4" />
                        Back
                    </a>
                </Button>
                <PageActionBarRight>
                    {!isNew && entity && (
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving}>
                        <SaveIcon className="mr-2 h-4 w-4" />
                        {isNew ? 'Create' : 'Save Changes'}
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                {/* ── Main form ──────────────────────────────────────── */}
                <PageBlock column="main" blockId="product-form">
                    <h3 className="text-lg font-semibold mb-4">
                        {isNew ? 'Create Digital Product' : 'Edit Digital Product'}
                    </h3>

                    {actionError && (
                        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                            {actionError}
                        </div>
                    )}

                    <DetailFormGrid>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                value={name}
                                onChange={e => setName(getEventValue(e))}
                                placeholder="e.g. Premium License Key"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Delivery Type *</label>
                            <select
                                value={deliveryType}
                                onChange={e => setDeliveryType(getEventValue(e))}
                                title="Delivery Type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="file">📁 File — Downloadable content</option>
                                <option value="key">🔑 Key — License keys</option>
                                <option value="service">💬 Service — Chat/support session</option>
                            </select>
                        </div>
                    </DetailFormGrid>

                    {isNew && (
                        <div className="mt-4 space-y-1">
                            <label className="text-sm font-medium">Product Variant *</label>
                            <Input
                                value={variantSearch}
                                onChange={e => setVariantSearch(getEventValue(e))}
                                placeholder="Search by product, variant, SKU or ID"
                            />
                            <select
                                value={productVariantId}
                                onChange={e => setProductVariantId(getEventValue(e))}
                                title="Product Variant"
                                disabled={variantsLoading}
                                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">
                                    {variantsLoading ? 'Loading variants…' : 'Select a product variant'}
                                </option>
                                {filteredVariants.map(variant => (
                                    <option key={variant.id} value={variant.id}>
                                        {variant.product.name} — {variant.name}
                                        {variant.sku ? ` (SKU: ${variant.sku})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Choose the variant this digital product will be linked to.
                            </p>
                        </div>
                    )}

                    {(deliveryType === 'service') && (
                        <div className="mt-4 space-y-1">
                            <label className="text-sm font-medium">Chat Template</label>
                            <textarea
                                value={chatTemplate}
                                onChange={e => setChatTemplate(getEventValue(e))}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="HTML template for chat sessions. Use {{order_id}}, {{email}}, {{product_name}}"
                            />
                        </div>
                    )}

                    <div className="mt-4 space-y-1">
                        <label className="text-sm font-medium">Instructions Template</label>
                        <textarea
                            value={instructionsTemplate}
                            onChange={e => setInstructionsTemplate(getEventValue(e))}
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="HTML shown to customer after purchase. Use {{order_id}}, {{email}}"
                        />
                    </div>
                </PageBlock>

                {/* ── License Keys (only for key type) ──────────────── */}
                {!isNew && deliveryType === 'key' && (
                    <PageBlock column="main" blockId="license-keys">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <KeyIcon className="h-5 w-5" />
                                License Keys
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({entity?.availableKeyCount ?? 0} available / {entity?.keys.length ?? 0} total)
                                </span>
                            </h3>
                            {selectedKeys.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteSelectedKeys}
                                >
                                    <Trash2Icon className="mr-1 h-3 w-3" />
                                    Delete {selectedKeys.size}
                                </Button>
                            )}
                        </div>

                        {/* Add keys form */}
                        <div className="rounded-lg border p-3 mb-4 space-y-2">
                            <label className="text-sm font-medium">Add Keys</label>
                            <textarea
                                value={newKeysText}
                                onChange={e => setNewKeysText(getEventValue(e))}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                                placeholder="Enter keys, one per line (or comma/semicolon separated)"
                            />
                            <Button size="sm" onClick={handleAddKeys} disabled={addingKeys || !newKeysText.trim()}>
                                <PlusIcon className="mr-1 h-3 w-3" />
                                {addingKeys ? 'Adding…' : 'Add Keys'}
                            </Button>
                        </div>

                        {/* Keys table */}
                        {entity && entity.keys.length > 0 && (
                            <div className="rounded-md border max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-8 px-2 py-1.5">
                                                <input
                                                    type="checkbox"
                                                    title="Select all keys"
                                                    checked={selectedKeys.size === entity.keys.length}
                                                    onChange={() => {
                                                        setSelectedKeys(
                                                            selectedKeys.size === entity.keys.length
                                                                ? new Set()
                                                                : new Set(entity.keys.map(k => k.id)),
                                                        );
                                                    }}
                                                />
                                            </th>
                                            <th className="px-3 py-1.5 text-left font-medium">Code</th>
                                            <th className="px-3 py-1.5 text-left font-medium">Status</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entity.keys.map(k => (
                                            <tr key={k.id} className="border-b hover:bg-muted/25">
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="checkbox"
                                                        title="Select key"
                                                        checked={selectedKeys.has(k.id)}
                                                        onChange={() => {
                                                            setSelectedKeys(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(k.id)) {
                                                                    next.delete(k.id);
                                                                } else {
                                                                    next.add(k.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5 font-mono text-xs">{k.code}</td>
                                                <td className="px-3 py-1.5">
                                                    <KeyStatusBadge status={k.status} />
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            const copied = await copyToClipboard(k.code);
                                                            if (copied) {
                                                                toast.info('Copied to clipboard');
                                                            } else {
                                                                toast.error('Clipboard is not available');
                                                            }
                                                        }}
                                                    >
                                                        <CopyIcon className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </PageBlock>
                )}

                {/* ── Media Files (for file type) ───────────────────── */}
                {!isNew && (deliveryType === 'file' || deliveryType === 'service') && (
                    <PageBlock column="main" blockId="media-files">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileIcon className="h-5 w-5" />
                                Media Files
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({entity?.medias.length ?? 0} file(s))
                                </span>
                            </h3>
                            {selectedMedias.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteSelectedMedias}
                                >
                                    <Trash2Icon className="mr-1 h-3 w-3" />
                                    Delete {selectedMedias.size}
                                </Button>
                            )}
                        </div>

                        {/* Add media form */}
                        <div className="rounded-lg border p-3 mb-4 space-y-2">
                            <label className="text-sm font-medium">Add Media</label>
                            <DetailFormGrid>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">File URL *</label>
                                    <Input
                                        value={mediaUrl}
                                        onChange={e => setMediaUrl(getEventValue(e))}
                                        placeholder="https://example.com/file.pdf"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">File Name *</label>
                                    <Input
                                        value={mediaFileName}
                                        onChange={e => setMediaFileName(getEventValue(e))}
                                        placeholder="guide.pdf"
                                    />
                                </div>
                            </DetailFormGrid>
                            <DetailFormGrid>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">MIME Type</label>
                                    <Input
                                        value={mediaMimeType}
                                        onChange={e => setMediaMimeType(getEventValue(e))}
                                        placeholder="application/pdf"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Access Level</label>
                                    <select
                                        value={mediaAccessLevel}
                                        onChange={e => setMediaAccessLevel(getEventValue(e))}
                                        title="Access Level"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="main">Main (private, post-purchase)</option>
                                        <option value="preview">Preview (public)</option>
                                    </select>
                                </div>
                            </DetailFormGrid>
                            <Button
                                size="sm"
                                onClick={handleAddMedia}
                                disabled={addingMedia || !mediaUrl.trim() || !mediaFileName.trim()}
                            >
                                <PlusIcon className="mr-1 h-3 w-3" />
                                {addingMedia ? 'Adding…' : 'Add Media'}
                            </Button>
                        </div>

                        {/* Media table */}
                        {entity && entity.medias.length > 0 && (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-8 px-2 py-1.5">
                                                <input
                                                    type="checkbox"
                                                    title="Select all media"
                                                    checked={selectedMedias.size === entity.medias.length}
                                                    onChange={() => {
                                                        setSelectedMedias(
                                                            selectedMedias.size === entity.medias.length
                                                                ? new Set()
                                                                : new Set(entity.medias.map(m => m.id)),
                                                        );
                                                    }}
                                                />
                                            </th>
                                            <th className="px-3 py-1.5 text-left font-medium">File</th>
                                            <th className="px-3 py-1.5 text-left font-medium">Access</th>
                                            <th className="px-3 py-1.5 text-left font-medium">Type</th>
                                            <th className="px-3 py-1.5 text-left font-medium">Downloads</th>
                                            <th className="px-3 py-1.5 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entity.medias.map(m => (
                                            <tr key={m.id} className="border-b hover:bg-muted/25">
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="checkbox"
                                                        title="Select media"
                                                        checked={selectedMedias.has(m.id)}
                                                        onChange={() => {
                                                            setSelectedMedias(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(m.id)) {
                                                                    next.delete(m.id);
                                                                } else {
                                                                    next.add(m.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className="font-medium">{m.fileName}</span>
                                                    {m.fileSize && (
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            ({(m.fileSize / 1024).toFixed(1)} KB)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                        m.accessLevel === 'preview'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                    }`}>
                                                        {m.accessLevel === 'preview' ? '🌐 Preview' : '🔒 Main'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-xs text-muted-foreground">{m.mimeType}</td>
                                                <td className="px-3 py-1.5 font-mono text-xs">{m.downloadCount}</td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openInNewTab(m.fileUrl)}
                                                    >
                                                        <DownloadIcon className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </PageBlock>
                )}

                {/* ── Sidebar ───────────────────────────────────────── */}
                <PageBlock column="side" blockId="product-info">
                    {!isNew && entity && (
                        <div className="space-y-4">
                            <div className="rounded-lg border p-4">
                                <h3 className="font-medium mb-2">Product Info</h3>
                                <dl className="space-y-2 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">Variant</dt>
                                        <dd className="font-medium">{entity.productVariant.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">SKU</dt>
                                        <dd className="font-mono text-xs">{entity.productVariant.sku || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Product</dt>
                                        <dd>{entity.productVariant.product.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Created</dt>
                                        <dd className="text-xs">{new Date(entity.createdAt).toLocaleDateString()}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Updated</dt>
                                        <dd className="text-xs">{new Date(entity.updatedAt).toLocaleDateString()}</dd>
                                    </div>
                                </dl>
                            </div>

                            {deliveryType === 'key' && (
                                <div className="rounded-lg border p-4">
                                    <h3 className="font-medium mb-2">Key Stats</h3>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-2">
                                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                                                {entity.availableKeyCount}
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-400">Available</div>
                                        </div>
                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2">
                                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                {entity.keys.filter(k => k.status === 'assigned').length}
                                            </div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400">Assigned</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-lg border p-4">
                                <h3 className="font-medium mb-2">Delivery Type</h3>
                                <DeliveryTypeBadge type={deliveryType} />
                            </div>
                        </div>
                    )}

                    {isNew && (
                        <div className="rounded-lg border p-4">
                            <h3 className="font-medium mb-2">Getting Started</h3>
                            <ol className="text-sm text-muted-foreground space-y-2 list-inside list-decimal">
                                <li>Fill in the name and delivery type</li>
                                <li>Paste the Product Variant ID</li>
                                <li>Click "Create" to save</li>
                                <li>Then add keys or media files</li>
                            </ol>
                        </div>
                    )}
                </PageBlock>
            </PageLayout>
        </Page>
    );
}

// ─── Helper components ───────────────────────────────────────────────────────

function KeyStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        available: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        revoked: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    );
}

function DeliveryTypeBadge({ type }: { type: string }) {
    const config: Record<string, { icon: typeof FileIcon; label: string; desc: string }> = {
        file: { icon: FileIcon, label: 'File', desc: 'Downloadable content delivered after purchase' },
        key: { icon: KeyIcon, label: 'License Key', desc: 'Auto-assigned keys from your inventory' },
        service: { icon: MessageSquareIcon, label: 'Service', desc: 'Chat/support session access' },
    };
    const c = config[type] || config.file;
    const Icon = c.icon;
    return (
        <div className="flex items-start gap-2">
            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
            </div>
        </div>
    );
}
