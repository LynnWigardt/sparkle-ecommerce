import { useState } from 'react'

type CartItem = {
  articleNumber: string
  name: string
  price: number
  image_url: string | null
  quantity: number
}

function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('sparkle-cart')
    return savedCart ? JSON.parse(savedCart) : []
  })

  const updateCart = (items: CartItem[]) => {
    setCartItems(items)
    localStorage.setItem('sparkle-cart', JSON.stringify(items))
  }

  const updateQuantity = (articleNumber: string, quantity: number) => {
    if (quantity < 1) {
      updateCart(cartItems.filter(item => item.articleNumber !== articleNumber))
      return
    }

    updateCart(
      cartItems.map(item =>
        item.articleNumber === articleNumber
          ? { ...item, quantity }
          : item
      )
    )
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  if (cartItems.length === 0) {
    return (
      <main>
        <h1>Din kundvagn</h1>
        <p>Din kundvagn är tom.</p>
        <a href="/">Fortsätt handla</a>
      </main>
    )
  }

  return (
    <main>
      <h1>Din kundvagn</h1>

      {cartItems.map(item => (
        <div key={item.articleNumber}>
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.name}
              width="100"
            />
          )}

          <h2>{item.name}</h2>
          <p>{item.price} kr</p>

          <label>
            Antal:
            <input
              type="number"
              min="0"
              max="99"
              value={item.quantity}
              onChange={e =>
                updateQuantity(item.articleNumber, Number(e.target.value))
              }
            />
          </label>

          <p>
            Delsumma: {(item.price * item.quantity).toFixed(2)} kr
          </p>

          <button
            onClick={() =>
              updateCart(
                cartItems.filter(
                  cartItem => cartItem.articleNumber !== item.articleNumber
                )
              )
            }
          >
            Ta bort
          </button>
        </div>
      ))}

      <h2>Totalt: {total.toFixed(2)} kr</h2>

      <a href="/">Fortsätt handla</a>
      {' '}
      <a href="/checkout">Gå till kassan</a>
    </main>
  )
}

export default CartPage