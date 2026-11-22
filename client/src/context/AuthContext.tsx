import { createContext, useContext, useEffect, useState } from 'react'

// Uppgifter om den inloggade kunden som sparas i frontend.
type Customer = {
  id: number
  email: string
  name: string
}

// Vilken kundinformation och vilka funktioner AuthContext gör tillgängligt.
type AuthContextType = {
  customer: Customer | null
  loading: boolean
  refreshCustomer: () => Promise<void>
  logout: () => Promise<void>
}

// Skapar ett gemensam context för kundens inloggningsstatus.
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [customer, setCustomer] = useState<Customer | null>(null)

  const [loading, setLoading] = useState(true)

  // Hämtar den aktuella kundens uppgifter från backend.
  async function refreshCustomer() {
    try {
      // Backend kontrollerar JWT-cookien och hämtar rätt kund från databasen.
      const response = await fetch('/api/auth/me')

      if (!response.ok) {
        setCustomer(null)
        return
      }

    // Sparar kunduppgifterna och hanterar fel och avslutar laddningen.
      const data = await response.json()
      setCustomer(data.customer)
    } catch (error) {
      console.error('Kunde inte hämta kundens inloggning:', error)
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  // Kontrollerar kundens inloggning när komponenten startas.
  useEffect(() => {
    refreshCustomer()
  }, [])

    // Loggar ut kunden och tar bort inloggningsuppgifterna.
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Kunde inte logga ut.')
      }

      // Tar bort kunden från frontends inloggningsstatus.
      setCustomer(null)
    } catch (error) {
      console.error('Kunde inte logga ut kunden:', error)
      throw error
    }
  }

  // Gör kunduppgifterna och funktionen tillgängliga för alla komponenter.
  return (
    <AuthContext.Provider value={{ customer, loading, refreshCustomer, logout }}>
      {children}
    </AuthContext.Provider>
  )

}

// Hook som gör det enkelt för andra komponenterna att hämta info om kunden.
export function useAuth() {
  const context = useContext(AuthContext)

  // Säkerställer att hooken bara används inuti AuthProvider.
  if (!context) {
    throw new Error('useAuth måste användas inuti AuthProvider.')
  }

  return context
}
