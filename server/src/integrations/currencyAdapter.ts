const API_URL = 'https://api.frankfurter.dev/v1'

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

  const data = await response.json()

  return data.rates[to]
}