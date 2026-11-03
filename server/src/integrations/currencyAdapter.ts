const API_URL = 'https://api.frankfurter.dev/v1'

type ExchangeRateResponse = {
  rates: Record<string, number>
}

// Hämtar växelkurs mellan två valutor från Frankfurter API. Om inte svarar inom 5 sek avbryts.
export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
const response = await fetch(
  `${API_URL}/latest?base=${from}&symbols=${to}`,
  {
    signal: AbortSignal.timeout(5000),
  },
)

  if (!response.ok) {
    throw new Error('Could not fetch exchange rate')
  }

  const data = (await response.json()) as ExchangeRateResponse

  const rate = data.rates[to]

  if (typeof rate !== 'number') {
    throw new Error(`Exchange rate for ${to} was not found`)
  }

  return rate
}
