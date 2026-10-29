import { useEffect, useState } from 'react'

type Product = {
  article_number: string
  name: string
  description: string | null
  category_id: number | null
  image_url: string | null
  price: number
  stock: number
  ean: string | null
  variants: string[]
}

type ImportResult = {
  received: number
  inserted: number
  updated: number
  skipped: { sku: string | null; reason: string }[]
  syncFailed: { sku: string; reason: string }[]
}

function AdminPage() {
  const [format, setFormat] = useState<'csv' | 'xml'>('csv')
  const [message, setMessage] = useState('')
  const [skipped, setSkipped] = useState<ImportResult['skipped']>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleImport() {
    setMessage('Importerar produkter...')
    setSkipped([])

    try {
      const response = await fetch(`/api/import-products?format=${format}`, {
        method: 'POST',
      })
      const data: ImportResult & { error?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Importen misslyckades')
      }

      setSkipped(data.skipped ?? [])
      setMessage(
        `Import klar! Mottagna: ${data.received}, nya: ${data.inserted}, uppdaterade: ${data.updated}, överhoppade: ${data.skipped?.length ?? 0}, synkfel: ${data.syncFailed?.length ?? 0}`,
      )

      await loadProducts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Något gick fel')
    }
  }

  async function loadProducts() {
    setLoadingProducts(true)

    try {
      const response = await fetch('/api/products')
      const data: { products?: Product[]; error?: string } =
        await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta produkterna.')
      }

      setProducts(data.products ?? [])
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Kunde inte hämta produkterna.',
      )
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  function startEditing(product: Product) {
    setSelectedProduct({ ...product })
    setMessage('')
  }

  function updateField<K extends keyof Product>(
    field: K,
    value: Product[K],
  ) {
    setSelectedProduct((current) =>
      current ? { ...current, [field]: value } : current,
    )
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProduct) return

    setSaving(true)
    setMessage('Sparar produkt...')

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(selectedProduct.article_number)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedProduct.name,
            description: selectedProduct.description,
            price: Number(selectedProduct.price),
            stock: Number(selectedProduct.stock),
            image_url: selectedProduct.image_url,
            category_id: selectedProduct.category_id,
            ean: selectedProduct.ean,
            variants: selectedProduct.variants,
          }),
        },
      )

      const data: { error?: string; message?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Kunde inte spara produkten.')
      }

      setMessage(data.message || 'Produkten har sparats.')
      setSelectedProduct(null)
      await loadProducts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Något gick fel.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Vill du verkligen ta bort "${product.name}" (${product.article_number})?`,
    )

    if (!confirmed) return

    setMessage('Tar bort produkt...')

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.article_number)}`,
        { method: 'DELETE' },
      )
      const data: { error?: string; message?: string } = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Kunde inte ta bort produkten.')
      }

      setMessage(data.message || 'Produkten har tagits bort.')
      if (selectedProduct?.article_number === product.article_number) {
        setSelectedProduct(null)
      }
      await loadProducts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Något gick fel.')
    }
  }

  return (
    <main>
      <h1>Sparkle Admin</h1>

      <section>
        <h2>Importera produktdata</h2>

        <button type="button" onClick={() => setFormat('csv')}>
          Importera från CSV
        </button>

        <button type="button" onClick={() => setFormat('xml')}>
          Importera från XML
        </button>

        <p>Valt format: {format.toUpperCase()}</p>

        <button type="button" onClick={handleImport}>
          Starta import
        </button>

        {skipped.length > 0 && (
          <ul>
            {skipped.map((product, index) => (
              <li key={`${product.sku ?? 'okänd'}-${index}`}>
                {product.sku ?? 'Okänd produkt'}: {product.reason}
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr />

      <section>
        <h2>Hantera produkter</h2>

        <button
          type="button"
          onClick={() => void loadProducts()}
          disabled={loadingProducts}
        >
          {loadingProducts ? 'Hämtar produkter...' : 'Uppdatera produktlista'}
        </button>

        {products.length === 0 && !loadingProducts && (
          <p>Inga produkter att visa.</p>
        )}

        {products.length > 0 && (
          <ul>
            {products.map((product) => (
              <li key={product.article_number}>
                <strong>{product.name}</strong> — {product.price} kr —{' '}
                Lagersaldo: {product.stock}{' '}
                <button
                  type="button"
                  onClick={() => startEditing(product)}
                >
                  Redigera
                </button>{' '}
                <button
                  type="button"
                  onClick={() => void handleDelete(product)}
                >
                  Ta bort
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedProduct && (
        <section>
          <h2>Redigera {selectedProduct.article_number}</h2>

          <form onSubmit={handleSave}>
            <label>
              Produktnamn
              <input
                required
                maxLength={200}
                value={selectedProduct.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label>
              Beskrivning
              <textarea
                maxLength={5000}
                value={selectedProduct.description ?? ''}
                onChange={(event) =>
                  updateField('description', event.target.value || null)
                }
              />
            </label>

            <label>
              Pris (kr)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={selectedProduct.price}
                onChange={(event) =>
                  updateField('price', Number(event.target.value))
                }
              />
            </label>

            <label>
              Lagersaldo
              <input
                required
                type="number"
                min="0"
                step="1"
                value={selectedProduct.stock}
                onChange={(event) =>
                  updateField('stock', Number(event.target.value))
                }
              />
            </label>

            <label>
              Bildadress
              <input
                type="url"
                value={selectedProduct.image_url ?? ''}
                onChange={(event) =>
                  updateField('image_url', event.target.value || null)
                }
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </button>

            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              disabled={saving}
            >
              Avbryt
            </button>
          </form>
        </section>
      )}

      {message && <p role="status">{message}</p>}
    </main>
  )
}

export default AdminPage
