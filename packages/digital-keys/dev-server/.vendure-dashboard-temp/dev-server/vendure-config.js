"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const core_1 = require("@vendure/core");
const plugin_1 = require("@vendure/dashboard/plugin");
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const src_1 = require("../src");
const apiPort = process.env.API_PORT || 3000;
exports.config = {
    apiOptions: {
        port: +apiPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        shopApiPlayground: true,
        adminApiPlayground: true,
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: 'superadmin',
            password: 'superadmin',
        },
    },
    dbConnectionOptions: {
        type: 'sqljs',
        synchronize: true,
        migrations: [path_1.default.join(__dirname, '../migrations/*.+(js|ts)')],
        logging: false,
        autoSave: true,
        location: path_1.default.join(__dirname, 'vendure.sqlite'),
    },
    paymentOptions: {
        paymentMethodHandlers: [],
    },
    plugins: [
        core_1.DefaultSearchPlugin.init({}),
        src_1.DigitalProductsPlugin.init({
            enabled: true,
            autoFulfill: true,
            // ── Email notifications ─────────────────────────────────────────
            // Install @vendure/email-plugin and add the EmailPlugin to the
            // plugins array, then register a listener for the event emitted by
            // DigitalOrderService after every fulfillment:
            //
            //   import { EmailPlugin, EmailEventListener } from '@vendure/email-plugin';
            //   import { DigitalOrderNotificationEvent } from './src/events/digital-order-notification.event';
            //
            //   const digitalOrderNotificationHandler = new EmailEventListener('digital-order-notification')
            //     .on(DigitalOrderNotificationEvent)
            //     .setRecipient(event => event.customerEmail)
            //     .setSubject('Your digital order is ready — {{ orderCode }}')
            //     .setTemplateVars(event => ({
            //       orderCode: event.orderCode,
            //       customerName: event.customerName,
            //       items: event.items,
            //       success: event.success,
            //       errorMessage: event.errorMessage,
            //     }));
            //
            //   EmailPlugin.init({
            //     devMode: true,
            //     outputPath: path.join(__dirname, 'test-emails'),
            //     route: 'mailbox',
            //     handlers: [digitalOrderNotificationHandler],
            //     templatePath: path.join(__dirname, 'email-templates'),
            //   }),
            // ── Chat provider (for SERVICE delivery type) ───────────────────
            chatProvider: {
                provider: 'url-template',
                urlTemplate: 'https://support.example.com/chat?order={{order_id}}&email={{email}}',
            },
        }),
        plugin_1.DashboardPlugin.init({
            route: 'dashboard',
            appDir: path_1.default.join(__dirname, './dist/dashboard'),
        }),
    ],
};
