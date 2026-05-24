import './App.css'
import AnalyticsPanel from './components/Analytics/AnalyticsPanel.jsx'
import MapPanel from './components/Map/MapPanel.jsx'
import Header from './components/shared/Header.jsx'
import useSimulation from './hooks/useSimulation.js'

function App() {
  const simulation = useSimulation()

  return (
    <div className="app-container">
      <Header
        currentWeek={simulation.currentWeek}
        selectedCount={simulation.selectedDistricts.length}
        isPlaying={simulation.isPlaying}
      />
      <main className="dashboard">
        <section className="map-section">
          <MapPanel
            selectedDistricts={simulation.selectedDistricts}
            addDistrict={simulation.addDistrict}
            removeDistrict={simulation.removeDistrict}
            currentWeek={simulation.currentWeek}
            setCurrentWeek={simulation.setCurrentWeek}
            isPlaying={simulation.isPlaying}
            togglePlayback={simulation.togglePlayback}
            playbackSpeed={simulation.playbackSpeed}
            setPlaybackSpeed={simulation.setPlaybackSpeed}
            districtInfectionPoints={simulation.districtInfectionPoints}
            districtMetrics={simulation.predictions.byDistrict}
            resolveDistrictName={simulation.resolveDistrictName}
          />
        </section>
        <section className="analytics-section">
          <AnalyticsPanel
            selectedDistricts={simulation.selectedDistricts}
            vaccineAllocations={simulation.vaccineAllocations}
            setVaccineAllocation={simulation.setVaccineAllocation}
            totalVaccines={simulation.totalVaccines}
            predictions={simulation.predictions}
            infectionData={simulation.infectionData}
            vaccineData={simulation.vaccineData}
            districtComparison={simulation.districtComparison}
            spreadAcceleration={simulation.spreadAcceleration}
            aiNarrative={simulation.aiNarrative}
          />
        </section>
      </main>
    </div>
  )
}

export default App
