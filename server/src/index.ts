import express from 'express'
import { z } from 'zod'
import { getExchangeRate } from './integrations/currencyAdapter.ts'
import { supabase } from './supabase.ts'
import { getSupplierCatalog } from './integrations/supplierAdapter.ts'
import { importSupplierProducts } from './integrations/productImport.ts'
import checkoutRouter from './checkout.ts'
import {
  importOldSparkleProducts,
  syncOldSparkleProductsToAlgolia,
} from './integrations/OldSparkleProductsImport.ts'
import {
  searchClient,
  indexName,
  deleteProductFromAlgolia,
  syncProductToAlgolia,
  configureSortIndexes,
} from './integrations/algoliaAdapter.ts'

const app = express()
app.use(express.json())

app.use(checkoutRouter)

const PORT = process.env.PORT ?? 3000

const productSchema = z.object({
  name: z.string().trim().min(1, 'Produktnamn måste anges').max(200),
  description: z.string().trim().max(5000).nullable(),
  price: z.number().finite().nonnegative(),
  stock: z.number().int().nonnegative(),
  image_url: z.string().trim().url().nullable().or(z.literal('')),
  category_id: z.number().int().positive().nullable(),
  ean: z.string().trim().nullable(),
  variants: z.array(z.string()),
})

// Valutakurs
app.get('/api/currency', async (req, res) => {
  try {
    const from = String(req.query.from ?? 'SEK')
    const to = String(req.query.to ?? 'EUR')
    const rate = await getExchangeRate(from, to)
    res.json({ from, to, rate })
  } catch (error) {
    console.error('Currency request failed:', error)
    res.status(500).json({ error: 'Could not fetch exchange rate' })
  }
})

// Produktsökning med filter, sortering och paginering
const searchSchema = z.object({
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  categoryId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'name_asc'])
    .default('relevance'),
}).refine(
  (values) =>
    values.minPrice === undefined ||
    values.maxPrice === undefined ||
    values.minPrice <= values.maxPrice,
  {
    message: 'Minimipriset kan inte vara högre än maxpriset.',
    path: ['minPrice'],
  },
)

app.get('/api/search', async (req, res) => {
  const validation = searchSchema.safeParse(req.query)

  if (!validation.success) {
    res.status(400).json({
      error: 'Ogiltiga sökparametrar.',
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  const { q, page, pageSize, categoryId, minPrice, maxPrice, sort } =
    validation.data

  const filters: string[] = []

  if (categoryId !== undefined) {
    filters.push(`category_id:${categoryId}`)
  }

  if (minPrice !== undefined) {
    filters.push(`price >= ${minPrice}`)
  }

  if (maxPrice !== undefined) {
    filters.push(`price <= ${maxPrice}`)
  }

  const sortIndexes: Record<string, string> = {
    relevance: indexName,
    price_asc: `${indexName}_price_asc`,
    price_desc: `${indexName}_price_desc`,
    name_asc: `${indexName}_name_asc`,
  }

  try {
    const selectedIndex = sortIndexes[sort]

    const result = await searchClient.searchSingleIndex({
      indexName: selectedIndex,
      searchParams: {
        query: q,
        page: page - 1,
        hitsPerPage: pageSize,
        ...(filters.length > 0 ? { filters: filters.join(' AND ') } : {}),
      },
    })

    res.json({
      query: q,
      products: result.hits,
      totalHits: result.nbHits,
      totalPages: result.nbPages,
      page,
      pageSize,
      filters: {
        categoryId: categoryId ?? null,
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
      },
      sort,
    })
  } catch (error) {
    console.error('Algolia search failed:', error)
    res.status(500).json({
      error:
        'Sökningen misslyckades. Kontrollera Algolias indexinställningar och försök igen.',
    })
  }
})

// Hämta kategorier till sökfiltren
app.get('/api/categories', async (_req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Could not fetch categories:', error)
    res.status(500).json({ error: 'Kunde inte hämta kategorier.' })
    return
  }

  res.json({ categories: data })
})


// Hämta produkter från databasen
app.get('/api/products', async (_req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select(
      'article_number, name, description, category_id, image_url, price, stock, ean, variants',
    )
    .order('name', { ascending: true })

  if (error) {
    console.error('Could not fetch products:', error)
    res.status(500).json({ error: 'Kunde inte hämta produkterna.' })
    return
  }

  res.json({ products: data })
})

// Uppdatera produkt i databasen och synka till Algolia
app.put('/api/products/:articleNumber', async (req, res) => {
  const articleNumber = req.params.articleNumber
  const validation = productSchema.safeParse(req.body)

  if (!validation.success) {
    res.status(400).json({
      error: 'Produktinformationen är ogiltig.',
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  const product = validation.data

  const { data, error } = await supabase
    .from('products')
    .update({
      name: product.name,
      description: product.description || null,
      category_id: product.category_id,
      image_url: product.image_url || null,
      price: product.price,
      stock: product.stock,
      ean: product.ean || null,
      variants: product.variants,
      updated_at: new Date().toISOString(),
    })
    .eq('article_number', articleNumber)
    .select(
      'article_number, name, description, category_id, image_url, price, stock, ean, variants',
    )
    .maybeSingle()

  if (error) {
    console.error('Could not update product:', error)
    res.status(500).json({ error: 'Kunde inte spara produkten i databasen.' })
    return
  }

  if (!data) {
    res.status(404).json({ error: 'Produkten hittades inte.' })
    return
  }

  try {
    await syncProductToAlgolia({
      article_number: data.article_number,
      name: data.name,
      description: data.description,
      category_id: data.category_id,
      image_url: data.image_url,
      price: Number(data.price),
      stock: data.stock,
      ean: data.ean,
      variants: data.variants ?? [],
    })

    res.json({
      success: true,
      message: 'Produkten har uppdaterats och synkats till sökindexet.',
      product: data,
    })
  } catch (error) {
    console.error(
      `Produkten ${articleNumber} sparades i databasen men kunde inte synkas till Algolia:`,
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Produkten sparades i databasen, men sökindexet kunde inte uppdateras.',
    })
  }
})

// Testa Supabase
app.get('/api/test-supabase', async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true, categories: data })
})

app.post('/api/test-supabase', async (_req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: 'Testkategori' })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true, category: data })
})

