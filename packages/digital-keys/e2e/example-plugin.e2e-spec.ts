import { createTestEnvironment } from '@vendure/testing';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {DigitalProductsPlugin} from "../src";
import path from "path";
import {initialData} from "../../../utils/e2e/e2e-initial-data";
import {testConfig} from "../../../utils/e2e/test-config";

describe('DigitalProductsPlugin', () => {

    const {server, adminClient, shopClient} = createTestEnvironment({
        ...testConfig(8000),
        plugins: [DigitalProductsPlugin.init({
            enabled: true,
        })],
    });

    beforeAll(async () => {
        await server.init({
            productsCsvPath: path.join(__dirname, '../../../utils/e2e/e2e-products-full.csv'),
            initialData: initialData,
            customerCount: 2,
        });
        await adminClient.asSuperAdmin();
    }, 60000);

    afterAll(async () => {
        await server.destroy();
    });

    it('plugin initializes successfully', async () => {
        // Simple test to verify plugin loads without errors
        expect(server).toBeDefined();
        expect(adminClient).toBeDefined();
    });
});