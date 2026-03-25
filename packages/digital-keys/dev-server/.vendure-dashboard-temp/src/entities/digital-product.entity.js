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
exports.DigitalProduct = exports.DigitalProductCustomFields = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
const digital_product_key_entity_1 = require("./digital-product-key.entity");
const digital_product_media_entity_1 = require("./digital-product-media.entity");
class DigitalProductCustomFields {
}
exports.DigitalProductCustomFields = DigitalProductCustomFields;
/**
 * A DigitalProduct is attached to a ProductVariant and defines how the
 * digital content is delivered: via file download, license key, or service session.
 */
let DigitalProduct = class DigitalProduct extends core_1.VendureEntity {
    constructor(input) {
        super(input);
    }
};
exports.DigitalProduct = DigitalProduct;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DigitalProduct.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: types_1.DeliveryType.FILE }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DigitalProduct.prototype, "deliveryType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DigitalProduct.prototype, "chatTemplate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DigitalProduct.prototype, "instructionsTemplate", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.ManyToOne)(() => core_1.ProductVariant, { onDelete: 'CASCADE', eager: false }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", core_1.ProductVariant)
], DigitalProduct.prototype, "productVariant", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], DigitalProduct.prototype, "productVariantId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => digital_product_key_entity_1.DigitalProductKey, key => key.digitalProduct),
    __metadata("design:type", Array)
], DigitalProduct.prototype, "keys", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => digital_product_media_entity_1.DigitalProductMedia, media => media.digitalProduct),
    __metadata("design:type", Array)
], DigitalProduct.prototype, "medias", void 0);
__decorate([
    (0, typeorm_1.Column)(type => DigitalProductCustomFields),
    __metadata("design:type", DigitalProductCustomFields)
], DigitalProduct.prototype, "customFields", void 0);
exports.DigitalProduct = DigitalProduct = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DigitalProduct);
