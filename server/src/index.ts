import express from 'express'
import { getExchangeRate } from './integrations/currencyAdapter.ts'

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})