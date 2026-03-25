import { gql } from 'graphql-tag';

// ─── Shared Types ────────────────────────────────────────────────────────────

const commonTypes = gql`
    enum DeliveryType {
        file
        key
        service
    }

    enum KeyStatus {
        available
        assigned
        revoked
    }

    enum MediaAccessLevel {
        main
        preview
    }

    enum DigitalOrderStatus {
        pending
        fulfilled
        failed
    }

    type DigitalProduct implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        deliveryType: DeliveryType!
        chatTemplate: String
        instructionsTemplate: String
        productVariant: ProductVariant!
        keys: [DigitalProductKey!]!
        medias: [DigitalProductMedia!]!
        availableKeyCount: Int!
    }

    type DigitalProductList implements PaginatedList {
        items: [DigitalProduct!]!
        totalItems: Int!
    }

    type DigitalProductKey implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        code: String!
        status: KeyStatus!
        digitalProduct: DigitalProduct!
        digitalOrder: DigitalOrder
    }

    type DigitalProductKeyList implements PaginatedList {
        items: [DigitalProductKey!]!
        totalItems: Int!
    }

    type DigitalProductMedia implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        accessLevel: MediaAccessLevel!
        fileUrl: String!
        fileName: String!
        mimeType: String!
        fileSize: Int
        downloadCount: Int!
    }

    type DigitalOrder implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        status: DigitalOrderStatus!
        order: Order!
        keys: [DigitalProductKey!]!
        failureReason: String
    }

    # Generated at run-time by Vendure
    input DigitalProductListOptions {
        skip: Int
        take: Int
    }
    input DigitalProductKeyListOptions {
        skip: Int
        take: Int
    }
`;

// ─── Admin API Extensions ────────────────────────────────────────────────────

export const adminApiExtensions = gql`
    ${commonTypes}

    input CreateDigitalProductInput {
        name: String!
        deliveryType: DeliveryType!
        productVariantId: ID!
        chatTemplate: String
        instructionsTemplate: String
    }

    input UpdateDigitalProductInput {
        id: ID!
        name: String
        deliveryType: DeliveryType
        chatTemplate: String
        instructionsTemplate: String
    }

    input AddDigitalProductKeysInput {
        digitalProductId: ID!
        keys: [String!]!
    }

    input CreateDigitalMediaInput {
        digitalProductId: ID!
        accessLevel: MediaAccessLevel!
        fileUrl: String!
        fileName: String!
        mimeType: String!
        fileSize: Int
    }

    extend type Query {
        digitalProduct(id: ID!): DigitalProduct
        digitalProducts(options: DigitalProductListOptions): DigitalProductList!
        digitalProductsByVariant(productVariantId: ID!): [DigitalProduct!]!
        digitalProductKeys(digitalProductId: ID!, options: DigitalProductKeyListOptions): DigitalProductKeyList!
        digitalOrder(id: ID!): DigitalOrder
        digitalOrderByOrderId(orderId: ID!): DigitalOrder
        failedDigitalOrders: [DigitalOrder!]!
    }

    extend type Mutation {
        createDigitalProduct(input: CreateDigitalProductInput!): DigitalProduct!
        updateDigitalProduct(input: UpdateDigitalProductInput!): DigitalProduct!
        deleteDigitalProduct(id: ID!): DeletionResponse!
        addDigitalProductKeys(input: AddDigitalProductKeysInput!): [DigitalProductKey!]!
        deleteDigitalProductKeys(ids: [ID!]!): DeletionResponse!
        createDigitalMedia(input: CreateDigitalMediaInput!): DigitalProductMedia!
        deleteDigitalMedia(ids: [ID!]!): DeletionResponse!
    }
`;

// ─── Shop API Extensions ─────────────────────────────────────────────────────

export const shopApiExtensions = gql`
    ${commonTypes}

    """
    A customer's purchased digital product with delivery information.
    """
    type CustomerDigitalProduct {
        digitalProduct: DigitalProduct!
        keys: [DigitalProductKey!]!
        downloadUrls: [String!]!
        serviceSessionUrl: String
        instructionsHtml: String
    }

    """
    A customer's digital order with all purchased digital products.
    """
    type CustomerDigitalOrder {
        digitalOrder: DigitalOrder!
        items: [CustomerDigitalProduct!]!
    }

    type DigitalProductPreview {
        id: ID!
        name: String!
        deliveryType: DeliveryType!
        previewMedias: [DigitalProductMedia!]!
    }

    extend type Query {
        """
        Get all digital orders for the active customer.
        """
        myDigitalOrders: [CustomerDigitalOrder!]!

        """
        Get a specific digital order by the Vendure Order ID.
        """
        myDigitalOrder(orderId: ID!): CustomerDigitalOrder

        """
        Get preview media for a digital product (public, no auth required for preview).
        """
        digitalProductPreview(digitalProductId: ID!): DigitalProductPreview
    }
`;
