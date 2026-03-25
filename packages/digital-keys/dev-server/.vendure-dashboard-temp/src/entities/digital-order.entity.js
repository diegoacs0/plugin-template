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
exports.DigitalOrder = void 0;
const core_1 = require("@vendure/core");
const typeorm_1 = require("typeorm");
const types_1 = require("../types");
const digital_product_key_entity_1 = require("./digital-product-key.entity");
/**
 * Tracks the digital fulfillment of an Order — links keys and delivery status.
 */
let DigitalOrder = class DigitalOrder extends core_1.VendureEntity {
    constructor(input) {
        super(input);
    }
};
exports.DigitalOrder = DigitalOrder;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: types_1.DigitalOrderStatus.PENDING }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DigitalOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => core_1.Order, { onDelete: 'CASCADE', eager: false }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", core_1.Order)
], DigitalOrder.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", Object)
], DigitalOrder.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DigitalOrder.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => digital_product_key_entity_1.DigitalProductKey, key => key.digitalOrder),
    __metadata("design:type", Array)
], DigitalOrder.prototype, "keys", void 0);
exports.DigitalOrder = DigitalOrder = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DigitalOrder);
