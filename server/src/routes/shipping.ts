import { Router } from 'express'

import {
  findServicePoints,
  getDeliveryTime,
} from '../integrations/shippingAdapter.ts'

const router = Router()

// Hämtar närmaste utlämningsställen.
router.get('/api/shipping/service-points', async (req, res) => {
  const postalCode = String(req.query.postalCode ?? '').replace(/\s/g, '')

  if (!/^\d{5}$/.test(postalCode)) {
    res.status(400).json({ error: 'Ange ett giltigt postnummer med fem siffror.' })
    return
  }

  try {
    const servicePoints = await findServicePoints(postalCode)
    res.json({ servicePoints })
  } catch (error) {
    console.error('Fel vid hämtning av PostNord-ombud:', error)
    res.status(502).json({
      error: 'Det gick inte att hämta utlämningsställen just nu.',
    })
  }
})

// Hämtar beräknad leveranstid för valt utlämningsställe.
router.get('/api/shipping/delivery-time', async (req, res) => {
  const postalCode = String(req.query.postalCode ?? '').replace(/\s/g, '')
  const servicePointId = String(req.query.servicePointId ?? '')

  if (!/^\d{5}$/.test(postalCode) || !servicePointId) {
    res.status(400).json({
      error: 'Ange ett giltigt postnummer och välj ett utlämningsställe.',
    })
    return
  }

  try {
    // Kontrollerar att utlämningsstället finns bland PostNords resultat.
    const servicePoints = await findServicePoints(postalCode)

    const selectedPoint = servicePoints.find(
      (point) => point.id === servicePointId
    )

    if (!selectedPoint) {
      res.status(400).json({
        error: 'Det valda utlämningsstället kunde inte verifieras.',
      })
      return
    }

    const deliveryTime = await getDeliveryTime(selectedPoint.id)

    res.json({ deliveryTime })
  } catch (error) {
    console.error('Fel vid hämtning av leveranstid:', error)

    res.status(502).json({
      error: 'Det gick inte att hämta leveranstiden från PostNord just nu.',
    })
  }
})

export default router