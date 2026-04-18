import { Inject, Injectable } from '@nestjs/common';
import {
    DeletionResponse,
    DeletionResult,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    assertFound,
    ListQueryBuilder,
    ListQueryOptions,
    patchEntity,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
    Logger,
    ProductVariant,
} from '@vendure/core';
import { In } from 'typeorm';
import { PLUGIN_INIT_OPTIONS, loggerCtx } from '../constants';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalVariantStockService } from './digital-variant-stock.service';
import {
    CreateDigitalProductInput,
    UpdateDigitalProductInput,
    DigitalProductsPluginOptions,
} from '../types';

@Injectable()
export class DigitalProductService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private digitalVariantStockService: DigitalVariantStockService,
        @Inject(PLUGIN_INIT_OPTIONS) private options: DigitalProductsPluginOptions,
    ) {}

    private normalizeString(value: unknown): string {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }

    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<DigitalProduct>,
        relations?: RelationPaths<DigitalProduct>,
    ): Promise<PaginatedList<DigitalProduct>> {
        return this.listQueryBuilder
            .build(DigitalProduct, options, {
                relations: relations ?? ['productVariant', 'keys', 'medias'],
                ctx,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<DigitalProduct>,
    ): Promise<DigitalProduct | null> {
        return this.connection.getRepository(ctx, DigitalProduct).findOne({
            where: { id },
            relations: relations ?? ['productVariant', 'keys', 'medias'],
        });
    }

    /**
     * Find all digital products linked to a specific ProductVariant.
     */
    findByVariantId(
        ctx: RequestContext,
        variantId: ID,
        relations?: RelationPaths<DigitalProduct>,
    ): Promise<DigitalProduct[]> {
        return this.connection.getRepository(ctx, DigitalProduct).find({
            where: { productVariantId: variantId },
            relations: relations ?? ['keys', 'medias'],
        });
    }

    /**
     * Find all digital products linked to variants of a given product.
     */
    async findByProductId(
        ctx: RequestContext,
        productId: ID,
    ): Promise<DigitalProduct[]> {
        const variants = await this.connection.getRepository(ctx, ProductVariant).find({
            where: { productId },
            select: ['id'],
        });
        if (!variants.length) return [];

        return this.connection.getRepository(ctx, DigitalProduct).find({
            where: { productVariantId: In(variants.map(v => v.id)) as any },
            relations: ['productVariant', 'keys', 'medias'],
        });
    }

    async create(
        ctx: RequestContext,
        input: CreateDigitalProductInput,
    ): Promise<DigitalProduct> {
        const name = this.normalizeString(input?.name);
        const productVariantId = this.normalizeString(input?.productVariantId);

        if (!name) {
            throw new Error('Digital product name is required');
        }
        if (!productVariantId) {
            throw new Error('Product Variant ID is required');
        }

        const repository = this.connection.getRepository(ctx, DigitalProduct);
        const newEntity = repository.create({
            name,
            deliveryType: input.deliveryType,
            productVariantId,
            chatTemplate: input.chatTemplate ?? null,
            instructionsTemplate: input.instructionsTemplate ?? null,
        });

        const saved = await repository.save(newEntity);

        await this.digitalVariantStockService.syncVariantStock(
            ctx,
            saved.productVariantId,
        );

        Logger.info(`Created digital product "${saved.name}" (${saved.id})`, loggerCtx);
        return assertFound(this.findOne(ctx, saved.id));
    }

    async update(
        ctx: RequestContext,
        input: UpdateDigitalProductInput,
    ): Promise<DigitalProduct> {
        const normalizedInput: UpdateDigitalProductInput = {
            ...input,
            id: this.normalizeString(input?.id),
        };

        if (input?.name != null) {
            const normalizedName = this.normalizeString(input.name);
            if (!normalizedName) {
                throw new Error('Digital product name cannot be empty');
            }
            normalizedInput.name = normalizedName;
        }

        const entity = await this.connection.getEntityOrThrow(
            ctx,
            DigitalProduct,
            normalizedInput.id,
        );
        const previousVariantId = entity.productVariantId;
        const updated = patchEntity(entity, normalizedInput);
        await this.connection
            .getRepository(ctx, DigitalProduct)
            .save(updated, { reload: false });

        const variantIdsToSync = Array.from(
            new Set([previousVariantId, updated.productVariantId].filter(Boolean)),
        );
        for (const variantId of variantIdsToSync) {
            await this.digitalVariantStockService.syncVariantStock(ctx, variantId);
        }

        return assertFound(this.findOne(ctx, updated.id));
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(
            ctx,
            DigitalProduct,
            id,
            { relations: ['keys', 'medias'] },
        );
        const variantId = entity.productVariantId;
        try {
            await this.connection.getRepository(ctx, DigitalProduct).remove(entity);
            await this.digitalVariantStockService.syncVariantStock(ctx, variantId);
            Logger.info(`Deleted digital product "${entity.name}" (${id})`, loggerCtx);
            return { result: DeletionResult.DELETED };
        } catch (e: any) {
            return { result: DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
}
