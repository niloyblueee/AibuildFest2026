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
    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)' }}>Scenario Model:</label>
      <select 
        value={scenarioName} 
        onChange={(e) => setScenarioName(e.target.value)}
        style={{ 
          padding: '8px 12px', 
          borderRadius: '12px', 
          border: '1px solid var(--gray-200)',
          fontFamily: 'var(--sans)',
          fontSize: '14px',
          background: 'var(--white)'
        }}
      >
        {scenarios.map(sc => (
          <option key={sc} value={sc}>{sc.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
        ))}
        {scenarios.length === 0 && <option value="observed_baseline">Observed Baseline</option>}
      </select>
    </div>
  )
}

export default ScenarioSelector
