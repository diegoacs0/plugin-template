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
exports.DigitalProductAdminResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@vendure/core");
const digital_product_entity_1 = require("../entities/digital-product.entity");
const digital_product_service_1 = require("../services/digital-product.service");
const digital_key_service_1 = require("../services/digital-key.service");
const digital_media_service_1 = require("../services/digital-media.service");
const digital_order_service_1 = require("../services/digital-order.service");
const constants_1 = require("../constants");
let DigitalProductAdminResolver = class DigitalProductAdminResolver {
    constructor(digitalProductService, digitalKeyService, digitalMediaService, digitalOrderService) {
        this.digitalProductService = digitalProductService;
        this.digitalKeyService = digitalKeyService;
        this.digitalMediaService = digitalMediaService;
        this.digitalOrderService = digitalOrderService;
    }
    // ─── Queries ─────────────────────────────────────────────────────────
    async digitalProduct(ctx, args, relations) {
        return this.digitalProductService.findOne(ctx, args.id, relations);
    }
    async digitalProducts(ctx, args, relations) {
        return this.digitalProductService.findAll(ctx, args.options, relations);
    }
    async digitalProductsByVariant(ctx, args) {
        return this.digitalProductService.findByVariantId(ctx, args.productVariantId);
    }
    async digitalProductKeys(ctx, args) {
        return this.digitalKeyService.findAll(ctx, {
            ...args.options,
            filter: {
                ...args.options?.filter,
                digitalProductId: { eq: args.digitalProductId },
            },
        });
    }
    async digitalOrder(ctx, args) {
        return this.digitalOrderService.findOne(ctx, args.id);
    }
    async digitalOrderByOrderId(ctx, args) {
        return this.digitalOrderService.findByOrderId(ctx, args.orderId);
    }
    async failedDigitalOrders(ctx) {
        return this.digitalOrderService.findFailed(ctx);
    }
    // ─── Mutations ───────────────────────────────────────────────────────
    async createDigitalProduct(ctx, args) {
        return this.digitalProductService.create(ctx, args.input);
    }
    async updateDigitalProduct(ctx, args) {
        return this.digitalProductService.update(ctx, args.input);
    }
    async deleteDigitalProduct(ctx, args) {
        return this.digitalProductService.delete(ctx, args.id);
    }
    async addDigitalProductKeys(ctx, args) {
        return this.digitalKeyService.addKeys(ctx, args.input.digitalProductId, args.input.keys);
    }
    async deleteDigitalProductKeys(ctx, args) {
        return this.digitalKeyService.deleteKeys(ctx, args.ids);
    }
    async createDigitalMedia(ctx, args) {
        return this.digitalMediaService.create(ctx, args.input);
    }
    async deleteDigitalMedia(ctx, args) {
        return this.digitalMediaService.delete(ctx, args.ids);
    }
    // ─── Field Resolvers ─────────────────────────────────────────────────
    async availableKeyCount(ctx, digitalProduct) {
        return this.digitalKeyService.countAvailable(ctx, digitalProduct.id);
    }
};
exports.DigitalProductAdminResolver = DigitalProductAdminResolver;
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __param(2, (0, core_1.Relations)(digital_product_entity_1.DigitalProduct)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object, Array]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalProduct", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __param(2, (0, core_1.Relations)(digital_product_entity_1.DigitalProduct)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object, Array]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalProducts", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalProductsByVariant", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalKeyPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalProductKeys", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalOrderPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalOrder", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalOrderPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "digitalOrderByOrderId", null);
__decorate([
    (0, graphql_1.Query)(),
    (0, core_1.Allow)(constants_1.digitalOrderPermission.Read),
    __param(0, (0, core_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "failedDigitalOrders", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Create),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "createDigitalProduct", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Update),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "updateDigitalProduct", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Delete),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "deleteDigitalProduct", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalKeyPermission.Create),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "addDigitalProductKeys", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalKeyPermission.Delete),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "deleteDigitalProductKeys", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Create),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "createDigitalMedia", null);
__decorate([
    (0, graphql_1.Mutation)(),
    (0, core_1.Transaction)(),
    (0, core_1.Allow)(constants_1.digitalProductPermission.Delete),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Args)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext, Object]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "deleteDigitalMedia", null);
__decorate([
    (0, graphql_1.ResolveField)('availableKeyCount'),
    __param(0, (0, core_1.Ctx)()),
    __param(1, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [core_1.RequestContext,
        digital_product_entity_1.DigitalProduct]),
    __metadata("design:returntype", Promise)
], DigitalProductAdminResolver.prototype, "availableKeyCount", null);
exports.DigitalProductAdminResolver = DigitalProductAdminResolver = __decorate([
    (0, graphql_1.Resolver)('DigitalProduct'),
    __metadata("design:paramtypes", [digital_product_service_1.DigitalProductService,
        digital_key_service_1.DigitalKeyService,
        digital_media_service_1.DigitalMediaService,
        digital_order_service_1.DigitalOrderService])
], DigitalProductAdminResolver);
