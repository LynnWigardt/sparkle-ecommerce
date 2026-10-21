
const API_URL = 'https://api.frankfurter.dev/v1'

type ExchangeRateResponse = {
  rates: Record<string, number>
}

export async function getExchangeRate(
  from: string,
  to: string
): Promise<number> {
  const response = await fetch(
    `${API_URL}/latest?base=${from}&symbols=${to}`
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
