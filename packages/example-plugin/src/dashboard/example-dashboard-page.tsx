import { Button, Page, PageBlock, PageLayout, PageTitle } from '@vendure/dashboard';
import '@vendure-io/design-tokens/css/theme';

export function ExampleDashboardPage() {
    return (
        <Page pageId="example-plugin-page">
            <PageTitle>Example Plugin</PageTitle>
            <PageLayout>
                <PageBlock column="main" blockId="example-main">
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            React dashboard extension is active (Vendure v3.5+).
                        </p>
                        <Button variant="secondary" disabled>
                            Example loaded
                        </Button>
                    </div>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}
