import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function ScenarioSelector({ scenarioName, setScenarioName }) {
  const [scenarios, setScenarios] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/scenarios`)
      .then(res => res.json())
      .then(data => {
        if (data.scenarios) {
          setScenarios(data.scenarios)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <></>
  )
}

export default ScenarioSelector
