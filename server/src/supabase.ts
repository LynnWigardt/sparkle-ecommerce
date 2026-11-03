import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase configuration is missing in .env')
}

// Supabase anrop får ta max 15 sek, annars avbryter.
const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const timeoutSignal = AbortSignal.timeout(15000)

  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal

  return fetch(input, { ...init, signal })
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: fetchWithTimeout,
  },
})