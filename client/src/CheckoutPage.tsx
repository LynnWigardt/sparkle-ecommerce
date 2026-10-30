import { useState } from 'react'

function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePayment() {
    setLoading(true)
    setError('')

    try {
      const cart = JSON.parse(localStorage.getItem('sparkle-cart') || '[]')

      if (cart.length === 0) {
        throw new Error('Din kundvagn är tom.')
      }

      const items = cart.map((item: {
        articleNumber: string
        quantity: number
      }) => ({
        articleNumber: item.articleNumber,
        quantity: item.quantity,
      }))

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Betalningen kunde inte startas.')
      }

      if (!data.url) {
        throw new Error('Ingen betalningslänk returnerades.')
      }

      window.location.href = data.url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Något gick fel.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>Kassan</h1>

      {error && <p role="alert">{error}</p>}

      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Startar betalning...' : 'Betala med Stripe'}
      </button>

      <p>
        <a href="/cart">Tillbaka till kundvagnen</a>
      </p>
    </main>
  )
}

export default CheckoutPage