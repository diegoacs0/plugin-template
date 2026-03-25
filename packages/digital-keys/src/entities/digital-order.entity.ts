import {
    DeepPartial,
    ID,
    Order,
    VendureEntity,
} from '@vendure/core';
import {
    Column,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { DigitalOrderStatus } from '../types';
import { DigitalProductKey } from './digital-product-key.entity';

/**
 * Tracks the digital fulfillment of an Order — links keys and delivery status.
 */
@Entity()
export class DigitalOrder extends VendureEntity {
    constructor(input?: DeepPartial<DigitalOrder>) {
        super(input);
    }

    /** Current status of the digital order */
    @Column({ type: 'varchar', default: DigitalOrderStatus.PENDING })
    @Index()
    status: DigitalOrderStatus;

    /** The Vendure Order this digital order is linked to */
    @ManyToOne(() => Order, { onDelete: 'CASCADE', eager: false })
    @JoinColumn()
    order: Order;

    @Index()
    @Column()
    orderId: ID;

    /** Reason for failure if status is 'failed' */
    @Column({ type: 'text', nullable: true })
    failureReason: string | null;

    /** Keys assigned to this digital order */
    @OneToMany(() => DigitalProductKey, key => key.digitalOrder)
    keys: DigitalProductKey[];
}
