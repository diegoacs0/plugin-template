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
exports.DigitalProductMedia = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
const digital_product_entity_1 = require("./digital-product.entity");
/**
 * A media file (downloadable or preview) attached to a DigitalProduct.
 */
let DigitalProductMedia = class DigitalProductMedia extends core_1.VendureEntity {
    constructor(input) {
        super(input);
    }
};
exports.DigitalProductMedia = DigitalProductMedia;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: types_1.MediaAccessLevel.MAIN }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DigitalProductMedia.prototype, "accessLevel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DigitalProductMedia.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DigitalProductMedia.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DigitalProductMedia.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], DigitalProductMedia.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], DigitalProductMedia.prototype, "downloadCount", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => digital_product_entity_1.DigitalProduct, dp => dp.medias, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", digital_product_entity_1.DigitalProduct)
], DigitalProductMedia.prototype, "digitalProduct", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", Object)
], DigitalProductMedia.prototype, "digitalProductId", void 0);
exports.DigitalProductMedia = DigitalProductMedia = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DigitalProductMedia);
