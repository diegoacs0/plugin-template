"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalMediaService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const constants_1 = require("../constants");
const digital_product_media_entity_1 = require("../entities/digital-product-media.entity");
let DigitalMediaService = class DigitalMediaService {
    constructor(connection) {
        this.connection = connection;
    }
    normalizeString(value) {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }
    findOne(ctx, id) {
        return this.connection.getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia).findOne({
            where: { id },
            relations: ['digitalProduct'],
        });
    }
    /**
     * List media for a specific digital product, optionally filtered by access level.
     */
    findByDigitalProductId(ctx, digitalProductId, accessLevel) {
        const where = { digitalProductId };
        if (accessLevel)
            where.accessLevel = accessLevel;
        return this.connection.getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia).find({
            where,
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Add a media file to a digital product.
     */
    async create(ctx, input) {
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
        const repository = this.connection.getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia);
        const entity = repository.create({
            digitalProductId,
            accessLevel: input.accessLevel,
            fileUrl,
            fileName,
            mimeType,
            fileSize: input.fileSize ?? null,
        });
        const saved = await repository.save(entity);
        core_1.Logger.info(`Added media "${saved.fileName}" to digital product ${saved.digitalProductId}`, constants_1.loggerCtx);
        return saved;
    }
    /**
     * Increment the download counter for a media file.
     */
    async incrementDownloadCount(ctx, mediaId) {
        await this.connection
            .getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia)
            .increment({ id: mediaId }, 'downloadCount', 1);
    }
    /**
     * Delete media files by IDs.
     */
    async delete(ctx, ids) {
        try {
            const medias = await this.connection
                .getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia)
                .find({ where: { id: (0, typeorm_1.In)(ids) } });
            await this.connection
                .getRepository(ctx, digital_product_media_entity_1.DigitalProductMedia)
                .remove(medias);
            return { result: generated_types_1.DeletionResult.DELETED };
        }
        catch (e) {
            return { result: generated_types_1.DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
};
exports.DigitalMediaService = DigitalMediaService;
exports.DigitalMediaService = DigitalMediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.TransactionalConnection])
], DigitalMediaService);
