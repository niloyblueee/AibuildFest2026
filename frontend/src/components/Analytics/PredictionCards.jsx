import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import AnimatedCounter from '../shared/AnimatedCounter.jsx'

const formatCompact = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return Math.round(value).toString()
}

function Sparkline({ data, color }) {
  return (
    <div className="sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data}>
          <Tooltip
            wrapperStyle={{ display: 'none' }}
            cursor={{ stroke: 'transparent' }}
          />
          <Line
            type="monotone"
            dataKey="cases"
            stroke={color}
            strokeWidth={2.2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function PredictionCards({ predictions, infectionData }) {
  const cards = [
    {
      key: 'cases',
      label: 'Predicted Cases',
      value: predictions.totalCases,
      format: formatCompact,
      trend: predictions.growthRate,
      icon: 'PC',
      tone: 'red',
    },
    {
      key: 'growth',
      label: 'Infection Growth Rate',
      value: predictions.growthRate,
      format: (value) => `${value.toFixed(1)}%`,
      trend: predictions.growthRate,
      icon: 'GR',
      tone: 'red',
    },
    {
      key: 'vaccine',
      label: 'Vaccine Efficiency',
      value: predictions.vaccineEfficiency,
      format: (value) => `${value.toFixed(1)}%`,
      trend: predictions.vaccineEfficiency - 50,
      icon: 'VE',
      tone: 'blue',
    },
    {
      key: 'mortality',
      label: 'Mortality Reduction',
      value: predictions.mortalityReduction,
      format: (value) => `${value.toFixed(1)}%`,
      trend: predictions.mortalityReduction - 50,
      icon: 'MR',
      tone: 'green',
    },
    {
      key: 'hospital',
      label: 'Hospital Load',
      value: predictions.hospitalLoad,
      format: (value) => `${value.toFixed(1)}%`,
      trend: 50 - predictions.hospitalLoad,
      icon: 'HL',
      tone: 'orange',
    },
    {
      key: 'risk',
      label: 'Risk Index',
      value: predictions.riskIndex,
      format: (value) => value.toFixed(1),
      trend: 50 - predictions.riskIndex,
      icon: 'RI',
      tone: 'red',
    },
  ]

  return (
    <div className="prediction-grid">
      {cards.map((card) => {
        const trendUp = card.trend >= 0
        const trendLabel = `${trendUp ? '+' : '-'}${Math.abs(card.trend).toFixed(1)}%`
        return (
          <div key={card.key} className={`prediction-card tone-${card.tone}`}>
            <div className="prediction-header">
              <span className="card-icon" aria-hidden="true">
                {card.icon}
              </span>
              <span className={`trend ${trendUp ? 'up' : 'down'}`}>
                {trendLabel}
              </span>
            </div>
            <p className="card-label">{card.label}</p>
            <h3 className="card-value">
              <AnimatedCounter value={card.value} format={card.format} />
            </h3>
            <Sparkline data={infectionData} color="var(--red-accent)" />
          </div>
        )
      })}
    </div>
  )
}

export default PredictionCards
