import { Injectable } from '@nestjs/common';
import {
    DeletionResponse,
    DeletionResult,
} from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import {
    RequestContext,
    TransactionalConnection,
    Logger,
} from '@vendure/core';
import { In } from 'typeorm';
import { loggerCtx } from '../constants';
import { DigitalProductMedia } from '../entities/digital-product-media.entity';
import { CreateDigitalMediaInput, MediaAccessLevel } from '../types';

@Injectable()
export class DigitalMediaService {
    constructor(
        private connection: TransactionalConnection,
    ) {}

    private normalizeString(value: unknown): string {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }

    findOne(
        ctx: RequestContext,
        id: ID,
    ): Promise<DigitalProductMedia | null> {
        return this.connection.getRepository(ctx, DigitalProductMedia).findOne({
            where: { id },
            relations: ['digitalProduct'],
        });
    }

    /**
     * List media for a specific digital product, optionally filtered by access level.
     */
    findByDigitalProductId(
        ctx: RequestContext,
        digitalProductId: ID,
        accessLevel?: MediaAccessLevel,
    ): Promise<DigitalProductMedia[]> {
        const where: Record<string, unknown> = { digitalProductId };
        if (accessLevel) where.accessLevel = accessLevel;

        return this.connection.getRepository(ctx, DigitalProductMedia).find({
            where,
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Add a media file to a digital product.
     */
    async create(
        ctx: RequestContext,
        input: CreateDigitalMediaInput,
    ): Promise<DigitalProductMedia> {
        const digitalProductId = this.normalizeString(input?.digitalProductId);
        const fileUrl = this.normalizeString(input?.fileUrl);
        const fileName = this.normalizeString(input?.fileName);
        const mimeType = this.normalizeString(input?.mimeType);

        if (!digitalProductId) {
            throw new Error('Digital product ID is required');
        }
        if (!fileUrl) {
            throw new Error('File URL is required');
        }
        if (!fileName) {
            throw new Error('File name is required');
        }
        if (!mimeType) {
            throw new Error('MIME type is required');
        }

        const repository = this.connection.getRepository(ctx, DigitalProductMedia);
        const entity = repository.create({
            digitalProductId,
            accessLevel: input.accessLevel,
            fileUrl,
            fileName,
            mimeType,
            fileSize: input.fileSize ?? null,
        });

        const saved = await repository.save(entity);

        Logger.info(
            `Added media "${saved.fileName}" to digital product ${saved.digitalProductId}`,
            loggerCtx,
        );
        return saved;
    }

    /**
     * Increment the download counter for a media file.
     */
    async incrementDownloadCount(
        ctx: RequestContext,
        mediaId: ID,
    ): Promise<void> {
        await this.connection
            .getRepository(ctx, DigitalProductMedia)
            .increment({ id: mediaId }, 'downloadCount', 1);
    }

    /**
     * Delete media files by IDs.
     */
    async delete(
        ctx: RequestContext,
        ids: ID[],
    ): Promise<DeletionResponse> {
        try {
            const medias = await this.connection
                .getRepository(ctx, DigitalProductMedia)
                .find({ where: { id: In(ids) as any } });

            await this.connection
                .getRepository(ctx, DigitalProductMedia)
                .remove(medias);

            return { result: DeletionResult.DELETED };
        } catch (e: any) {
            return { result: DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
}
