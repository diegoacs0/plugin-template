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
import { MediaAccessLevel } from '../types';
import { DigitalProduct } from './digital-product.entity';

/**
 * A media file (downloadable or preview) attached to a DigitalProduct.
 */
@Entity()
export class DigitalProductMedia extends VendureEntity {
    constructor(input?: DeepPartial<DigitalProductMedia>) {
        super(input);
    }

    /** Access level: 'main' (private download) or 'preview' (public) */
    @Column({ type: 'varchar', default: MediaAccessLevel.MAIN })
    @Index()
    accessLevel: MediaAccessLevel;

    /** The URL or storage path of the file */
    @Column()
    fileUrl: string;

    /** Original file name */
    @Column()
    fileName: string;

    /** MIME type of the file */
    @Column()
    mimeType: string;

    /** File size in bytes (optional) */
    @Column({ type: 'int', nullable: true })
    fileSize: number | null;

    /** Number of times this file has been downloaded */
    @Column({ type: 'int', default: 0 })
    downloadCount: number;

    /** The digital product this media belongs to */
    @ManyToOne(() => DigitalProduct, dp => dp.medias, { onDelete: 'CASCADE' })
    @JoinColumn()
    digitalProduct: DigitalProduct;

    @Index()
    @Column()
    digitalProductId: ID;
}
