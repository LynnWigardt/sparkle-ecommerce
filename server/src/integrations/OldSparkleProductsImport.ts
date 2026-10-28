import { supabase } from '../supabase.ts'
import { syncProductToAlgolia } from './algoliaAdapter.ts'

const oldSparkleProducts = [
  {
    article_number: 'OLD-004',
    category_id: 3,
    name: 'Celestial Orchid',
    description:
      'Ett extravagant guldring med färgstarka ädelstenar och detaljerat blomsterinspirerat filigran.',
    price: 18900,
    stock: 3,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/ring1.png',
  },
  {
    article_number: 'OLD-005',
    category_id: 3,
    name: 'Dragonfly Majesty',
    description:
      'En exklusiv guldring med ett färgstarkt trollsländemotiv och gnistrande stenar. Ett smycke med unik design.',
    price: 27500,
    stock: 2,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/ring2.png',
  },
  {
    article_number: 'OLD-006',
    category_id: 3,
    name: 'Ocean Coral',
    description:
      'En unik guldring med färgstarka stenar och ett organiskt motiv inspirerat av havets koraller.',
    price: 18900,
    stock: 4,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/ring3.png',
  },
  {
    article_number: 'OLD-007',
    category_id: 6,
    name: 'Stardust Cascade',
    description:
      'Ett dramatiskt halsband i guld med gnistrande stenar och ett elegant hängande mittparti.',
    price: 29900,
    stock: 2,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/necklace1.png',
  },
  {
    article_number: 'OLD-008',
    category_id: 6,
    name: 'Wild Garden',
    description:
      'Ett extravagant blomsterinspirerat halsband med färgstarka ädelstenar och detaljerat guldfiligran.',
    price: 24900,
    stock: 3,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/necklace2.png',
  },
  {
    article_number: 'OLD-009',
    category_id: 6,
    name: 'Lunar Bloom',
    description:
      'Ett exklusivt halsband med en stor färgad mittsten, omgiven av gnistrande detaljer och blommotiv.',
    price: 34900,
    stock: 2,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/necklace3.png',
  },
  {
    article_number: 'OLD-010',
    category_id: 4,
    name: 'Empress Cuff',
    description:
      'Ett kraftfullt guldfärgat cuff-armband med en stor ädelsten och detaljerade blomsterornament.',
    price: 27900,
    stock: 2,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/bracelet1.png',
  },
  {
    article_number: 'OLD-011',
    category_id: 4,
    name: 'Sapphire Wave',
    description:
      'Ett elegant armband med en lavendellila mittsten, färgstarka detaljer och dekorativt guldfiligran.',
    price: 21900,
    stock: 4,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/bracelet2.png',
  },
  {
    article_number: 'OLD-012',
    category_id: 4,
    name: 'Floral Fantasia',
    description:
      'Ett rikt dekorerat armband med färgstarka ädelstenar och ett detaljerat organiskt blomsterdesign.',
    price: 25900,
    stock: 3,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/bracelet3.png',
  },
  {
    article_number: 'OLD-013',
    category_id: 5,
    name: 'Baroque Pearls',
    description:
      'Eleganta statement-örhängen i guld med färgstarka stenar och dekorativa detaljer i barock stil.',
    price: 14900,
    stock: 3,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/earring1.png',
  },
  {
    article_number: 'OLD-014',
    category_id: 5,
    name: 'Sapphire Garden',
    description:
      'Extravaganta guldörhängen med gröna ädelstenar, färgstarka detaljer och ett rikt blomsterinspirerat motiv.',
    price: 17900,
    stock: 2,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/earring2.png',
  },
  {
    article_number: 'OLD-015',
    category_id: 5,
    name: 'Royal Cascade',
    description:
      'Ett par exklusiva guldörhängen med djupblå stenar, gnistrande detaljer och ett elegant hängande motiv.',
    price: 19900,
    stock: 3,
    image_url:
      'https://gzjsoypozrumdbqaguas.supabase.co/storage/v1/object/public/product-images/earring3.png',
  },
  {
    article_number: 'OLD-021',
    category_id: 3,
    name: 'TEst',
    description: 'Testbeskrivning',
    price: 234,
    stock: 23,
    image_url: null,
  },
]

export async function importOldSparkleProducts() {
  let inserted = 0
  const errors: { name: string; reason: string }[] = []

  for (const product of oldSparkleProducts) {
    const { data: existing, error: lookupError } = await supabase
      .from('products')
      .select('id')
      .eq('article_number', product.article_number)
      .maybeSingle()

    if (lookupError) {
      errors.push({
        name: product.name,
        reason: lookupError.message,
      })
      continue
    }

    if (existing) {
      errors.push({
        name: product.name,
        reason: 'Produkten finns redan och hoppades över.',
      })
      continue
    }

    const { error: saveError } = await supabase
      .from('products')
      .insert({
        ...product,
        ean: null,
        variants: [],
      })

    if (saveError) {
      errors.push({
        name: product.name,
        reason: saveError.message,
      })
      continue
    }

    try {
      await syncProductToAlgolia({
        article_number: product.article_number,
        name: product.name,
        price: product.price,
        stock: product.stock,
        ean: null,
        variants: [],
      })

      inserted++
    } catch (error) {
      errors.push({
        name: product.name,
        reason:
          error instanceof Error
            ? `Sparad i databasen, men Algolia misslyckades: ${error.message}`
            : 'Sparad i databasen, men Algolia misslyckades.',
      })
    }
  }

  return { inserted, errors }
}