import { useEffect, useState } from 'react'

function App() {
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/currency?from=SEK&to=USD')
      .then((response) => response.json())
      .then((data) => {
        setRate(data.rate)
      })
  }, [])

  return (
    <div>
      <h1>Sparkle</h1>

      <p>
        1 SEK = {rate !== null ? rate : 'Laddar...'} EUR
      </p>
    </div>
  )
}

export default App