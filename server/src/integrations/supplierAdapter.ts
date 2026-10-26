
import { parse } from 'csv-parse/sync'
import { XMLParser } from 'fast-xml-parser'
import { SyntaxValidator } from 'fast-xml-validator'

const BASE_URL = process.env.SUPPLIER_API_URL
const API_KEY = process.env.SUPPLIER_API_KEY ?? ''
const TIMEOUT_MS = Number(process.env.SUPPLIER_API_TIMEOUT_MS ?? 5000)
const BRANSCH = process.env.SUPPLIER_BRANSCH ?? 'skonhet'

export type CatalogFormat = 'csv' | 'xml'

export type ProductCandidate = {
  sku: string | undefined
  ean: string
  name: string
  price: number
  stock: number
  variants: string[]
}

function toNumber(text: string): number {
  return Number(String(text).replace(',', '.'))
}
/*
function toNumber(text: string): number {
  return Number(text.replace(',', '.'))
}
*/

function toStock(text: string): number {
  return text === '' ? 0 : Number(text)
}

/* CSV */

type CsvRow = {
  artNr: string
  ean: string
  benamning: string
  pris: string
  lagersaldo: string
  varianter: string
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
    ean: row.ean,
    name: row.benamning,
    price: toNumber(row.pris),
    stock: toStock(row.lagersaldo),
    variants: row.varianter ? row.varianter.split('|') : [],
  }))
}

/* XML */

type XmlProduct = {
  '@_artNr': string
  ean: string
  benamning: string
  pris: { '#text': string }
  lagersaldo: string
  varianter?: { variant: string[] }
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  isArray: (name) => name === 'produkt' || name === 'variant',
})

function parseXmlCatalog(buffer: Buffer): ProductCandidate[] {
  const xml = new TextDecoder('utf-8').decode(buffer)
  const validation = SyntaxValidator.validate(xml)

  if (validation !== true) {
    throw new Error('Leverantörens XML-fil har ogiltig syntax')
  }

  const doc: { katalog: { produkt: XmlProduct[] } } = xmlParser.parse(xml)

  return doc.katalog.produkt.map((product) => ({
    sku: product['@_artNr'] || undefined,
    ean: String(product.ean),
    name: product.benamning,
    price: toNumber(product.pris['#text']),
    stock: toStock(product.lagersaldo),
    variants: product.varianter?.variant ?? [],
  }))
}

/* API */

export async function getSupplierCatalog(
  format: CatalogFormat = 'csv',
): Promise<ProductCandidate[]> {
  if (!BASE_URL) {
    throw new Error('SUPPLIER_API_URL saknas i .env')
  }

  const extension = format === 'xml' ? 'xml' : 'csv'

  const response = await fetch(
    `${BASE_URL}/export/products.${extension}?bransch=${BRANSCH}`,
    {
      headers: { 'X-Api-Key': API_KEY },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )

  if (!response.ok) {
    throw new Error(`Leverantörens API svarade med status ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  return format === 'xml'
    ? parseXmlCatalog(buffer)
    : parseCsvCatalog(buffer)
}
