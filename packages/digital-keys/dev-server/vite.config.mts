import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: '/dashboard',
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    build: {
        outDir: join(__dirname, './dist/dashboard'),
        emptyOutDir: true,
    },
    plugins: [
        vendureDashboardPlugin({
            vendureConfigPath: pathToFileURL(join(__dirname, './vendure-config.ts')),
            tempCompilationDir: join(__dirname, './.vendure-dashboard-temp'),
            pathAdapter: {
                getCompiledConfigPath: ({ outputPath, configFileName }) =>
                    join(outputPath, 'dev-server', configFileName),
            },
            api: {
                host: 'http://localhost',
                port: process.env.API_PORT ? +process.env.API_PORT : 3000,
            },
            gqlOutputPath: join(__dirname, '../src/dashboard/gql'),
        }),
    ],
});
