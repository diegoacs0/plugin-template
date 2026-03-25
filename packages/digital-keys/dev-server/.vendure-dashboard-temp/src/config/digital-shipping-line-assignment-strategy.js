"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalShippingLineAssignmentStrategy = void 0;
/**
 * Ensures that digital product lines are assigned to the "digital" shipping method,
 * and physical product lines are assigned to physical shipping methods.
 *
 * NOTE: Both `shippingLine.shippingMethod` and `order.lines[].productVariant` are
 * pre-loaded by Vendure before this strategy is called. Scalar custom fields (boolean,
 * string, etc.) are stored directly on the entity, so no extra hydration is needed.
 */
class DigitalShippingLineAssignmentStrategy {
    assignShippingLineToOrderLines(ctx, shippingLine, order) {
        // shippingMethod is explicitly assigned in OrderModifier.setShippingMethods()
        // before calling this strategy, and custom fields are on the entity itself.
        const isDigitalShipping = shippingLine.shippingMethod?.customFields?.digitalFulfilmentOnly === true;
        if (isDigitalShipping) {
            // Digital shipping line → only digital order lines
            return order.lines.filter((line) => line.productVariant?.customFields?.isDigital === true);
        }
        else {
            // Physical shipping line → only non-digital order lines
            return order.lines.filter((line) => line.productVariant?.customFields?.isDigital !== true);
        }
    }
}
exports.DigitalShippingLineAssignmentStrategy = DigitalShippingLineAssignmentStrategy;
