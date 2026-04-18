import gql from 'graphql-tag';

export const GET_DIGITAL_PRODUCTS = gql`
    query GetDigitalProducts($options: DigitalProductListOptions) {
        digitalProducts(options: $options) {
            items {
                id
                name
                deliveryType
                availableKeyCount
                productVariant {
                    id
                    name
                }
            }
            totalItems
        }
    }
`;

export const GET_DIGITAL_PRODUCT = gql`
    query GetDigitalProduct($id: ID!) {
        digitalProduct(id: $id) {
            id
            name
            deliveryType
            chatTemplate
            instructionsTemplate
            availableKeyCount
            productVariant {
                id
                name
            }
            keys {
                id
                code
                status
            }
        }
    }
`;

export const CREATE_DIGITAL_PRODUCT = gql`
    mutation CreateDigitalProduct($input: CreateDigitalProductInput!) {
        createDigitalProduct(input: $input) {
            id
            name
            deliveryType
        }
    }
`;

export const UPDATE_DIGITAL_PRODUCT = gql`
    mutation UpdateDigitalProduct($input: UpdateDigitalProductInput!) {
        updateDigitalProduct(input: $input) {
            id
            name
            deliveryType
        }
    }
`;

export const DELETE_DIGITAL_PRODUCT = gql`
    mutation DeleteDigitalProduct($id: ID!) {
        deleteDigitalProduct(id: $id) {
            result
        }
    }
`;

export const ADD_DIGITAL_PRODUCT_KEYS = gql`
    mutation AddDigitalProductKeys($input: AddDigitalProductKeysInput!) {
        addDigitalProductKeys(input: $input) {
            id
            code
            status
        }
    }
`;

export const DELETE_DIGITAL_PRODUCT_KEYS = gql`
    mutation DeleteDigitalProductKeys($ids: [ID!]!) {
        deleteDigitalProductKeys(ids: $ids) {
            result
        }
    }
`;

export const GET_DIGITAL_ORDER_BY_ORDER_ID = gql`
    query GetDigitalOrderByOrderId($orderId: ID!) {
        digitalOrderByOrderId(orderId: $orderId) {
            id
            status
            failureReason
            order {
                id
                code
            }
            keys {
                id
                code
                status
            }
        }
    }
`;

export const GET_FAILED_DIGITAL_ORDERS = gql`
    query GetFailedDigitalOrders {
        failedDigitalOrders {
            id
            status
            failureReason
            order {
                id
                code
            }
        }
    }
`;