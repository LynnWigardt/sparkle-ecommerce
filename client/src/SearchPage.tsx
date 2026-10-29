import { useEffect, useState } from 'react'

type Product = {
  objectID: string
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  category_id?: number | null
}

type Category = {
  id: number
  name: string
}

type SearchResult = {
  products: Product[]
  totalHits: number
  totalPages: number
  page: number
  pageSize: number
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<SortOption>('relevance')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta kategorier.')
      }

      setCategories(data.categories ?? [])
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Kunde inte hämta kategorier.',
      )
    }
  }

  async function searchProducts(nextPage = 1) {
    setLoading(true)
    setMessage('')

    const params = new URLSearchParams({
      q: query,
      page: String(nextPage),
      pageSize: '16',
      sort,
    })

    if (categoryId) params.set('categoryId', categoryId)
    if (minPrice !== '') params.set('minPrice', minPrice)
    if (maxPrice !== '') params.set('maxPrice', maxPrice)

    try {
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
    void loadCategories()
    void searchProducts()
  }, [])

  return (
    <section>
      <h1>Sparkle – våra produkter</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void searchProducts(1)
        }}
      >
        <label>
          Sök produkter
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sök efter en produkt..."
            aria-label="Sök efter en produkt"
          />
        </label>

        <label>
          Kategori
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Alla kategorier</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Lägsta pris (kr)
          <input
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />
        </label>

        <label>
          Högsta pris (kr)
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
        </label>

        <label>
          Sortera efter
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
          >
            <option value="relevance">Relevans</option>
            <option value="price_asc">Pris: lägst först</option>
            <option value="price_desc">Pris: högst först</option>
            <option value="name_asc">Produktnamn: A–Ö</option>
          </select>
        </label>

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
                    className="product-image"
                  />
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
            onClick={() => void searchProducts(page - 1)}
            disabled={page <= 1 || loading}
          >
            Föregående
          </button>

          <button
            onClick={() => void searchProducts(page + 1)}
            disabled={page >= result.totalPages || loading}
          >
            Nästa
          </button>
        </div>
      )}
    </section>
  )
}

export default SearchPage