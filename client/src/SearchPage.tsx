import { useEffect, useState } from 'react'

type Product = {
  objectID: string
  name: string
  price: number
  description?: string | null
  image_url?: string | null
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
        pageSize: '16',
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

  useEffect(() => {
    searchProducts()
  }, [])

  return (
    <section>
      <h1>Sparkle – våra produkter</h1>

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
          aria-label="Sök efter en produkt"/>

        <button type="submit" disabled={loading}>
          Sök
        </button>
      </form>

      {loading && <p>Hämtar produkter...</p>}
      {message && <p role="alert">{message}</p>}

      {result && (
        <div>
          <p>
            {result.totalHits} träffar – sida {result.page} av{' '}
            {result.totalPages}
          </p>

          <div className="product-grid">
            {result.products.map((product) => (
              <article className="product-card" key={product.objectID}>
           {product.image_url ? (
            <img
                src={product.image_url}
                alt={product.name}
                className="product-image"/>
            ) : (
            <div className="product-image-placeholder">
                <span>Bild kommer snart</span>
            </div>
            )}

                <h2>{product.name}</h2>

                {product.description && <p>{product.description}</p>}

                <p>{product.price} kr</p>
              </article>
            ))}
          </div>

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