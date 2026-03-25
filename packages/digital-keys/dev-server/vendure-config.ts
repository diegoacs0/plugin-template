import { DefaultSearchPlugin, VendureConfig } from '@vendure/core';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import 'dotenv/config';
import path from 'path';
import { DigitalProductsPlugin } from '../src';

const apiPort = process.env.API_PORT || 3000;

export const config: VendureConfig = {
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
        migrations: [path.join(__dirname, '../migrations/*.+(js|ts)')],
        logging: false,
        autoSave: true,
        location: path.join(__dirname, 'vendure.sqlite'),
    },
    paymentOptions: {
        paymentMethodHandlers: [],
    },
    plugins: [
        DefaultSearchPlugin.init({}),
        DigitalProductsPlugin.init({
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
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: path.join(__dirname, './dist/dashboard'),
        }),
    ],
};
