import { parse } from 'csv-parse/sync'

const BASE_URL = process.env.SUPPLIER_API_URL
const API_KEY = process.env.SUPPLIER_API_KEY ?? ''
const TIMEOUT_MS = Number(process.env.SUPPLIER_API_TIMEOUT_MS ?? 5000)
const BRANSCH = process.env.SUPPLIER_BRANSCH ?? 'skonhet'

export type ProductCandidate = {
  sku: string | undefined
  ean: string
  name: string
  price: number
  stock: number
  variants: string[]
}

type CsvRow = {
  artNr: string
  ean: string
  benamning: string
  pris: string
  lagersaldo: string
  varianter: string
}

function parseDecimal(value: unknown): number {
  const text = String(value ?? '').replace(/\s/g, '').replace(',', '.')
  return text === '' ? NaN : Number(text)
}

function parseStock(value: unknown): number {
  const text = String(value ?? '').trim()
  return text === '' ? 0 : Number(text)
}

function parseCsvCatalog(buffer: Buffer): ProductCandidate[] {
  const text = new TextDecoder('windows-1252').decode(buffer)

  const rows = parse<CsvRow>(text, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  })

  return rows.map((row) => ({
    sku: row.artNr || undefined,
    ean: String(row.ean ?? ''),
    name: String(row.benamning ?? ''),
    price: parseDecimal(row.pris),
    stock: parseStock(row.lagersaldo),
    variants: row.varianter
      ? String(row.varianter).split('|')
      : [],
  }))
}

export async function getSupplierCatalog(): Promise<ProductCandidate[]> {
  if (!BASE_URL) {
    throw new Error('SUPPLIER_API_URL saknas i .env')
  }

  const response = await fetch(
    `${BASE_URL}/export/products.csv?bransch=${BRANSCH}`,
    {
      headers: { 'X-Api-Key': API_KEY },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )

  if (!response.ok) {
    throw new Error(`Leverantörens API svarade med status ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  return parseCsvCatalog(buffer)
}