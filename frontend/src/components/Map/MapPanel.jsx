import { useMemo, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import geoData from '../../data/bangladeshDistricts.json'
import DistrictLayer from './DistrictLayer.jsx'
import InfectionMarkers from './InfectionMarkers.jsx'
import MapControls from './MapControls.jsx'
import DistrictSearch from './DistrictSearch.jsx'
import TimelineScrubber from './TimelineScrubber.jsx'
import './MapPanel.css'

const MAP_CENTER = [23.8, 90.4]

function MapPanel({
  selectedDistricts,
  addDistrict,
  removeDistrict,
  currentWeek,
  setCurrentWeek,
  isPlaying,
  togglePlayback,
  playbackSpeed,
  setPlaybackSpeed,
  districtInfectionPoints,
  districtMetrics,
  resolveDistrictName,
  availableDistricts,
}) {
  const [showDots, setShowDots] = useState(true)
  const [showBorders, setShowBorders] = useState(true)

  const selectedNames = useMemo(
    () => selectedDistricts.map((district) => district.name),
    [selectedDistricts],
  )

  return (
    <div className="map-shell">
      <MapContainer
        center={MAP_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={10}
        className="map-canvas"
        scrollWheelZoom
        preferCanvas
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <DistrictLayer
          geoData={geoData}
          selectedDistricts={selectedNames}
          onToggleDistrict={(name) => {
            const resolved = resolveDistrictName(name)
            if (selectedNames.includes(resolved)) {
              removeDistrict(resolved)
            } else {
              addDistrict(resolved)
            }
          }}
          districtMetrics={districtMetrics}
          showBorders={showBorders}
          resolveDistrictName={resolveDistrictName}
          availableDistricts={availableDistricts}
        />
        {showDots ? (
          <InfectionMarkers points={districtInfectionPoints} />
        ) : null}
      </MapContainer>

      <DistrictSearch
        selectedDistricts={selectedNames}
        onAddDistrict={addDistrict}
        onRemoveDistrict={removeDistrict}
      />
      <div style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 1000, display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <button className="map-control-btn" onClick={() => {
          if (!availableDistricts) return
          const highRisk = availableDistricts.filter(d => d.riskClass === 'High' || d.risk_class === 'High')
          highRisk.slice(0, 10).forEach(d => addDistrict(d.name))
        }}>+ Top 10 High Risk</button>
        <button className="map-control-btn" onClick={() => {
          if (!availableDistricts) return
          availableDistricts.forEach(d => addDistrict(d.name))
        }}>+ Select All</button>
        <button className="map-control-btn" onClick={() => {
          selectedNames.forEach(name => removeDistrict(name))
        }}>- Clear All</button>
      </div>
      <MapControls
        showDots={showDots}
        showBorders={showBorders}
        onToggleDots={() => setShowDots((prev) => !prev)}
        onToggleBorders={() => setShowBorders((prev) => !prev)}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
      />
      <TimelineScrubber
        currentWeek={currentWeek}
        setCurrentWeek={setCurrentWeek}
        isPlaying={isPlaying}
        togglePlayback={togglePlayback}
      />
    </div>
  )
}

export default MapPanel
