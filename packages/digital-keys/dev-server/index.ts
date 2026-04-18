import { bootstrap, JobQueueService, PaymentMethodService, RequestContextService } from "@vendure/core";
import { config, autoSettlePaymentHandler } from "./vendure-config";

bootstrap(config)
  .then(async (app) => {
    await app.get(JobQueueService).start();
    await ensureAutoSettlePaymentMethod(app);
  })
  .catch((err) => {
    console.log(err);
  });

/**
 * Creates the "auto-settle" PaymentMethod in the DB if it does not already
 * exist. This runs once at dev-server startup so the storefront checkout works
 * out of the box without manual admin setup.
 */
async function ensureAutoSettlePaymentMethod(app: any): Promise<void> {
  try {
    const ctxService = app.get(RequestContextService);
    const paymentMethodService = app.get(PaymentMethodService);
    const ctx = await ctxService.create({ apiType: 'admin' });

    const existing = await paymentMethodService.findAll(ctx, {
      filter: { code: { eq: autoSettlePaymentHandler.code } },
    });

    if (existing.totalItems === 0) {
      await paymentMethodService.create(ctx, {
        code: autoSettlePaymentHandler.code,
        enabled: true,
        handler: { code: autoSettlePaymentHandler.code, arguments: [] },
        translations: [
          {
            languageCode: 'en' as any,
            name: 'Auto-settle (dev / digital)',
            description: 'Automatically settles payment — development only',
            customFields: {},
          },
        ],
        customFields: {},
        checker: undefined,
      });
      console.info(`[dev-server] Created PaymentMethod: ${autoSettlePaymentHandler.code}`);
    } else {
      console.info(`[dev-server] PaymentMethod "${autoSettlePaymentHandler.code}" already exists — skipping.`);
    }
  } catch (e: any) {
    console.warn(`[dev-server] Could not ensure payment method: ${e.message}`);
  }
}
