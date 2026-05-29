import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const API_BASE = import.meta.env.VITE_API_BASE

function AIInsights({ aiNarrative, predictions }) {
  const [insight, setInsight] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    // Start with the local narrative as a fallback
    if (!insight && aiNarrative) {
      setInsight(aiNarrative)
    }

    if (!predictions || predictions.totalCases === 0) {
      setInsight('Select districts to generate localized guidance.')
      return
    }

    // Debounce the API call
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setIsLoading(true)
      fetch(`${API_BASE}insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction: predictions }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Insight API error')
          return res.json()
        })
        .then((data) => {
          if (data.summary) {
            setInsight(data.summary)
          }
        })
        .catch((err) => {
          console.error('Failed to fetch AI insights:', err)
          // Fallback to local narrative generator if the API fails
          setInsight(aiNarrative)
        })
        .finally(() => setIsLoading(false))
    }, 1500) // 1.5s debounce

    return () => clearTimeout(timerRef.current)
  }, [predictions, aiNarrative])

  return (
    <motion.div
      className="ai-insights card"
      key={insight}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ai-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="ai-badge">AI</span>
          <span className="ai-title">Clinical Narrative</span>
        </div>
        {isLoading && <span style={{ fontSize: '12px', color: 'var(--blue-medical)' }}>Generating...</span>}
      </div>
      <p>{insight}</p>
    </motion.div>
  )
}

export default AIInsights
