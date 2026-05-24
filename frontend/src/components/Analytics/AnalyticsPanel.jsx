import VaccineSliders from './VaccineSliders.jsx'
import PredictionCards from './PredictionCards.jsx'
import AIInsights from './AIInsights.jsx'
import StatCharts from './StatCharts.jsx'
import './AnalyticsPanel.css'

function AnalyticsPanel({
  selectedDistricts,
  vaccineAllocations,
  setVaccineAllocation,
  totalVaccines,
  predictions,
  infectionData,
  vaccineData,
  districtComparison,
  spreadAcceleration,
  aiNarrative,
}) {
  return (
    <div className="analytics-panel">
      <section className="panel-section">
        <div className="section-header">
          <h2>Vaccine Allocation</h2>
          <p>Distribute {totalVaccines.toLocaleString()} doses across districts.</p>
        </div>
        <VaccineSliders
          selectedDistricts={selectedDistricts}
          vaccineAllocations={vaccineAllocations}
          setVaccineAllocation={setVaccineAllocation}
          totalVaccines={totalVaccines}
        />
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h2>Prediction Highlights</h2>
          <p>Real-time indicators updated by the simulator.</p>
        </div>
        <PredictionCards
          predictions={predictions}
          infectionData={infectionData}
        />
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h2>AI Insights</h2>
          <p>Clinical guidance generated from current simulation state.</p>
        </div>
        <AIInsights aiNarrative={aiNarrative} />
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h2>Model Analytics</h2>
          <p>Comparative charts across infection, efficiency, and acceleration.</p>
        </div>
        <StatCharts
          infectionData={infectionData}
          vaccineData={vaccineData}
          districtComparison={districtComparison}
          spreadAcceleration={spreadAcceleration}
        />
      </section>
    </div>
  )
}

export default AnalyticsPanel
