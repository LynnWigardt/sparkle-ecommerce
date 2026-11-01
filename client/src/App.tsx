import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminPage from './AdminPage'
import SearchPage from './SearchPage'
import CartPage from './CartPage.tsx'
import CheckoutPage from './CheckoutPage.tsx'
import CheckoutSuccessPage from './CheckoutSuccessPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App