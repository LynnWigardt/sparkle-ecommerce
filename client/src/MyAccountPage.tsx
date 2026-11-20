
import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'

type OrderItem = {
  id: number
  product_name: string
  article_number: string
  quantity: number
  unit_price: number
}

type Order = {
  id: number
  total_amount: number
  currency: string
  status: string
  created_at: string
  shipping_method: string | null
  shipping_price: number | null
  items: OrderItem[]
}

function MyAccountPage() {
  const { customer, loading } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [error, setError] = useState('')

  // Hämtar kundens beställningar när inloggningen har kontrollerats.
  useEffect(() => {
    if (loading) return

    if (!customer) {
      setOrdersLoading(false)
      return
    }

    async function fetchOrders() {
      try {
        const response = await fetch('/api/auth/orders')

        if (!response.ok) {
          throw new Error('Kunde inte hämta dina beställningar.')
        }

        const data = await response.json()
        setOrders(data.orders)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Ett oväntat fel uppstod.'
        )
      } finally {
        setOrdersLoading(false)
      }
    }

    fetchOrders()
  }, [customer, loading])

  if (loading) {
    return <p>Hämtar dina uppgifter...</p>
  }

  if (!customer) {
    return <p>Du behöver logga in för att se Mina sidor.</p>
  }

  return (
    <main>
      <h1>Mina sidor</h1>

      <section>
        <h2>Mina kunduppgifter</h2>
        <p>Namn: {customer.name}</p>
        <p>E-post: {customer.email}</p>
      </section>

      <section>
        <h2>Mina beställningar</h2>

        {ordersLoading && <p>Hämtar dina beställningar...</p>}

        {error && <p>{error}</p>}

        {!ordersLoading && !error && orders.length === 0 && (
          <p>Du har inga tidigare beställningar.</p>
        )}

        {orders.map((order) => (
          <article key={order.id}>
            <h3>Ordernummer: {order.id}</h3>

            <p>
              Datum: {new Date(order.created_at).toLocaleDateString('sv-SE')}
            </p>

            <p>Status: {order.status}</p>

            <h4>Produkter</h4>

            {order.items.map((item) => (
              <p key={item.id}>
                {item.product_name} – {item.quantity} st
              </p>
            ))}

            <p>
              Totalt: {order.total_amount} {order.currency}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default MyAccountPage
