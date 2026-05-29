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

const normalizeScore = (value) => (value <= 1 ? value * 100 : value)

function PredictionCards({ predictions, infectionData, signals }) {
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
      key: 'confirmed',
      label: 'Confirmed Cases (7d)',
      value: predictions.totalConfirmed,
      format: formatCompact,
      trend: predictions.growthRate,
      icon: 'CC',
      tone: 'orange',
    },
    {
      key: 'deaths',
      label: 'Deaths Forecast (7d)',
      value: predictions.totalDeaths,
      format: formatCompact,
      trend: predictions.growthRate,
      icon: 'DF',
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

  if (signals) {
    const rtEstimate = Number(signals.rtEstimate ?? 0)
    const testPositivity = Number(signals.testPositivityRate ?? 0) * 100
    const zeroDoseRisk = normalizeScore(
      Number(signals.zeroDoseRiskScore ?? 0),
    )
    const stockoutRisk = normalizeScore(
      Number(signals.stockoutRiskScore ?? 0),
    )

    cards.push(
      /*{
        key: 'rt',
        label: 'Rt Estimate',
        value: rtEstimate,
        format: (value) => value.toFixed(2),
        trend: (rtEstimate - 1) * 100,
        icon: 'RT',
        tone: 'orange',
      },
      {
        key: 'positivity',
        label: 'Test Positivity',
        value: testPositivity,
        format: (value) => `${value.toFixed(1)}%`,
        trend: testPositivity - 5,
        icon: 'TP',
        tone: 'red',
      },
      {
        key: 'zero-dose',
        label: 'Zero-dose Risk',
        value: zeroDoseRisk,
        format: (value) => `${value.toFixed(1)}%`,
        trend: zeroDoseRisk - 50,
        icon: 'ZD',
        tone: 'orange',
      },
      {
        key: 'stockout',
        label: 'Stockout Risk',
        value: stockoutRisk,
        format: (value) => `${value.toFixed(1)}%`,
        trend: stockoutRisk - 50,
        icon: 'SR',
        tone: 'blue',
      },*/
    )
  }

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
