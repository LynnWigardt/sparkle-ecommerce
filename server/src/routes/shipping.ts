import { Router } from 'express'
import { findServicePoints } from '../integrations/shippingAdapter.ts'

const router = Router()

router.get('/service-points', async (req, res) => {
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
    res.status(502).json({ error: 'Det gick inte att hämta utlämningsställen just nu.' })
  }
})

export default router