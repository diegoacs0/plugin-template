import {
    DeepPartial,
    HasCustomFields,
    ID,
    ProductVariant,
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
import { DeliveryType } from '../types';
import { DigitalProductKey } from './digital-product-key.entity';
import { DigitalProductMedia } from './digital-product-media.entity';

export class DigitalProductCustomFields {}

/**
 * A DigitalProduct is attached to a ProductVariant and defines how the
 * digital content is delivered: via file download, license key, or service session.
 */
@Entity()
export class DigitalProduct extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<DigitalProduct>) {
        super(input);
    }

    /** Human-readable name (e.g. "Premium License", "eBook PDF") */
    @Column()
    name: string;

    /** How this digital product is delivered */
    @Column({ type: 'varchar', default: DeliveryType.FILE })
    @Index()
    deliveryType: DeliveryType;

    /** HTML template for service/chat sessions (Eta syntax) */
    @Column({ type: 'text', nullable: true })
    chatTemplate: string | null;

    /** HTML template for post-purchase instructions (Eta syntax) */
    @Column({ type: 'text', nullable: true })
    instructionsTemplate: string | null;

    /** The ProductVariant this digital product is linked to */
    @Index()
    @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE', eager: false })
    @JoinColumn()
    productVariant: ProductVariant;

    @Column({ nullable: true })
    productVariantId: ID;

    /** License keys belonging to this digital product */
    @OneToMany(() => DigitalProductKey, key => key.digitalProduct)
    keys: DigitalProductKey[];

    /** Media files (downloads + previews) belonging to this digital product */
    @OneToMany(() => DigitalProductMedia, media => media.digitalProduct)
    medias: DigitalProductMedia[];

    @Column(type => DigitalProductCustomFields)
    customFields: DigitalProductCustomFields;
}
