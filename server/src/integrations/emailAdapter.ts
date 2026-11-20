import { Resend } from 'resend'
import { z } from 'zod'

// Hämtar miljövariablerna
const apiKey = process.env.RESEND_API_KEY ?? ''
const emailFrom = process.env.EMAIL_FROM ?? ''

// Kontrollerar att miljövariablerna finns
if (!apiKey.trim()) {
  throw new Error('RESEND_API_KEY saknas i miljövariablerna.')
}

if (!emailFrom.trim()) {
  throw new Error('EMAIL_FROM saknas i miljövariablerna.')
}

// Skapar Resendinstansen och validerar för att kunna skicka mejlet.
const resend = new Resend(apiKey)

const resendResponseSchema = z.object({
  id: z.string().min(1),
})

// Vilken/vilka produkter som ska visas i orderbekräftelsen.
type OrderProduct = {
  product_name: string
  quantity: number
  unit_price: number
}

// Vilken information ordern ska innehålla.
type OrderConfirmation = {
  orderId: number
  customerName: string
  customerEmail: string
  products: OrderProduct[]
  totalAmount: number
  currency: string
}

// Gör kundens namn och produkter säkra att visa i mejlet.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[character]
  })
}

// Skickar orderbekräftelse via Resend.
export async function sendOrderConfirmation(order: OrderConfirmation) {
  const safeName = escapeHtml(order.customerName)

  const productHtml = order.products
    .map(product => {
      const safeProductName = escapeHtml(product.product_name)
      const price = (product.unit_price / 100).toFixed(2)

      return `
        <tr>
          <td>${safeProductName}</td>
          <td>${product.quantity} st</td>
          <td>${price} ${order.currency.toUpperCase()}</td>
        </tr>
      `
    })
    .join('')

  const productText = order.products
    .map(product =>
      `${product.product_name} – ${product.quantity} st – ${(product.unit_price / 100).toFixed(2)} ${order.currency.toUpperCase()}`
    )
    .join('\n')

   // Skapar mejlet till kunden med orderbekräftelse 
  const total = (order.totalAmount / 100).toFixed(2)
  const subject = `Orderbekräftelse – ordernummer ${order.orderId}`

  const html = `
    <h1>Tack för din beställning, ${safeName}!</h1>
    <p>Vi har tagit emot din betalning.</p>
    <h2>Ordernummer: ${order.orderId}</h2>
    <table>
      <thead>
        <tr>
          <th>Produkt</th>
          <th>Antal</th>
          <th>Pris</th>
        </tr>
      </thead>
      <tbody>
        ${productHtml}
      </tbody>
    </table>
    <h3>Totalt: ${total} ${order.currency.toUpperCase()}</h3>
    <p>Tack för att du handlar hos Sparkle Jewellery!</p>
  `

  const text = `
Tack för din beställning, ${order.customerName}!

Ordernummer: ${order.orderId}

Produkter:
${productText}

Totalt: ${total} ${order.currency.toUpperCase()}

Tack för att du handlar hos Sparkle Jewellery!
  `

  // Avbryter anropet om Resend inte svarar inom 5 sekunder
  const timeoutSignal = AbortSignal.timeout(5000)

  const response = await resend.emails.send(
    {
      from: emailFrom,
      to: order.customerEmail,
      subject,
      html,
      text,
    },
    {
      idempotencyKey: `order-confirmation/${order.orderId}`,
      signal: timeoutSignal,
    }
  )

  if (response.error) {
    throw new Error('Kunde inte skicka orderbekräftelsen.')
  }

  const validatedResponse = resendResponseSchema.safeParse(response.data)

  if (!validatedResponse.success) {
    throw new Error('Resend returnerade ett oväntat svar.')
  }

  return validatedResponse.data
}
