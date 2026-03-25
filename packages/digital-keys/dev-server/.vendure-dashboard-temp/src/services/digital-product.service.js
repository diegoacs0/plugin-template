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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalProductService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const constants_1 = require("../constants");
const digital_product_entity_1 = require("../entities/digital-product.entity");
let DigitalProductService = class DigitalProductService {
    constructor(connection, listQueryBuilder, options) {
        this.connection = connection;
        this.listQueryBuilder = listQueryBuilder;
        this.options = options;
    }
    normalizeString(value) {
        if (value == null) {
            return '';
        }
        return String(value).trim();
    }
    findAll(ctx, options, relations) {
        return this.listQueryBuilder
            .build(digital_product_entity_1.DigitalProduct, options, {
            relations: relations ?? ['productVariant', 'keys', 'medias'],
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    findOne(ctx, id, relations) {
        return this.connection.getRepository(ctx, digital_product_entity_1.DigitalProduct).findOne({
            where: { id },
            relations: relations ?? ['productVariant', 'keys', 'medias'],
        });
    }
    /**
     * Find all digital products linked to a specific ProductVariant.
     */
    findByVariantId(ctx, variantId, relations) {
        return this.connection.getRepository(ctx, digital_product_entity_1.DigitalProduct).find({
            where: { productVariantId: variantId },
            relations: relations ?? ['keys', 'medias'],
        });
    }
    /**
     * Find all digital products linked to variants of a given product.
     */
    async findByProductId(ctx, productId) {
        const variants = await this.connection.getRepository(ctx, core_1.ProductVariant).find({
            where: { productId },
            select: ['id'],
        });
        if (!variants.length)
            return [];
        return this.connection.getRepository(ctx, digital_product_entity_1.DigitalProduct).find({
            where: { productVariantId: (0, typeorm_1.In)(variants.map(v => v.id)) },
            relations: ['productVariant', 'keys', 'medias'],
        });
    }
    async create(ctx, input) {
        const name = this.normalizeString(input?.name);
        const productVariantId = this.normalizeString(input?.productVariantId);
        if (!name) {
            throw new Error('Digital product name is required');
        }
        if (!productVariantId) {
            throw new Error('Product Variant ID is required');
        }
        const repository = this.connection.getRepository(ctx, digital_product_entity_1.DigitalProduct);
        const newEntity = repository.create({
            name,
            deliveryType: input.deliveryType,
            productVariantId,
            chatTemplate: input.chatTemplate ?? null,
            instructionsTemplate: input.instructionsTemplate ?? null,
        });
        const saved = await repository.save(newEntity);
        core_1.Logger.info(`Created digital product "${saved.name}" (${saved.id})`, constants_1.loggerCtx);
        return (0, core_1.assertFound)(this.findOne(ctx, saved.id));
    }
    async update(ctx, input) {
        const normalizedInput = {
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
        const entity = await this.connection.getEntityOrThrow(ctx, digital_product_entity_1.DigitalProduct, normalizedInput.id);
        const updated = (0, core_1.patchEntity)(entity, normalizedInput);
        await this.connection
            .getRepository(ctx, digital_product_entity_1.DigitalProduct)
            .save(updated, { reload: false });
        return (0, core_1.assertFound)(this.findOne(ctx, updated.id));
    }
    async delete(ctx, id) {
        const entity = await this.connection.getEntityOrThrow(ctx, digital_product_entity_1.DigitalProduct, id, { relations: ['keys', 'medias'] });
        try {
            await this.connection.getRepository(ctx, digital_product_entity_1.DigitalProduct).remove(entity);
            core_1.Logger.info(`Deleted digital product "${entity.name}" (${id})`, constants_1.loggerCtx);
            return { result: generated_types_1.DeletionResult.DELETED };
        }
        catch (e) {
            return { result: generated_types_1.DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
};
exports.DigitalProductService = DigitalProductService;
exports.DigitalProductService = DigitalProductService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(constants_1.PLUGIN_INIT_OPTIONS)),
    __metadata("design:paramtypes", [core_1.TransactionalConnection,
        core_1.ListQueryBuilder, Object])
], DigitalProductService);
