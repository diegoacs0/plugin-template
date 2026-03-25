"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalShippingEligibilityChecker = void 0;
const core_1 = require("@vendure/core");
/**
 * Shipping eligibility checker that makes a shipping method available
 * only when the order contains at least one digital product variant.
 *
 * This should be assigned to a ShippingMethod that is marked as
 * "digital fulfilment only" via the `digitalFulfilmentOnly` custom field.
 */
exports.digitalShippingEligibilityChecker = new core_1.ShippingEligibilityChecker({
    code: 'digital-shipping-eligibility-checker',
    description: [
        {
            languageCode: core_1.LanguageCode.en,
            value: 'Allows only orders that contain at least 1 digital product',
        },
    ],
    args: {},
    check: (ctx, order, args) => {
        const digitalOrderLines = order.lines.filter((l) => l.productVariant?.customFields?.isDigital);
        return digitalOrderLines.length > 0;
    },
});
