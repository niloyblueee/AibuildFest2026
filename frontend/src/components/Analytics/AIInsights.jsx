import { motion } from 'framer-motion'

function AIInsights({ aiNarrative }) {
  const narrative =
    aiNarrative || 'Select districts to generate localized guidance.'
  return (
    <motion.div
      className="ai-insights card"
      key={narrative}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ai-header">
        <span className="ai-badge">AI</span>
        <span className="ai-title">Clinical Narrative</span>
      </div>
      <p>{narrative}</p>
    </motion.div>
  )
}

export default AIInsights
