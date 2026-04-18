import gql from 'graphql-tag';

export const GET_MY_DIGITAL_ORDERS = gql`
    query MyDigitalOrders {
        myDigitalOrders {
            digitalOrder {
                id
                createdAt
                updatedAt
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
            items {
                digitalProduct {
                    id
                    name
                    deliveryType
                }
                keys {
                    id
                    code
                    status
                }
                downloadUrls
                serviceSessionUrl
                instructionsHtml
            }
        }
    }
`;

export const GET_MY_DIGITAL_ORDER = gql`
    query MyDigitalOrder($orderId: ID!) {
        myDigitalOrder(orderId: $orderId) {
            digitalOrder {
                id
                status
                failureReason
                order {
                    id
                    code
                }
            }
            items {
                digitalProduct {
                    id
                    name
                    deliveryType
                }
                keys {
                    id
                    code
                    status
                }
                downloadUrls
                serviceSessionUrl
                instructionsHtml
            }
        }
    }
`;

export const GET_DIGITAL_PRODUCT_PREVIEW = gql`
    query DigitalProductPreview($digitalProductId: ID!) {
        digitalProductPreview(digitalProductId: $digitalProductId) {
            id
            name
            deliveryType
            previewMedias {
                id
                fileUrl
                fileName
                mimeType
            }
        }
    }
`;