import { useState } from 'react'

type ServicePoint = {
  id: string
  name: string
  address: string
}

function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [shippingMethod, setShippingMethod] = useState('service_point')
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([])
  const [servicePointId, setServicePointId] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryTimeLoading, setDeliveryTimeLoading] = useState(false)
  const [deliveryTimeError, setDeliveryTimeError] = useState('')
  const [shippingPrice, setShippingPrice] = useState<number | null>(null)

  async function handleFindServicePoints() {
    setError('')
    setServicePoints([])
    setServicePointId('')
    setDeliveryTime('')
    setDeliveryTimeError('')

    const normalizedPostalCode = postalCode.replace(/\s/g, '')

    if (!/^\d{5}$/.test(normalizedPostalCode)) {
      setError('Ange ett giltigt postnummer med fem siffror.')
      return
    }

    try {
      const response = await fetch(
        `/api/shipping/service-points?postalCode=${normalizedPostalCode}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta ombud.')
      }

      setServicePoints(data.servicePoints)
    } catch {
      setError('Det gick inte att hämta PostNord-ombud just nu.')
    }
  }

  async function handleCalculateShipping(method: string) {
  setShippingPrice(null)
  setError('')

  try {
    const cart = JSON.parse(localStorage.getItem('sparkle-cart') || '[]')

    const items = cart.map((item: {
      articleNumber: string
      quantity: number
    }) => ({
      articleNumber: item.articleNumber,
      quantity: item.quantity,
    }))

    const response = await fetch('/api/checkout/shipping-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items, shippingMethod: method }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Kunde inte beräkna frakten.')
    }

    setShippingPrice(data.shippingPrice)
  } catch (err) {
    setError(
      err instanceof Error ? err.message : 'Kunde inte beräkna frakten.'
    )
  }
}

  async function handleSelectServicePoint(id: string) {
    setServicePointId(id)
    setDeliveryTime('')
    setDeliveryTimeError('')

    if (!id) {
      return
    }

    setDeliveryTimeLoading(true)

    try {
      const normalizedPostalCode = postalCode.replace(/\s/g, '')

      const params = new URLSearchParams({
        postalCode: normalizedPostalCode,
        servicePointId: id,
      })

      const response = await fetch(
        `/api/shipping/delivery-time?${params}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta leveranstid.')
      }

      setDeliveryTime(data.deliveryTime.estimate)
    } catch (err) {
      setDeliveryTimeError(
        err instanceof Error
          ? err.message
          : 'Det gick inte att hämta leveranstiden.'
      )
    } finally {
      setDeliveryTimeLoading(false)
    }
  }

  async function handlePayment() {
    setLoading(true)
    setError('')

    try {
      const cart = JSON.parse(localStorage.getItem('sparkle-cart') || '[]')

      if (cart.length === 0) {
        throw new Error('Din kundvagn är tom.')
      }

      if (shippingMethod === 'service_point' && !servicePointId) {
        throw new Error('Välj ett PostNord-ombud.')
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
        body: JSON.stringify({
          items,
          shippingMethod,
          postalCode: postalCode.replace(/\s/g, ''),
          servicePointId,
        }),
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

      <h2>Välj leveranssätt</h2>

      <label>
        <input
          type="radio"
          name="shippingMethod"
          value="service_point"
          checked={shippingMethod === 'service_point'}
         onChange={() => {
          setShippingMethod('service_point')
          setServicePointId('')
          handleCalculateShipping('service_point')
        }}
        />
        PostNord-ombud
      </label>

      <label>
        <input
          type="radio"
          name="shippingMethod"
          value="home_delivery"
          checked={shippingMethod === 'home_delivery'}
          onChange={() => {
            setShippingMethod('home_delivery')
            setServicePointId('')
            handleCalculateShipping('home_delivery')
          }}
        />
        Hemleverans
      </label>

        {shippingPrice !== null && (
          <p>
            <strong>
              Fraktkostnad: {shippingPrice === 0 ? 'Fri frakt' : `${shippingPrice} kr`}
            </strong>
          </p>
        )}

      <div>
        <label htmlFor="postalCode">Postnummer</label>
        <input
          id="postalCode"
          type="text"
          value={postalCode}
          onChange={(event) => {
            setPostalCode(event.target.value)
            setServicePoints([])
            setServicePointId('')
            setDeliveryTime('')
            setDeliveryTimeError('')
          }}
          placeholder="Exempel: 24541"
        />
      </div>

      {shippingMethod === 'service_point' && (
        <>
          <button type="button" onClick={handleFindServicePoints}>
            Hämta PostNord-ombud
          </button>

          {servicePoints.length > 0 && (
            <div>
              <label htmlFor="servicePoint">Välj ombud</label>

              <select
                id="servicePoint"
                value={servicePointId}
                onChange={(event) =>
                  handleSelectServicePoint(event.target.value)
                }
              >
                <option value="">Välj ett ombud</option>

                {servicePoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name} – {point.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {deliveryTimeLoading && (
            <p>Hämtar beräknad leveranstid...</p>
          )}

          {deliveryTime && (
            <p>
              <strong>{deliveryTime}</strong>
            </p>
          )}

          {deliveryTimeError && (
            <p role="alert">{deliveryTimeError}</p>
          )}
        </>
      )}

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