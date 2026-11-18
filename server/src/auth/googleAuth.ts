import { Router } from 'express'
import * as oidc from 'openid-client'
import { supabase } from '../supabase.ts'
import { SignJWT, jwtVerify } from 'jose'

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

// Skapar en signerad JWT-token med customer_id från supabase +e-mail och är giltig i 7 dagar.
async function createSessionToken(customerId: number, email: string) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT-hemligheten saknas.')
  }

  const secret = new TextEncoder().encode(jwtSecret)

  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(customerId))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

// Kontrollerar att kundens JWT-token är giltig.
async function verifySessionToken(token: string) {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT-hemligheten saknas.')
  }

  const secret = new TextEncoder().encode(jwtSecret)

  const { payload } = await jwtVerify(token, secret)

  return payload
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


// Tar emot kunden när Google har genomfört inloggningen.
router.get('/google/callback', async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth/google/callback',
  }

  // Hämtar säkerhetsvärdena från cookies.
  const state = getCookie(req.headers.cookie, 'google_state')
  const nonce = getCookie(req.headers.cookie, 'google_nonce')
  const codeVerifier = getCookie(
    req.headers.cookie,
    'google_code_verifier'
  )

  // Tar bort säkerhetsvärdena efter inloggningsförsöket.
  res.clearCookie('google_state', cookieOptions)
  res.clearCookie('google_nonce', cookieOptions)
  res.clearCookie('google_code_verifier', cookieOptions)

  if (!state || !nonce || !codeVerifier) {
    res.status(400).send('Inloggningen kunde inte verifieras. Försök igen.')
    return
  }

  try {
    const config = await getGoogleConfig()
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL

    if (!callbackUrl) {
      throw new Error('Google callback-adressen saknas.')
    }

    // Bygger den fullständiga adressen med Googles svar.
    const currentUrl = new URL(req.originalUrl, callbackUrl)

    // Byter Googles inloggningskod mot tokens på servern.
    const tokens = await oidc.authorizationCodeGrant(
      config,
      currentUrl,
      {
        pkceCodeVerifier: codeVerifier,
        expectedState: state,
        expectedNonce: nonce,
        idTokenExpected: true,
      }
    )

    // Hämtar kundens uppgifter från Googles Id-token (bl.a. sub).
    const claims = tokens.claims()

    if (!claims) {
      throw new Error('Google skickade ingen giltig ID-token.')
    }

    const googleSub = claims.sub
    const email = claims.email
    const name = claims.name

    if (
        typeof googleSub !== 'string' ||
        typeof email !== 'string' ||
        typeof name !== 'string'
    ) {
    throw new Error('Google skickade ofullständiga kunduppgifter.')
    }

    // Sparar kunden i databasen eller uppdaterar uppgifterna om kunden redan finns.
    const { data: customer, error } = await supabase
    .from('customers')
    .upsert(
        {
        google_sub: googleSub,
        email,
        name,
        },
        {
        onConflict: 'google_sub',
        }
    )
    .select('id')
    .single()

    if (error || !customer) {
    console.error('Kunde inte spara Google-kunden:', error)
    throw new Error('Kundkontot kunde inte sparas.')
    }

    // Skapar en JWT-token kopplad till customer_id.
    const sessionToken = await createSessionToken(customer.id, email)

    // Sparar JWT-tokenen i en säker cookie som JavaScript inte kan läsa.
    res.cookie('sparkle_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    })

    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173')
    } catch (error) {
        console.error('Fel vid Google callback:', error)
        res.status(400).send(
        'Google-inloggningen misslyckades. Försök igen.'
        )
    }
    })

    // Kontrollerar om kunden har en giltig inloggningssession.
    router.get('/me', async (req, res) => {
    try {
        // Hämtar JWT-tokenen från kundens cookie.
        const token = getCookie(req.headers.cookie, 'sparkle_session')

        if (!token) {
        res.status(401).json({ error: 'Du är inte inloggad.' })
        return
        }

        // Verifierar tokenen och hämtar customer_id.
        const payload = await verifySessionToken(token)
        const customerId = Number(payload.sub)

        if (!Number.isSafeInteger(customerId) || customerId <= 0) {
        res.status(401).json({ error: 'Ogiltig inloggning.' })
        return
        }

        // Hämtar kundens uppgifter från supabase.
        const { data: customer, error } = await supabase
        .from('customers')
        .select('id, email, name')
        .eq('id', customerId)
        .single()

        if (error || !customer) {
        res.status(401).json({ error: 'Kunden kunde tyvärr inte hittas.' })
        return
        }

        res.json({ customer })
    } catch (error) {
        console.error('Fel vid kontroll av inloggning:', error)
        res.status(401).json({ error: 'Din inloggning är tyvärr ogiltig eller har gått ut.' })
    }
    })

export default router
