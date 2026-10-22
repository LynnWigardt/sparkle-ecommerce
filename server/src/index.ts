import express from 'express'
import { getExchangeRate } from './integrations/currencyAdapter.ts'
import { supabase } from './supabase.ts'
import { getSupplierCatalog } from './integrations/supplierAdapter.ts'
import { importSupplierProducts } from './integrations/productImport.ts'

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