import { z } from 'zod'

const API_KEY = process.env.POSTNORD_API_KEY ?? ''

const URL = 'https://atapi2.postnord.com/rest/businesslocation/v5/servicepoints/nearest/byaddress'

if (!API_KEY) {
  throw new Error('PostNord är inte konfigurerat. Kontrollera POSTNORD_API_KEY i .env.')
}

// Validerar svaret från PostNord.
const PostNordAnswer = z.object({
  servicePointInformationResponse: z.object({
    servicePoints: z.array(
      z.object({
        servicePointId: z.string(),
        name: z.string(),
        visitingAddress: z.object({
          streetName: z.string(),
          streetNumber: z.string(),
          city: z.string(),
        }),
      })
    ),
  }),
})

export type ServicePoint = {
  id: string
  name: string
  address: string
}

/* Hämtar de fem närmaste utlämningsställena utifrån ett postnummer */
export async function findServicePoints(postalCode: string): Promise<ServicePoint[]> {

  const params = new URLSearchParams({
    apikey: API_KEY,
    returnType: 'json',
    countryCode: 'SE',
    postalCode,
    numberOfServicePoints: '5',
  })

  const response = await fetch(`${URL}?${params}`, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`PostNord svarade med felkod ${response.status}`)
  }

  const answer = PostNordAnswer.safeParse(await response.json())

  if (!answer.success) {
    throw new Error(
      `Oväntat svar från PostNord: ${z.prettifyError(answer.error)}`
    )
  }

  const servicePoints = answer.data.servicePointInformationResponse.servicePoints.map((point) => ({
    id: point.servicePointId,
    name: point.name,
    address: `${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}, ${point.visitingAddress.city}`,
  }))

  return servicePoints
}