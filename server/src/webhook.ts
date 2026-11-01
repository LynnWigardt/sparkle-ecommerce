import express, { Router, type Request, type Response } from 'express'
import Stripe from 'stripe'
import stripe from './integrations/stripeAdapter.ts'
import { supabase } from './supabase.ts'

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