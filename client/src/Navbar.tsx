
import { Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import '../../css/style.css'

// Hämtar kundens inloggningsstatus, id, e-mail och namn från AuthContext.
function Navbar() {
  const { customer, loading } = useAuth()

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
            <span>Hej, {customer.name}!</span>
          </>
        ) : (
          <a href="/api/auth/google">Logga in med Google</a>
        )
      )}
    </nav>
  )
}

export default Navbar
