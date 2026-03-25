"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitalOrderPermission = exports.digitalKeyPermission = exports.digitalProductPermission = exports.PLUGIN_INIT_OPTIONS = exports.loggerCtx = void 0;
const core_1 = require("@vendure/core");
/** @internal */
exports.loggerCtx = 'DigitalProductsPlugin';
/** @internal */
exports.PLUGIN_INIT_OPTIONS = Symbol('DIGITAL_PRODUCTS_PLUGIN_OPTIONS');
/**
 * Permissions for managing digital products.
 */
exports.digitalProductPermission = new core_1.CrudPermissionDefinition('DigitalProduct');
/**
 * Permissions for managing digital product keys.
 */
exports.digitalKeyPermission = new core_1.CrudPermissionDefinition('DigitalKey');
/**
 * Permissions for managing digital orders.
 */
exports.digitalOrderPermission = new core_1.CrudPermissionDefinition('DigitalOrder');
