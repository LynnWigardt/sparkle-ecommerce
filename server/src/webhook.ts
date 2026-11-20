
import express, { Router, type Request, type Response } from 'express'
import Stripe from 'stripe'
import stripe from './integrations/stripeAdapter.ts'
import { supabase } from './supabase.ts'
import { sendOrderConfirmation } from './integrations/emailAdapter.ts'

const webhookRouter = Router()

webhookRouter.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      res.status(400).send('Webhook signature eller secret saknas.')
      return
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      )
    } catch (error) {
      console.error('Webhook-signaturen kunde inte verifieras:', error)
      res.status(400).send('Ogiltig webhook-signatur.')
      return
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session

          if (session.payment_status !== 'paid') {
            break
          }

          const orderId = session.client_reference_id

          if (!orderId) {
            throw new Error('Order-ID saknas i Stripe-sessionen.')
          }

          const { error: emailError } = await supabase
            .from('orders')
            .update({
              customer_email: session.customer_details?.email ?? null,
            })
            .eq('id', orderId)
            .eq('status', 'pending')

          if (emailError) throw emailError

          // Markerar ordern som betald och uppdaterar lagret
          const { data, error } = await supabase.rpc(
            'complete_order',
            { p_order_id: Number(orderId) }
          )

          if (error) throw error

          console.log(
            data
              ? `Order ${orderId} har betalats och lagret har uppdaterats.`
              : `Order ${orderId} var redan behandlad.`
          )

          // Skickar mejl endast när ordern behandlats första gången
          if (data) {
            try {
              // Hämtar orderuppgifterna
              const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('customer_id, customer_email, total_amount, currency')
                .eq('id', orderId)
                .single()

              if (orderError) throw orderError

              // Hämtar kundens namn om kunden är inloggad
              let customerName = session.customer_details?.name ?? 'Kund'

              if (order.customer_id) {
                const { data: customer, error: customerError } =
                  await supabase
                    .from('customers')
                    .select('name')
                    .eq('id', order.customer_id)
                    .single()

                if (customerError) throw customerError

                customerName = customer.name ?? customerName
              }

              // Hämtar produkterna i ordern
              const { data: products, error: productsError } =
                await supabase
                  .from('order_items')
                  .select('product_name, quantity, unit_price')
                  .eq('order_id', orderId)

              if (productsError) throw productsError

              const customerEmail =
                order.customer_email ?? session.customer_details?.email

              if (!customerEmail) {
                throw new Error('Kundens e-postadress saknas.')
              }

              if (!products || products.length === 0) {
                throw new Error('Ordern saknar produkter.')
              }

              // Skickar orderbekräftelsen
              await sendOrderConfirmation({
                orderId: Number(orderId),
                customerName,
                customerEmail,
                products,
                totalAmount: Number(order.total_amount),
                currency: order.currency,
              })

              console.log(
                `Orderbekräftelse har skickats för order ${orderId}.`
              )
            } catch (emailError) {
              // Ett mejlfel ska inte påverka den betalda ordern
              console.error(
                `Kunde inte skicka orderbekräftelse för order ${orderId}:`,
                emailError
              )
            }
          }

          break
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session
          const orderId = session.client_reference_id

          if (!orderId) {
            throw new Error('Order-ID saknas i Stripe-sessionen.')
          }

          const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('status', 'pending')

          if (error) throw error

          console.log(`Order ${orderId} har avbrutits.`)
          break
        }

        default:
          console.log('Stripe-händelse ignorerad:', event.type)
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Fel vid hantering av Stripe-webhook:', error)

      res.status(500).json({
        error: 'Webhook-hanteringen misslyckades.',
      })
    }
  }
)

export default webhookRouter
