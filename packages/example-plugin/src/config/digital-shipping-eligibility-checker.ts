import { LanguageCode, ShippingEligibilityChecker } from '@vendure/core';

/**
 * Shipping eligibility checker that makes a shipping method available
 * only when the order contains at least one digital product variant.
 *
 * This should be assigned to a ShippingMethod that is marked as
 * "digital fulfilment only" via the `digitalFulfilmentOnly` custom field.
 */
export const digitalShippingEligibilityChecker = new ShippingEligibilityChecker({
    code: 'digital-shipping-eligibility-checker',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Allows only orders that contain at least 1 digital product',
        },
    ],
    args: {},
    check: (ctx, order, args) => {
        const digitalOrderLines = order.lines.filter(
            (l: any) => l.productVariant?.customFields?.isDigital,
        );
        return digitalOrderLines.length > 0;
    },
});
