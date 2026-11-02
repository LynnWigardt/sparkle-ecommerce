import { supabase } from '../supabase.ts'
import { randomUUID } from 'node:crypto'

const BUCKET = 'product-images'

export async function uploadProductImage(
  file: Buffer,
  mimeType: string,
) {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg'
  const filePath = `${randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Kunde inte ladda upp bilden: ${error.message}`)
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  return {
    path: filePath,
    url: data.publicUrl,
  }
}

export async function deleteProductImage(filePath: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath])

  if (error) {
    throw new Error(`Kunde inte ta bort den gamla bilden: ${error.message}`)
  }
}