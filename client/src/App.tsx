
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminPage from './AdminPage'
import SearchPage from './SearchPage'
import CartPage from './CartPage.tsx'
import CheckoutPage from './CheckoutPage.tsx'
import CheckoutSuccessPage from './CheckoutSuccessPage'
import MyAccountPage from './MyAccountPage'
import Navbar from './Navbar'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/my-account" element={<MyAccountPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
