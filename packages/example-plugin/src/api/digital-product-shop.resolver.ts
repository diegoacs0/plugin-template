import { Args, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    Permission,
    RequestContext,
    OrderService,
} from '@vendure/core';
import { ID } from '@vendure/common/lib/shared-types';
import { Inject } from '@nestjs/common';
import { DigitalProductService } from '../services/digital-product.service';
import { DigitalMediaService } from '../services/digital-media.service';
import { DigitalOrderService } from '../services/digital-order.service';
import { DigitalKeyService } from '../services/digital-key.service';
import { PLUGIN_INIT_OPTIONS } from '../constants';
import {
    DeliveryType,
    MediaAccessLevel,
    DigitalProductsPluginOptions,
} from '../types';
import { createLiveChatSessionUrl } from '../lib/live-chat';
import { renderTemplate } from '../lib/template-engine';
import { sanitizeRenderedHtml } from '../lib/html-sanitizer';

@Resolver()
export class DigitalProductShopResolver {
    constructor(
        private digitalProductService: DigitalProductService,
        private digitalMediaService: DigitalMediaService,
        private digitalOrderService: DigitalOrderService,
        private digitalKeyService: DigitalKeyService,
        private orderService: OrderService,
        @Inject(PLUGIN_INIT_OPTIONS) private options: DigitalProductsPluginOptions,
    ) {}

    /**
     * Get all digital orders for the currently authenticated customer.
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myDigitalOrders(
        @Ctx() ctx: RequestContext,
    ) {
        if (!ctx.activeUserId) return [];

        // findAll with the Shop API RequestContext already scopes to the active customer
        const orders = await this.orderService.findAll(ctx, {
            filter: {
                state: { notEq: 'AddingItems' },
            },
        });

        const results = [];

        for (const order of orders.items) {
            const digitalOrder = await this.digitalOrderService.findByOrderId(ctx, order.id);
            if (!digitalOrder) continue;

            const items = await this.buildCustomerDigitalProducts(ctx, digitalOrder.id, order.id, order.customer?.emailAddress);
            results.push({
                digitalOrder,
                items,
            });
        }

        return results;
    }

    /**
     * Get digital order details for a specific Vendure Order.
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myDigitalOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderId: string },
    ) {
        const digitalOrder = await this.digitalOrderService.findByOrderId(ctx, args.orderId);
        if (!digitalOrder) return null;

        // Verify the order belongs to the current user
        const order = await this.orderService.findOne(ctx, args.orderId);
        if (!order || !ctx.activeUserId) return null;
        // In the Shop API context, findOne already scopes by active customer,
        // so if the order was found it belongs to the current user.

        const items = await this.buildCustomerDigitalProducts(
            ctx,
            digitalOrder.id,
            order.id,
            order.customer?.emailAddress,
        );

        return {
            digitalOrder,
            items,
        };
    }

    /**
     * Get preview media for a digital product (public access).
     */
    @Query()
    @Allow(Permission.Public)
    async digitalProductPreview(
        @Ctx() ctx: RequestContext,
        @Args() args: { digitalProductId: string },
    ) {
        const dp = await this.digitalProductService.findOne(ctx, args.digitalProductId);
        if (!dp) return null;

        const previewMedias = await this.digitalMediaService.findByDigitalProductId(
            ctx,
            dp.id,
            MediaAccessLevel.PREVIEW,
        );

        return {
            id: dp.id,
            name: dp.name,
            deliveryType: dp.deliveryType,
            previewMedias,
        };
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private async buildCustomerDigitalProducts(
        ctx: RequestContext,
        digitalOrderId: ID,
        orderId: ID,
        customerEmail?: string,
    ) {
        const digitalOrder = await this.digitalOrderService.findOne(ctx, digitalOrderId);
        if (!digitalOrder) return [];

        // Get all unique digital products referenced by the assigned keys
        const digitalProductIds = [
            ...new Set(digitalOrder.keys.map(k => k.digitalProductId)),
        ];

        const results = [];

        for (const dpId of digitalProductIds) {
            const dp = await this.digitalProductService.findOne(ctx, dpId);
            if (!dp) continue;

            // Keys assigned to this order for this digital product
            const assignedKeys = digitalOrder.keys.filter(
                k => k.digitalProductId === dpId,
            );

            // Download URLs for MAIN media
            const mainMedias = await this.digitalMediaService.findByDigitalProductId(
                ctx,
                dpId,
                MediaAccessLevel.MAIN,
            );
            const downloadUrls = mainMedias.map(m => m.fileUrl);

            // Service session URL
            let serviceSessionUrl: string | null = null;
            if (dp.deliveryType === DeliveryType.SERVICE && this.options.chatProvider) {
                serviceSessionUrl = createLiveChatSessionUrl(
                    this.options.chatProvider,
                    {
                        orderId: String(orderId),
                        productId: String(dp.id),
                        productName: dp.name,
                        customerEmail: customerEmail ?? '',
                    },
                );
            }

            // Rendered instructions HTML
            let instructionsHtml: string | null = null;
            if (dp.instructionsTemplate) {
                const rendered = renderTemplate({
                    template: dp.instructionsTemplate,
                    values: {
                        order: { id: orderId },
                        product: { id: dp.id, name: dp.name },
                        keys: assignedKeys.map(k => k.code),
                        customer: { email: customerEmail ?? '' },
                    },
                });
                instructionsHtml = sanitizeRenderedHtml(rendered);
            }

            results.push({
                digitalProduct: dp,
                keys: assignedKeys,
                downloadUrls,
                serviceSessionUrl,
                instructionsHtml,
            });
        }

        return results;
    }
}
