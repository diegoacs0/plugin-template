import { Inject, Injectable } from '@nestjs/common';
import {
    DeletionResponse,
    DeletionResult,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    ListQueryBuilder,
    ListQueryOptions,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
    Logger,
} from '@vendure/core';
import { In } from 'typeorm';
import { PLUGIN_INIT_OPTIONS, loggerCtx } from '../constants';
import { DigitalProductKey } from '../entities/digital-product-key.entity';
import {
    KeyStatus,
    DigitalProductsPluginOptions,
} from '../types';

@Injectable()
export class DigitalKeyService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
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
        options?: ListQueryOptions<DigitalProductKey>,
        relations?: RelationPaths<DigitalProductKey>,
    ): Promise<PaginatedList<DigitalProductKey>> {
        return this.listQueryBuilder
            .build(DigitalProductKey, options, {
                relations,
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
    ): Promise<DigitalProductKey | null> {
        return this.connection.getRepository(ctx, DigitalProductKey).findOne({
            where: { id },
            relations: ['digitalProduct', 'digitalOrder'],
        });
    }

    /**
     * List keys for a specific digital product.
     */
    findByDigitalProductId(
        ctx: RequestContext,
        digitalProductId: ID,
        status?: KeyStatus,
    ): Promise<DigitalProductKey[]> {
        const where: Record<string, unknown> = { digitalProductId };
        if (status) where.status = status;

        return this.connection.getRepository(ctx, DigitalProductKey).find({
            where,
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Count available keys for a digital product.
     */
    countAvailable(ctx: RequestContext, digitalProductId: ID): Promise<number> {
        return this.connection.getRepository(ctx, DigitalProductKey).count({
            where: {
                digitalProductId,
                status: KeyStatus.AVAILABLE,
            },
        });
    }

    /**
     * Add keys in bulk to a digital product.
     */
    async addKeys(
        ctx: RequestContext,
        digitalProductId: ID,
        codes: string[],
    ): Promise<DigitalProductKey[]> {
        const normalizedProductId = this.normalizeString(digitalProductId);
        if (!normalizedProductId) {
            throw new Error('Digital product ID is required');
        }

        const normalizedCodes = (codes ?? [])
            .map(code => this.normalizeString(code))
            .filter(Boolean);

        if (!normalizedCodes.length) {
            throw new Error('At least one non-empty key code is required');
        }

        const repository = this.connection.getRepository(ctx, DigitalProductKey);
        const entities = normalizedCodes.map(code =>
            repository.create({
                code,
                status: KeyStatus.AVAILABLE,
                digitalProductId: normalizedProductId,
            }),
        );
        const saved = await repository.save(entities);

        Logger.info(
            `Added ${saved.length} keys to digital product ${digitalProductId}`,
            loggerCtx,
        );
        return saved;
    }

    /**
     * Assign N available keys from a digital product to a digital order.
     * Throws if not enough keys are available.
     */
    async assignKeys(
        ctx: RequestContext,
        digitalProductId: ID,
        digitalOrderId: ID,
        quantity: number,
    ): Promise<DigitalProductKey[]> {
        const normalizedProductId = this.normalizeString(digitalProductId);
        const normalizedOrderId = this.normalizeString(digitalOrderId);
        if (!normalizedProductId) {
            throw new Error('Digital product ID is required');
        }
        if (!normalizedOrderId) {
            throw new Error('Digital order ID is required');
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        const available = await this.connection
            .getRepository(ctx, DigitalProductKey)
            .find({
                where: {
                    digitalProductId: normalizedProductId,
                    status: KeyStatus.AVAILABLE,
                },
                order: { createdAt: 'ASC' },
                take: quantity,
            });

        if (available.length < quantity) {
            throw new Error(
                `Not enough license keys for digital product ${digitalProductId}: ` +
                `needed ${quantity}, available ${available.length}`,
            );
        }

        for (const key of available) {
            key.status = KeyStatus.ASSIGNED;
            key.digitalOrderId = normalizedOrderId;
        }

        return this.connection
            .getRepository(ctx, DigitalProductKey)
            .save(available);
    }

    /**
     * Revoke (unassign) keys back to available.
     */
    async revokeKeys(
        ctx: RequestContext,
        keyIds: ID[],
    ): Promise<DigitalProductKey[]> {
        const keys = await this.connection
            .getRepository(ctx, DigitalProductKey)
            .find({ where: { id: In(keyIds) as any } });

        for (const key of keys) {
            key.status = KeyStatus.AVAILABLE;
            key.digitalOrderId = null;
        }

        return this.connection
            .getRepository(ctx, DigitalProductKey)
            .save(keys);
    }

    /**
     * Delete keys by IDs. Only AVAILABLE keys can be deleted.
     */
    async deleteKeys(
        ctx: RequestContext,
        ids: ID[],
    ): Promise<DeletionResponse> {
        try {
            const keys = await this.connection
                .getRepository(ctx, DigitalProductKey)
                .find({ where: { id: In(ids) as any, status: KeyStatus.AVAILABLE } });

            await this.connection
                .getRepository(ctx, DigitalProductKey)
                .remove(keys);

            return { result: DeletionResult.DELETED };
        } catch (e: any) {
            return { result: DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
}
