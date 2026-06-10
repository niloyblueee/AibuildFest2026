import VaccineSliders from './VaccineSliders.jsx'
import PredictionCards from './PredictionCards.jsx'
import AIInsights from './AIInsights.jsx'
import StatCharts from './StatCharts.jsx'
import SuggestionPanel from './SuggestionPanel.jsx'
import './AnalyticsPanel.css'

import ScenarioSelector from './ScenarioSelector.jsx'

function AnalyticsPanel({
  selectedDistricts,
  vaccineAllocations,
  setVaccineAllocation,
  totalVaccineInStore,
  setTotalVaccineInStore,
  remainingVaccine,
  scenarioName,
  setScenarioName,
  apiStatus,
  predictions,
  infectionData,
  vaccineData,
  districtComparison,
  spreadAcceleration,
  aiNarrative,
  signals,
  suggestions,
  suggestionsStatus,
  requestInterventionSuggestions,
}) {
  return (
    <div className="analytics-panel">
      <section className="panel-section">
        <div className="section-header">
          <h2>Scenario & Vaccination</h2>
          <p>Switch scenarios and adjust district coverage.</p>
          {apiStatus.state === 'loading' && <span style={{ color: 'var(--blue-medical)', fontSize: '12px' }}>Loading prediction...</span>}
          {apiStatus.state === 'error' && <span style={{ color: 'var(--red-accent)', fontSize: '12px' }}>API Error: {apiStatus.error}</span>}
        </div>
        <ScenarioSelector scenarioName={scenarioName} setScenarioName={setScenarioName} />
        <VaccineSliders
          selectedDistricts={selectedDistricts}
          vaccineAllocations={vaccineAllocations}
          setVaccineAllocation={setVaccineAllocation}
          totalVaccineInStore={totalVaccineInStore}
          setTotalVaccineInStore={setTotalVaccineInStore}
          remainingVaccine={remainingVaccine}
          predictions={predictions}
        />
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h2>Optimal Vaccine Plans</h2>
          <p>Request recommended coverage allocations for selected districts.</p>
        </div>
        <SuggestionPanel
          selectedDistricts={selectedDistricts}
          scenarioName={scenarioName}
          requestSuggestions={requestInterventionSuggestions}
          suggestions={suggestions}
          suggestionsStatus={suggestionsStatus}
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
          signals={signals}
        />
      </section>

      <section className="panel-section">
        <div className="section-header">
          <h2>AI Insights</h2>
          <p>Clinical guidance generated from current simulation state.</p>
        </div>
        <AIInsights aiNarrative={aiNarrative} predictions={predictions} />
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
