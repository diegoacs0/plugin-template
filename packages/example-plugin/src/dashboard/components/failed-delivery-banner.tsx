/**
 * FailedDeliveryBanner
 *
 * Shows a red warning banner when there are digital orders with status=failed.
 * Intended to be included in dashboard overview pages or the digital-product-list.
 */

import React from 'react';
import { api } from '../lib/api';
import { GET_FAILED_DIGITAL_ORDERS } from '../lib/queries';

interface FailedOrder {
    id: string;
    createdAt: string;
    orderId: string;
    failureReason?: string | null;
}

export function FailedDeliveryBanner() {
    const [failedOrders, setFailedOrders] = React.useState<FailedOrder[]>([]);
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        api.query(GET_FAILED_DIGITAL_ORDERS, {}).then(result => {
            const orders = (result as any).failedDigitalOrders as FailedOrder[] | undefined;
            if (!cancelled && orders && orders.length > 0) {
                setFailedOrders(orders);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (failedOrders.length === 0) return null;

    return (
        <div className="mb-4 rounded-md border border-red-400 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950">
            <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <strong className="text-red-800 dark:text-red-300">
                    {failedOrders.length} digital order{failedOrders.length > 1 ? 's' : ''} failed
                    to deliver.
                </strong>
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="ml-auto rounded border border-red-400 px-2 py-0.5 text-xs text-red-800 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900"
                >
                    {expanded ? 'Hide' : 'Show details'}
                </button>
            </div>

            {expanded && (
                <ul className="mt-3 space-y-2 pl-5 text-sm text-red-900 dark:text-red-200">
                    {failedOrders.map(order => (
                        <li key={order.id}>
                            <span className="font-medium">Order ID {order.orderId}</span>{' '}
                            <span className="text-red-700 dark:text-red-400">
                                ({new Date(order.createdAt).toLocaleString()})
                            </span>
                            {order.failureReason && (
                                <pre className="mt-1 whitespace-pre-wrap rounded bg-red-100 p-2 text-xs dark:bg-red-900">
                                    {order.failureReason}
                                </pre>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
