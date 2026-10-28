import { useState } from 'react'

type Product = {
  objectID: string
  name: string
  price: number
}

type SearchResult = {
  products: Product[]
  totalHits: number
  totalPages: number
  page: number
  pageSize: number
}

function SearchPage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function searchProducts(nextPage = 1) {
    setLoading(true)
    setMessage('')

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(nextPage),
        pageSize: '10',
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sökningen misslyckades.')
      }

      setResult(data)
      setPage(nextPage)
    } catch (error) {
      setResult(null)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Sökningen kunde inte genomföras.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h1>Sök produkter</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          searchProducts(1)
        }}>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök efter en produkt..."
          aria-label="Sök efter en produkt"
        />

        <button type="submit" disabled={loading}>
          Sök
        </button>
      </form>

      {loading && <p>Söker produkter...</p>}
      {message && <p role="alert">{message}</p>}

         {result && (
        <div>
          <p>
            {result.totalHits} träffar – sida {result.page} av{' '}
            {result.totalPages}
          </p>

          <ul>
            {result.products.map((product) => (
              <li key={product.objectID}>
                {product.name} – {product.price} kr
              </li>
            ))}
          </ul>

          <button
            onClick={() => searchProducts(page - 1)}
            disabled={page <= 1 || loading}>
            Föregående
          </button>

          <button
            onClick={() => searchProducts(page + 1)}
            disabled={page >= result.totalPages || loading}>
            Nästa
          </button>
        </div>
      )}
    </section>
  )
}

export default SearchPage