import { useEffect, useState } from 'react'
import { API_BASE_ERROR, getApiBase } from '../../lib/apiBase'

function ScenarioSelector({ scenarioName, setScenarioName }) {
  const [scenarios, setScenarios] = useState([])

  useEffect(() => {
    const baseUrl = getApiBase()
    if (!baseUrl) {
      console.error(API_BASE_ERROR)
      return
    }
    fetch(`${baseUrl}/scenarios`)
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
