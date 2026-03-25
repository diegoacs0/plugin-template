import { CrudPermissionDefinition } from '@vendure/core';

/** @internal */
export const loggerCtx = 'DigitalProductsPlugin';

/** @internal */
export const PLUGIN_INIT_OPTIONS = Symbol('DIGITAL_PRODUCTS_PLUGIN_OPTIONS');

/**
 * Permissions for managing digital products.
 */
export const digitalProductPermission = new CrudPermissionDefinition('DigitalProduct');

/**
 * Permissions for managing digital product keys.
 */
export const digitalKeyPermission = new CrudPermissionDefinition('DigitalKey');

/**
 * Permissions for managing digital orders.
 */
export const digitalOrderPermission = new CrudPermissionDefinition('DigitalOrder');