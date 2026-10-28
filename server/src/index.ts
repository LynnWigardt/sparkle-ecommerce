import express from 'express'
import { getExchangeRate } from './integrations/currencyAdapter.ts'
import { supabase } from './supabase.ts'
import { getSupplierCatalog } from './integrations/supplierAdapter.ts'
import { importSupplierProducts } from './integrations/productImport.ts'
import { z } from 'zod'
import { searchClient, indexName } from './integrations/algoliaAdapter.ts'

const app = express()

app.use(express.json())

app.get('/api/currency', async (req, res) => {
  try {
    const from = String(req.query.from ?? 'SEK')
    const to = String(req.query.to ?? 'EUR')

    const rate = await getExchangeRate(from, to)

    res.json({
      from,
      to,
      rate,
    })
  } catch (error) {
    res.status(500).json({
      error: 'Could not fetch exchange rate',
    })
  }
})

const PORT = process.env.PORT ?? 3000

const searchSchema = z.object({
  q: z.string().trim().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

app.get('/api/search', async (req, res) => {
  const validation = searchSchema.safeParse(req.query)

  if (!validation.success) {
    res.status(400).json({
      error: 'Ogiltiga sökinställningar. Sidnumret måste vara minst 1 och högst 50 produkter per sida.',
    })
    return
  }

  const { q, page, pageSize } = validation.data

  try {
    const result = await searchClient.searchSingleIndex({
      indexName,
      searchParams: {
        query: q,
        page: page - 1,
        hitsPerPage: pageSize,
      },
    })

    res.json({
      query: q,
      products: result.hits,
      totalHits: result.nbHits,
      totalPages: result.nbPages,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('Algolia search failed:', error)

    res.status(500).json({
      error: 'Sökningen kunde tyvärr inte genomföras. Försök igen senare.',
    })
  }
})

app.get('/api/test-supabase', async (_req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')

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

app.get('/api/test-supplier', async (_req, res) => {
  try {
    const products = await getSupplierCatalog()

    res.json({
      success: true,
      count: products.length,
      products,
    })
  } catch (error) {
    console.error('Supplier test failed:', error)

    res.status(500).json({
      error: 'Could not fetch supplier products',
    })
  }
})


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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})