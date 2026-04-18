import { createTestEnvironment } from '@vendure/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'path';
import { testConfig } from '../../../utils/e2e/test-config';
import { initialData } from '../../../utils/e2e/e2e-initial-data';
import { DigitalProductsPlugin } from '../src';

/**
 * End-to-end tests for the Digital Products Plugin
 *
 * NOTE: Full integration tests require GraphQL query documents to be generated
 * via codegen. For now, this is a basic e2e test to verify the plugin initializes.
 */
describe('Digital Products E2E', () => {
    const { server, adminClient, shopClient } = createTestEnvironment({
        ...testConfig(8001),
        plugins: [
            DigitalProductsPlugin.init({
                enabled: true,
                autoFulfill: true,
                chatProvider: {
                    provider: 'url-template',
                    urlTemplate: 'https://support.example.com/chat?order={{order_id}}&email={{email}}',
                },
            }),
        ],
    });

    beforeAll(
        async () => {
            await server.init({
                productsCsvPath: path.join(
                    __dirname,
                    '../../../utils/e2e/e2e-products-full.csv',
                ),
                initialData,
                customerCount: 2,
            });
            await adminClient.asSuperAdmin();
        },
        120000,
    );

    afterAll(async () => {
        await server.destroy();
    });

    it('plugin initializes successfully', async () => {
        expect(server).toBeDefined();
        expect(adminClient).toBeDefined();
        expect(shopClient).toBeDefined();
    });
});
