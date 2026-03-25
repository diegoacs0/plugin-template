import {
    DeepPartial,
    VendureEntity,
    ID,
} from '@vendure/core';
import {
    Column,
    Entity,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { KeyStatus } from '../types';
import { DigitalProduct } from './digital-product.entity';
import { DigitalOrder } from './digital-order.entity';

/**
 * A license key or serial code that can be assigned to a customer upon purchase.
 */
@Entity()
export class DigitalProductKey extends VendureEntity {
    constructor(input?: DeepPartial<DigitalProductKey>) {
        super(input);
    }

    /** The actual key/code string */
    @Column()
    code: string;

    /** Current status of this key */
    @Column({ type: 'varchar', default: KeyStatus.AVAILABLE })
    @Index()
    status: KeyStatus;

    /** The digital product this key belongs to */
    @ManyToOne(() => DigitalProduct, dp => dp.keys, { onDelete: 'CASCADE' })
    @JoinColumn()
    digitalProduct: DigitalProduct;

    @Index()
    @Column()
    digitalProductId: ID;

    /** The order this key was assigned to (null if still available) */
    @ManyToOne(() => DigitalOrder, order => order.keys, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    digitalOrder: DigitalOrder | null;

    @Column({ nullable: true })
    digitalOrderId: ID | null;
}
