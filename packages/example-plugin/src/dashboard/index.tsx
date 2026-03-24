import { defineDashboardExtension } from '@vendure/dashboard';
import { ExampleDashboardPage } from './example-dashboard-page';

defineDashboardExtension({
    routes: [
        {
            path: '/example-plugin',
            loader: () => ({ breadcrumb: 'Example Plugin' }),
            navMenuItem: {
                id: 'example-plugin',
                title: 'Example Plugin',
                sectionId: 'catalog',
            },
            component: () => <ExampleDashboardPage />,
        },
    ],
});
