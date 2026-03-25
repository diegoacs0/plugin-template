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
exports.DigitalProductKey = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
const digital_product_entity_1 = require("./digital-product.entity");
const digital_order_entity_1 = require("./digital-order.entity");
/**
 * A license key or serial code that can be assigned to a customer upon purchase.
 */
let DigitalProductKey = class DigitalProductKey extends core_1.VendureEntity {
    constructor(input) {
        super(input);
    }
};
exports.DigitalProductKey = DigitalProductKey;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DigitalProductKey.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: types_1.KeyStatus.AVAILABLE }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DigitalProductKey.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => digital_product_entity_1.DigitalProduct, dp => dp.keys, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", digital_product_entity_1.DigitalProduct)
], DigitalProductKey.prototype, "digitalProduct", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", Object)
], DigitalProductKey.prototype, "digitalProductId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => digital_order_entity_1.DigitalOrder, order => order.keys, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", digital_order_entity_1.DigitalOrder)
], DigitalProductKey.prototype, "digitalOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], DigitalProductKey.prototype, "digitalOrderId", void 0);
exports.DigitalProductKey = DigitalProductKey = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DigitalProductKey);
