import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import {
    Allow,
    Ctx,
    PaginatedList,
    RelationPaths,
    Relations,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalProductKey } from '../entities/digital-product-key.entity';
import { DigitalProductMedia } from '../entities/digital-product-media.entity';
import { DigitalOrder } from '../entities/digital-order.entity';
import { DigitalProductService } from '../services/digital-product.service';
import { DigitalKeyService } from '../services/digital-key.service';
import { DigitalMediaService } from '../services/digital-media.service';
import { DigitalOrderService } from '../services/digital-order.service';
import {
    digitalProductPermission,
    digitalKeyPermission,
    digitalOrderPermission,
} from '../constants';
import {
    AddDigitalProductKeysInput,
    CreateDigitalMediaInput,
    CreateDigitalProductInput,
    UpdateDigitalProductInput,
} from '../types';

@Resolver('DigitalProduct')
export class DigitalProductAdminResolver {
    constructor(
        private digitalProductService: DigitalProductService,
        private digitalKeyService: DigitalKeyService,
        private digitalMediaService: DigitalMediaService,
        private digitalOrderService: DigitalOrderService,
    ) {}

    // ─── Queries ─────────────────────────────────────────────────────────

    @Query()
    @Allow(digitalProductPermission.Read)
    async digitalProduct(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: string },
        @Relations(DigitalProduct) relations: RelationPaths<DigitalProduct>,
    ): Promise<DigitalProduct | null> {
        return this.digitalProductService.findOne(ctx, args.id, relations);
    }

    @Query()
    @Allow(digitalProductPermission.Read)
    async digitalProducts(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: any },
        @Relations(DigitalProduct) relations: RelationPaths<DigitalProduct>,
    ): Promise<PaginatedList<DigitalProduct>> {
        return this.digitalProductService.findAll(ctx, args.options, relations);
    }

    @Query()
    @Allow(digitalProductPermission.Read)
    async digitalProductsByVariant(
        @Ctx() ctx: RequestContext,
        @Args() args: { productVariantId: string },
    ): Promise<DigitalProduct[]> {
        return this.digitalProductService.findByVariantId(ctx, args.productVariantId);
    }

    @Query()
    @Allow(digitalKeyPermission.Read)
    async digitalProductKeys(
        @Ctx() ctx: RequestContext,
        @Args() args: { digitalProductId: string; options?: any },
    ): Promise<PaginatedList<DigitalProductKey>> {
        return this.digitalKeyService.findAll(ctx, {
            ...args.options,
            filter: {
                ...args.options?.filter,
                digitalProductId: { eq: args.digitalProductId },
            },
        });
    }

    @Query()
    @Allow(digitalOrderPermission.Read)
    async digitalOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: string },
    ): Promise<DigitalOrder | null> {
        return this.digitalOrderService.findOne(ctx, args.id);
    }

    @Query()
    @Allow(digitalOrderPermission.Read)
    async digitalOrderByOrderId(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderId: string },
    ): Promise<DigitalOrder | null> {
        return this.digitalOrderService.findByOrderId(ctx, args.orderId);
    }

    @Query()
    @Allow(digitalOrderPermission.Read)
    async failedDigitalOrders(
        @Ctx() ctx: RequestContext,
    ): Promise<DigitalOrder[]> {
        return this.digitalOrderService.findFailed(ctx);
    }

    // ─── Mutations ───────────────────────────────────────────────────────

    @Mutation()
    @Transaction()
    @Allow(digitalProductPermission.Create)
    async createDigitalProduct(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateDigitalProductInput },
    ): Promise<DigitalProduct> {
        return this.digitalProductService.create(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(digitalProductPermission.Update)
    async updateDigitalProduct(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: UpdateDigitalProductInput },
    ): Promise<DigitalProduct> {
        return this.digitalProductService.update(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(digitalProductPermission.Delete)
    async deleteDigitalProduct(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: string },
    ): Promise<DeletionResponse> {
        return this.digitalProductService.delete(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(digitalKeyPermission.Create)
    async addDigitalProductKeys(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: AddDigitalProductKeysInput },
    ): Promise<DigitalProductKey[]> {
        return this.digitalKeyService.addKeys(
            ctx,
            args.input.digitalProductId,
            args.input.keys,
        );
    }

    @Mutation()
    @Transaction()
    @Allow(digitalKeyPermission.Delete)
    async deleteDigitalProductKeys(
        @Ctx() ctx: RequestContext,
        @Args() args: { ids: string[] },
    ): Promise<DeletionResponse> {
        return this.digitalKeyService.deleteKeys(ctx, args.ids);
    }

    @Mutation()
    @Transaction()
    @Allow(digitalProductPermission.Create)
    async createDigitalMedia(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateDigitalMediaInput },
    ): Promise<DigitalProductMedia> {
        return this.digitalMediaService.create(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(digitalProductPermission.Delete)
    async deleteDigitalMedia(
        @Ctx() ctx: RequestContext,
        @Args() args: { ids: string[] },
    ): Promise<DeletionResponse> {
        return this.digitalMediaService.delete(ctx, args.ids);
    }

    // ─── Field Resolvers ─────────────────────────────────────────────────

    @ResolveField('availableKeyCount')
    async availableKeyCount(
        @Ctx() ctx: RequestContext,
        @Parent() digitalProduct: DigitalProduct,
    ): Promise<number> {
        return this.digitalKeyService.countAvailable(ctx, digitalProduct.id);
    }
}
