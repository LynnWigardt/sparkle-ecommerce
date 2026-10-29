import { z } from 'zod'
import { supabase } from '../supabase.ts'
import {
  getSupplierCatalog,
  type CatalogFormat,
} from './supplierAdapter.ts'
import { syncProductToAlgolia } from './algoliaAdapter.ts'

const productSchema = z.object({
  sku: z.string().trim().min(1),
  ean: z.string(),
  name: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  stock: z.number().int().nonnegative(),
  variants: z.array(z.string()),
})

export async function importSupplierProducts(
  format: CatalogFormat = 'csv',
) {
  const candidates = await getSupplierCatalog(format)

  let inserted = 0
  let updated = 0
  const skipped: { sku: string | null; reason: string }[] = []
  const syncFailed: { sku: string; reason: string }[] = []

  for (const candidate of candidates) {
    const validation = productSchema.safeParse(candidate)

    if (!validation.success) {
      skipped.push({
        sku: candidate.sku ?? null,
        reason: validation.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      })
      continue
    }

    const product = validation.data

    const { data: existing, error: lookupError } = await supabase
      .from('products')
      .select('id')
      .eq('article_number', product.sku)
      .maybeSingle()

    if (lookupError) {
      throw new Error(`Kunde inte kontrollera ${product.sku}: ${lookupError.message}`)
    }

    const { error: saveError } = await supabase
      .from('products')
      .upsert(
        {
          article_number: product.sku,
          ean: product.ean || null,
          name: product.name,
          price: product.price,
          stock: product.stock,
          variants: product.variants,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'article_number' },
      )

    if (saveError) {
      skipped.push({
        sku: product.sku,
        reason: `Kunde inte spara produkten: ${saveError.message}`,
      })
      continue
    }

 if (existing) {
  updated++
} else {
  inserted++
}

try {
await syncProductToAlgolia({
  article_number: product.sku,
  name: product.name,
  description: null,
  category_id: null,
  image_url: null,
  price: product.price,
  stock: product.stock,
  ean: product.ean || null,
  variants: product.variants,
})
} catch (error) {
  const reason =
    error instanceof Error ? error.message : 'Okänt fel'

  console.error(
    `Produkten ${product.sku} sparades i databasen men kunde inte synkas till Algolia:`,
    error,
  )

  syncFailed.push({
    sku: product.sku,
    reason,
  })
}
}

return {
  received: candidates.length,
  inserted,
  updated,
  skipped,
  syncFailed,
}
}
