import { Link } from 'react-router-dom'
import '../../css/style.css'

function Navbar() {
  return (
    <nav>
      <Link to="/">Sparkle</Link>
      <Link to="/">Produkter</Link>
      <Link to="/cart">Kundvagn</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  )
}

export default Navbar