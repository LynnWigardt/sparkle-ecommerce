import { useState } from 'react'

function AdminPage() {
  const [format, setFormat] = useState<'csv' | 'xml'>('csv')
  const [message, setMessage] = useState('')

  async function handleImport() {
    setMessage('Importerar produkter...')

    try {
      const response = await fetch(`/api/import-products?format=${format}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Importen misslyckades')
      }

      setMessage(
        `Import klar! Nya produkter: ${data.inserted}, uppdaterade: ${data.updated}, överhoppade: ${data.skipped.length}`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Något gick fel',
      )
    }
  }

  return (
    <main>
      <h1>Sparkle Admin</h1>

      <h2>Importera produktdata</h2>

      <button onClick={() => setFormat('csv')}>
        Importera från CSV
      </button>

      <button onClick={() => setFormat('xml')}>
        Importera från XML
      </button>

      <p>Valt format: {format.toUpperCase()}</p>

      <button onClick={handleImport}>
        Starta import
      </button>

      {message && <p>{message}</p>}
    </main>
  )
}

export default AdminPage