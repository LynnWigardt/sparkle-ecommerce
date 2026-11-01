import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setError('Betalningsreferens saknas.')
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error)
        }

        setStatus(data.status)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Kunde inte hämta orderstatus.'
        )
      }
    }

    fetchStatus()
  }, [sessionId])

  return (
    <main>
      <h1>Tack för din beställning!</h1>

      {error && <p>{error}</p>}

      {status === 'pending' && (
        <p>Din betalning inväntar bekräftelse från Stripe.</p>
      )}

      {status === 'paid' && (
        <p>Din betalning är genomförd!</p>
      )}

      {status === 'cancelled' && (
        <p>Din beställning har avbrutits.</p>
      )}

      {status && !['pending', 'paid', 'cancelled'].includes(status) && (
        <p>Orderstatus: {status}</p>
      )}
    </main>
  )
}

export default CheckoutSuccessPage