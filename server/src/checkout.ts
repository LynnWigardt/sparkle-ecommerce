import Stripe from 'stripe'
import { Router } from 'express'
import stripe from './integrations/stripeAdapter.ts'
import { supabase } from './supabase.ts'
import { findServicePoints } from './integrations/shippingAdapter.ts'

type CheckoutProduct = {
  article_number: string
  name: string
  price: number
  stock: number
}

// Funktionen räknar i ören
function calculateShippingPrice(orderTotal: number, shippingMethod: string) {
  if (orderTotal >= 50000) return 0

  if (shippingMethod === 'service_point') return 5900
  if (shippingMethod === 'home_delivery') return 9900

  throw new Error('Ogiltigt leveranssätt.')
}

const checkoutRouter = Router()

checkoutRouter.post('/api/checkout/shipping-price', async (req, res) => {
  try {
    const { items, shippingMethod } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Kundvagnen är tom.' })
      return
    }

    if (!['service_point', 'home_delivery'].includes(shippingMethod)) {
      res.status(400).json({ error: 'Ogiltigt leveranssätt.' })
      return
    }

    let totalAmount = 0

    for (const item of items) {
      if (
        typeof item.articleNumber !== 'string' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        res.status(400).json({ error: 'Ogiltiga produkter eller antal.' })
        return
      }

      const { data: product, error } = await supabase
        .from('products')
        .select('article_number, price')
        .eq('article_number', item.articleNumber)
        .maybeSingle()

      if (error) throw error

      if (!product || !Number.isFinite(Number(product.price))) {
        res.status(400).json({ error: 'En produkt kunde inte hittas.' })
        return
      }

      totalAmount += Math.round(Number(product.price) * 100) * item.quantity
    }

    const shippingPrice = calculateShippingPrice(totalAmount, shippingMethod)

    res.json({
      shippingPrice: shippingPrice / 100,
    })
  } catch (error) {
    console.error('Kunde inte beräkna fraktpris:', error)

    res.status(500).json({
      error: 'Kunde inte beräkna fraktpriset just nu.',
    })
  }
})

checkoutRouter.post('/api/checkout', async (req, res) => {
  let orderId: number | null = null

  try {
    const { items, shippingMethod, postalCode, servicePointId } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Kundvagnen är tom.' })
      return
    }

    if (!['service_point', 'home_delivery'].includes(shippingMethod)) {
  res.status(400).json({ error: 'Välj ett giltigt leveranssätt.' })
  return
}

const normalizedPostalCode = String(postalCode ?? '').replace(/\s/g, '')

//Om postnumret INTE består av fem siffror skickas felmeddelande och avbryts
if (!/^\d{5}$/.test(normalizedPostalCode)) {
  res.status(400).json({ error: 'Ange ett giltigt postnummer.' })
  return
}

let selectedServicePoint = null

if (shippingMethod === 'service_point') {
  if (typeof servicePointId !== 'string' || !servicePointId) {
    res.status(400).json({ error: 'Välj ett utlämningsställe.' })
    return
  }

  try {
    const servicePoints = await findServicePoints(normalizedPostalCode)

    selectedServicePoint = servicePoints.find(
      point => point.id === servicePointId
    )

    if (!selectedServicePoint) {
      res.status(400).json({ error: 'Det valda utlämningsstället är inte giltigt.' })
      return
    }
  } catch {
    res.status(502).json({
      error: 'Kunde inte kontrollera utlämningsstället hos PostNord. Försök igen.',
    })
    return
  }
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

    const shippingPrice = calculateShippingPrice(totalAmount, shippingMethod)
    totalAmount += shippingPrice

    if (shippingPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'sek',
        product_data: {
          name: shippingMethod === 'service_point'
            ? 'Frakt till PostNord-ombud'
            : 'Hemleverans',
        },
        unit_amount: shippingPrice,
      },
      quantity: 1,
    })
  }

    // Skapar ordern i Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: totalAmount,
        currency: 'sek',
        status: 'pending',
        shipping_method: shippingMethod,
        shipping_price: shippingPrice,
        service_point_id: selectedServicePoint?.id ?? null,
        service_point_name: selectedServicePoint?.name ?? null,
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
  expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  line_items: lineItems,

  client_reference_id: String(order.id),

      success_url:
        'http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}',

      cancel_url:
        'http://localhost:5173/checkout/cancel',

      metadata: {
        order_id: String(order.id),
      },
    })


    console.log('Skapad Checkout-session:', session.id);



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

  res.status(502).json({
    error: 'Betalningstjänsten är för tillfället otillgänglig. Försök igen senare.',
  })
  }
})

// Hämtar orderstatus efter betalning
checkoutRouter.get('/api/checkout/status', async (req, res) => {
  try {
    const sessionId = req.query.session_id

    if (typeof sessionId !== 'string' || !sessionId) {
      res.status(400).json({
        error: 'Session-ID saknas.',
      })
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .eq('stripe_session_id', sessionId)
      .single()

    if (error || !data) {
      res.status(404).json({
        error: 'Ordern kunde inte hittas.',
      })
      return
    }

    res.json({
      status: data.status,
    })
  } catch (error) {
    console.error('Kunde inte hämta orderstatus:', error)

    res.status(500).json({
      error: 'Kunde inte hämta orderstatus.',
    })
  }
})

export default checkoutRouter