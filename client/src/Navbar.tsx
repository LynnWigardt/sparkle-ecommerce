import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useState, useEffect } from 'react'
import '../../css/style.css'

// Hämtar kundens inloggningsstatus, id, e-mail och namn från AuthContext.
function Navbar() {
  const { customer, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

// Kontrollerar om kunden har avbrutit Google-inloggningen.
useEffect(() => {
  const params = new URLSearchParams(location.search)

  if (params.get('login') === 'cancelled') {
    setLoginMessage('Du avbröt Google-inloggningen. Försök igen om du vill logga in.')
  }
}, [location.search])

// Hanterar utloggning och visar ett felmeddelande om det misslyckas.
async function handleLogout() {
  setLogoutError('')

  try {
    await logout()
  } catch {
    setLogoutError('Det gick inte att logga ut. Försök igen.')
  }
}

  return (
    <nav>
      <Link to="/">Sparkle</Link>
      <Link to="/">Produkter</Link>
      <Link to="/cart">Kundvagn</Link>
      <Link to="/admin">Admin</Link>

      {/* Visar google-inlogg eller kontolänkar beroende på inloggad eller utloggad */}
      {!loading && (
        customer ? (
      <>
      <Link to="/my-account">Mina sidor</Link>
      <a href="#" onClick={(e) => {
        e.preventDefault()
        handleLogout()
      }}>
        Logga ut
      </a>
      </>
        ) : (
          <a href="/api/auth/google">Logga in med Google</a>
        )
      )}

      {logoutError && <p role="alert">{logoutError}</p>}
      {loginMessage && (
        <p role="alert" className="login-message">
          {loginMessage}
        </p>
      )}

    </nav>
  )
}

export default Navbar
