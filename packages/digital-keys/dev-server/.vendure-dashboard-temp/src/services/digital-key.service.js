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
exports.DigitalKeyService = void 0;
const common_1 = require("@nestjs/common");
const generated_types_1 = require("@vendure/common/lib/generated-types");
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const constants_1 = require("../constants");
const digital_product_key_entity_1 = require("../entities/digital-product-key.entity");
const types_1 = require("../types");
let DigitalKeyService = class DigitalKeyService {
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
            .build(digital_product_key_entity_1.DigitalProductKey, options, {
            relations,
            ctx,
        })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
            items,
            totalItems,
        }));
    }
    findOne(ctx, id) {
        return this.connection.getRepository(ctx, digital_product_key_entity_1.DigitalProductKey).findOne({
            where: { id },
            relations: ['digitalProduct', 'digitalOrder'],
        });
    }
    /**
     * List keys for a specific digital product.
     */
    findByDigitalProductId(ctx, digitalProductId, status) {
        const where = { digitalProductId };
        if (status)
            where.status = status;
        return this.connection.getRepository(ctx, digital_product_key_entity_1.DigitalProductKey).find({
            where,
            order: { createdAt: 'ASC' },
        });
    }
    /**
     * Count available keys for a digital product.
     */
    countAvailable(ctx, digitalProductId) {
        return this.connection.getRepository(ctx, digital_product_key_entity_1.DigitalProductKey).count({
            where: {
                digitalProductId,
                status: types_1.KeyStatus.AVAILABLE,
            },
        });
    }
    /**
     * Add keys in bulk to a digital product.
     */
    async addKeys(ctx, digitalProductId, codes) {
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
        const repository = this.connection.getRepository(ctx, digital_product_key_entity_1.DigitalProductKey);
        const entities = normalizedCodes.map(code => repository.create({
            code,
            status: types_1.KeyStatus.AVAILABLE,
            digitalProductId: normalizedProductId,
        }));
        const saved = await repository.save(entities);
        core_1.Logger.info(`Added ${saved.length} keys to digital product ${digitalProductId}`, constants_1.loggerCtx);
        return saved;
    }
    /**
     * Assign N available keys from a digital product to a digital order.
     * Throws if not enough keys are available.
     */
    async assignKeys(ctx, digitalProductId, digitalOrderId, quantity) {
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
            .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
            .find({
            where: {
                digitalProductId: normalizedProductId,
                status: types_1.KeyStatus.AVAILABLE,
            },
            order: { createdAt: 'ASC' },
            take: quantity,
        });
        if (available.length < quantity) {
            throw new Error(`Not enough license keys for digital product ${digitalProductId}: ` +
                `needed ${quantity}, available ${available.length}`);
        }
        for (const key of available) {
            key.status = types_1.KeyStatus.ASSIGNED;
            key.digitalOrderId = normalizedOrderId;
        }
        return this.connection
            .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
            .save(available);
    }
    /**
     * Revoke (unassign) keys back to available.
     */
    async revokeKeys(ctx, keyIds) {
        const keys = await this.connection
            .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
            .find({ where: { id: (0, typeorm_1.In)(keyIds) } });
        for (const key of keys) {
            key.status = types_1.KeyStatus.AVAILABLE;
            key.digitalOrderId = null;
        }
        return this.connection
            .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
            .save(keys);
    }
    /**
     * Delete keys by IDs. Only AVAILABLE keys can be deleted.
     */
    async deleteKeys(ctx, ids) {
        try {
            const keys = await this.connection
                .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
                .find({ where: { id: (0, typeorm_1.In)(ids), status: types_1.KeyStatus.AVAILABLE } });
            await this.connection
                .getRepository(ctx, digital_product_key_entity_1.DigitalProductKey)
                .remove(keys);
            return { result: generated_types_1.DeletionResult.DELETED };
        }
        catch (e) {
            return { result: generated_types_1.DeletionResult.NOT_DELETED, message: e.toString() };
        }
    }
};
exports.DigitalKeyService = DigitalKeyService;
exports.DigitalKeyService = DigitalKeyService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(constants_1.PLUGIN_INIT_OPTIONS)),
    __metadata("design:paramtypes", [core_1.TransactionalConnection,
        core_1.ListQueryBuilder, Object])
], DigitalKeyService);
