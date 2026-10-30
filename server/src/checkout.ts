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
  let orderId: number | null = null

  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Kundvagnen är tom.' })
      return
    }

    const validatedItems: {
      articleNumber: string
      quantity: number
    }[] = []

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
      item => item.articleNumber
    )

    if (new Set(articleNumbers).size !== articleNumbers.length) {
      res.status(400).json({
        error: 'Varje produkt får bara förekomma en gång.',
      })
      return
    }

    // Hämtar produkterna från Supabase
    const { data, error } = await supabase
      .from('products')
      .select('article_number, name, price, stock')
      .in('article_number', articleNumbers)

    if (error) throw error

    const products: CheckoutProduct[] = data ?? []

    if (products.length !== validatedItems.length) {
      res.status(400).json({
        error: 'En eller flera produkter kunde inte hittas.',
      })
      return
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    const orderItems = []

    let totalAmount = 0

    for (const item of validatedItems) {
      const product = products.find(
        product => product.article_number === item.articleNumber
      )

      if (!product) {
        res.status(400).json({
          error: 'Produkten hittades inte.',
        })
        return
      }

      if (
        !Number.isFinite(Number(product.price)) ||
        Number(product.price) <= 0
      ) {
        res.status(400).json({
          error: `Ogiltigt pris för ${product.name}.`,
        })
        return
      }

      if (item.quantity > product.stock) {
        res.status(400).json({
          error: `Otillräckligt lagersaldo för ${product.name}.`,
        })
        return
      }

      const unitPrice = Math.round(Number(product.price) * 100)

      totalAmount += unitPrice * item.quantity

      lineItems.push({
        price_data: {
          currency: 'sek',
          product_data: {
            name: product.name,
          },
          unit_amount: unitPrice,
        },
        quantity: item.quantity,
      })

      orderItems.push({
        article_number: product.article_number,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
      })
    }

    // Skapar ordern i Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: totalAmount,
        currency: 'sek',
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    orderId = order.id

    // Sparar produkterna i order_items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderItems.map(item => ({
          ...item,
          order_id: order.id,
        }))
      )

    if (itemsError) throw itemsError

    // Skapar Stripe Checkout-sessionen
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,

      success_url:
        'http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}',

      cancel_url:
        'http://localhost:5173/checkout/cancel',

      metadata: {
        order_id: String(order.id),
      },
    })

    // Sparar Stripe-sessionens ID på ordern
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_session_id: session.id,
      })
      .eq('id', order.id)

    if (updateError) throw updateError

    res.json({ url: session.url })

  } catch (error) {
    console.error('Stripe Checkout-fel:', error)

    // Tar bort ordern om grejjer blir fel
    if (orderId !== null) {
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
    }

    res.status(500).json({
      error: 'Kunde inte starta betalningen.',
    })
  }
})

export default checkoutRouter