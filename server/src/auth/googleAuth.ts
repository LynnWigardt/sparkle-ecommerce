import { Router } from 'express'
import * as oidc from 'openid-client'

const router = Router()

let googleConfig: oidc.Configuration | undefined

async function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google-inloggningen saknar konfiguration.')
  }

  if (!googleConfig) {
    googleConfig = await oidc.discovery(
      new URL('https://accounts.google.com'),
      clientId,
      clientSecret
    )
  }

  return googleConfig
}

function getCookie(cookieHeader: string | undefined, name: string) {
  const cookie = cookieHeader
    ?.split('; ')
    .find((part) => part.startsWith(`${name}=`))

  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined
}

// Startar inloggningen på Google.
router.get('/google', async (_req, res) => {
  try {
    const config = await getGoogleConfig()
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL

    if (!callbackUrl) {
      throw new Error('Google callback-adressen saknas.')
    }

    // Skapar unika värden (säkerhetsnycklar) för att skydda inloggningen.
    const state = oidc.randomState()
    const nonce = oidc.randomNonce()
    const codeVerifier = oidc.randomPKCECodeVerifier()
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier)

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 5 * 60 * 1000,
      path: '/api/auth/google/callback',
    }

    res.cookie('google_state', state, cookieOptions)
    res.cookie('google_nonce', nonce, cookieOptions)
    res.cookie('google_code_verifier', codeVerifier, cookieOptions)

    const googleUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    res.redirect(googleUrl.href)
  } catch (error) {
    console.error('Fel vid start av Google-inloggning:', error)
    res.status(500).send('Det gick inte att starta Google-inloggningen.')
  }
})

export default router
