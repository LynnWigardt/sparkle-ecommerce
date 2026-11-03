import { z } from 'zod'

const API_KEY = process.env.POSTNORD_API_KEY ?? ''

const SERVICE_POINTS_URL =
  'https://atapi2.postnord.com/rest/businesslocation/v5/servicepoints/nearest/byaddress'

const TRANSIT_TIME_URL =
  'https://atapi2.postnord.com/rest/transport/v2/transittime/addresstolocation'

// Sparkles lager/postnummer.
const ORIGIN_POSTAL_CODE = '24541'

// Validerar svaret från PostNords tjänst för utlämningsställen.
const PostNordServicePointsAnswer = z.object({
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

// Validerar svaret från PostNords Transit Time V2.
const PostNordTransitTimeAnswer = z.array(
  z.object({
    service: z.object({
      basicServiceCode: z.string().optional(),
      name: z.string().optional(),
    }).optional(),

    estimatedTimeOfArrival: z.object({
      timeOfArrival: z.string().nullable().optional(),

      dayRangeOfArrival: z.object({
        daysMinimum: z.number(),
        daysMaximum: z.number(),
      }).nullable().optional(),
    }).nullable().optional(),

    isSupported: z.boolean().optional(),
    isBookable: z.boolean().optional(),
    errorMessage: z.string().optional(),
  })
)

export type ServicePoint = {
  id: string
  name: string
  address: string
}

export type DeliveryTime = {
  estimate: string
}

// Kontrollerar att PostNord-nyckeln finns.
function getApiKey() {
  if (!API_KEY) {
    throw new Error(
      'PostNord är inte konfigurerat. Kontrollera POSTNORD_API_KEY i .env.'
    )
  }

  return API_KEY
}

/* Hämtar de fem närmaste utlämningsställena utifrån ett postnummer. */
export async function findServicePoints(
  postalCode: string
): Promise<ServicePoint[]> {
  const params = new URLSearchParams({
    apikey: getApiKey(),
    returnType: 'json',
    countryCode: 'SE',
    postalCode,
    numberOfServicePoints: '5',
  })

  const response = await fetch(`${SERVICE_POINTS_URL}?${params}`, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`PostNord svarade med felkod ${response.status}`)
  }

  const answer = PostNordServicePointsAnswer.safeParse(
    await response.json()
  )

  if (!answer.success) {
    throw new Error(
      `Oväntat svar från PostNord: ${z.prettifyError(answer.error)}`
    )
  }

  return answer.data.servicePointInformationResponse.servicePoints.map(
    (point) => ({
      id: point.servicePointId,
      name: point.name,
      address: `${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}, ${point.visitingAddress.city}`,
    })
  )
}

/* Hämtar beräknad leveranstid till valt PostNord-ombud. */
export async function getDeliveryTime(
  servicePointId: string
): Promise<DeliveryTime> {
  const params = new URLSearchParams({
    apikey: getApiKey(),
    startTime: new Date().toISOString().slice(0, 16),
    serviceCodes: '19',
    originPostalCode: ORIGIN_POSTAL_CODE,
    originCountryCode: 'SE',
    destinationProductionPointId: servicePointId,
    destinationProductionPointType: 'servicepoint',
    destinationCountryCode: 'SE',
  })

  const response = await fetch(`${TRANSIT_TIME_URL}?${params}`, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`PostNord svarade med felkod ${response.status}`)
  }

  const answer = PostNordTransitTimeAnswer.safeParse(
    await response.json()
  )

  if (!answer.success) {
    throw new Error(
      `Oväntat svar från PostNord: ${z.prettifyError(answer.error)}`
    )
  }

  const delivery = answer.data.find(
    (item) =>
      item.service?.basicServiceCode === '19' &&
      item.isBookable !== false &&
      item.estimatedTimeOfArrival
  )

  if (!delivery?.estimatedTimeOfArrival) {
    throw new Error(
      'PostNord kunde inte beräkna någon leveranstid för utlämningsstället.'
    )
  }

  const arrival = delivery.estimatedTimeOfArrival

  if (arrival.timeOfArrival) {
    const date = new Date(arrival.timeOfArrival)

    return {
      estimate: `Beräknad leverans: ${date.toLocaleDateString('sv-SE')}`,
    }
  }

  if (arrival.dayRangeOfArrival) {
    const { daysMinimum, daysMaximum } = arrival.dayRangeOfArrival

    return {
      estimate: `Beräknad leverans: ${daysMinimum}–${daysMaximum} dagar`,
    }
  }

  throw new Error('PostNord returnerade ingen användbar leveranstid.')
}