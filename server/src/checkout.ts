import Stripe from 'stripe'
import { Router } from 'express'
import stripe from './integrations/stripeAdapter.ts'
import { supabase } from './supabase.ts'

type CheckoutProduct = {
  article_number: string
  name: string
  price: number
  stock: number
}

const checkoutRouter = Router()

checkoutRouter.post('/api/checkout', async (req, res) => {

  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'Kundvagnen är tom.',
      })
      return
    }

    const validatedItems: { articleNumber: string; quantity: number }[] = []

    for (const item of items) {
      if (
        typeof item.articleNumber !== 'string' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        res.status(400).json({
          error: 'Ogiltiga produkter eller antal.',
        })
        return
      }

      validatedItems.push({
        articleNumber: item.articleNumber,
        quantity: item.quantity,
      })
    }

    const articleNumbers = validatedItems.map(
      (item) => item.articleNumber,
    )

    if (new Set(articleNumbers).size !== articleNumbers.length) {
      res.status(400).json({
        error: 'Varje produkt får bara förekomma en gång.',
      })
      return
    }
    const { data, error } = await supabase
    .from('products')
    .select('article_number, name, price, stock')
    .in('article_number', articleNumbers)

    if (error) {
    throw error
    }

    const products: CheckoutProduct[] = data ?? []

    if (!products || products.length !== validatedItems.length) {
      res.status(400).json({
        error: 'En eller flera produkter kunde inte hittas.',
      })
      return
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    for (const item of validatedItems) {
      const product = products.find(
        (product) => product.article_number === item.articleNumber,
      )

      if (!product) {
        res.status(400).json({ error: 'Produkten hittades inte.' })
        return
      }

      if (
        !Number.isFinite(Number(product.price)) ||
        Number(product.price) <= 0
      ) {
        res.status(400).json({
          error: `Produkten ${product.name} har ett ogiltigt pris.`,
        })
        return
      }

      if (item.quantity > product.stock) {
        res.status(400).json({
          error: `Otillräckligt lagersaldo för ${product.name}.`,
        })
        return
      }

      lineItems.push({
        price_data: {
          currency: 'sek',
          product_data: {
            name: product.name,
          },
          unit_amount: Math.round(Number(product.price) * 100),
        },
        quantity: item.quantity,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: 'http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173/checkout/cancel',
      metadata: {
        items: JSON.stringify(validatedItems),
      },
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Stripe Checkout-fel:', error)

    res.status(500).json({
      error: 'Kunde inte starta betalningen.',
    })
  }
})

export default checkoutRouter