// Testa leverantörsdata
app.get('/api/test-supplier', async (_req, res) => {
  try {
    const products = await getSupplierCatalog()
    res.json({ success: true, count: products.length, products })
  } catch (error) {
    console.error('Supplier test failed:', error)
    res.status(500).json({ error: 'Could not fetch supplier products' })
  }
})

// Importera produkter från leverantören
app.post('/api/import-products', async (req, res) => {
  const format = req.query.format === 'xml' ? 'xml' : 'csv'

  try {
    const result = await importSupplierProducts(format)
    res.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    res.status(500).json({ success: false, error: message })
  }
})

// Ta bort produkt från databas och Algolia
app.delete('/api/products/:articleNumber', async (req, res) => {
  const articleNumber = req.params.articleNumber

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('article_number', articleNumber)
    .select('article_number')

  if (error) {
    console.error('Could not delete product:', error)
    res.status(500).json({
      error: 'Kunde inte ta bort produkten från databasen.',
    })
    return
  }

  if (!data || data.length === 0) {
    res.status(404).json({ error: 'Produkten hittades inte.' })
    return
  }

  try {
    await deleteProductFromAlgolia(articleNumber)
    res.json({ success: true, message: 'Produkten har tagits bort.' })
  } catch (error) {
    console.error(
      `Produkten ${articleNumber} togs bort från databasen men inte från Algolia:`,
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Produkten togs bort från databasen, men sökindexet kunde inte uppdateras.',
    })
  }
})

// Importera gamla Sparkle-produkter
app.post('/api/import-old-sparkle-products', async (_req, res) => {
  try {
    const result = await importOldSparkleProducts()
    res.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    res.status(500).json({ success: false, error: message })
  }
})

// Synka gamla Sparkle-produkter till Algolia
app.post('/api/sync-old-sparkle-to-algolia', async (_req, res) => {
  try {
    const result = await syncOldSparkleProductsToAlgolia()
    res.json({ success: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Ett okänt fel inträffade'
    res.status(500).json({ success: false, error: message })
  }
})

async function startServer() {
  try {
    await configureSortIndexes()

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log('Algolia sorteringsindex är konfigurerade.')
    })
  } catch (error) {
    console.error('Kunde inte konfigurera Algolias sorteringsindex:', error)
    process.exit(1)
  }
}

startServer()