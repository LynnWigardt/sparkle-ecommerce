import { algoliasearch } from 'algoliasearch'

const appId = process.env.ALGOLIA_APP_ID
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY
const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY

if (!appId || !adminApiKey || !searchApiKey) {
  throw new Error('Algolia-miljövariabler saknas i serverns .env')
}

const adminClient = algoliasearch(appId, adminApiKey)
const searchClient = algoliasearch(appId, searchApiKey)

const indexName = 'sparkle_products'

export { adminClient, searchClient, indexName }

export async function syncProductToAlgolia(product: {
  article_number: string
  name: string
  price: number
  stock: number
  ean: string | null
  variants: string[]
}) {
  await adminClient.saveObject({
    indexName,
    body: {
      objectID: product.article_number,
      name: product.name,
      price: product.price,
      stock: product.stock,
      ean: product.ean,
      variants: product.variants,
    },
  })
}

export async function deleteProductFromAlgolia(articleNumber: string) {
  await adminClient.deleteObject({
    indexName,
    objectID: articleNumber,
  })
}