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

const sortIndexes = {
  priceAscending: `${indexName}_price_asc`,
  priceDescending: `${indexName}_price_desc`,
  nameAscending: `${indexName}_name_asc`,
}

export { adminClient, searchClient, indexName, sortIndexes }

/**
 * Konfigurerar huvudindexets sorteringskopior.
 * Algolia håller kopiorna synkroniserade med huvudindexet.
 */
export async function configureSortIndexes() {
  await adminClient.setSettings({
    indexName,
    indexSettings: {
      replicas: [
        sortIndexes.priceAscending,
        sortIndexes.priceDescending,
        sortIndexes.nameAscending,
      ],
    },
  })

  await Promise.all([
    adminClient.setSettings({
      indexName: sortIndexes.priceAscending,
      indexSettings: {
        ranking: [
          'asc(price)',
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
      },
    }),

    adminClient.setSettings({
      indexName: sortIndexes.priceDescending,
      indexSettings: {
        ranking: [
          'desc(price)',
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
      },
    }),

    adminClient.setSettings({
      indexName: sortIndexes.nameAscending,
      indexSettings: {
        ranking: [
          'asc(name)',
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom',
        ],
      },
    }),
  ])
}

export async function syncProductToAlgolia(product: {
  article_number: string
  name: string
  description: string | null
  category_id: number | null
  image_url: string | null
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
      description: product.description,
      category_id: product.category_id,
      image_url: product.image_url,
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