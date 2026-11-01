import { useSearchParams } from 'react-router-dom'

function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <main>
      <h1>Tack för din beställning!</h1>
      <p>Din betalning har skickats för kontroll.</p>
      <p>Orderstatus uppdateras när Stripe har bekräftat betalningen.</p>

      {sessionId && (
        <p>Betalningsreferens: {sessionId}</p>
      )}
    </main>
  )
}

export default CheckoutSuccessPage