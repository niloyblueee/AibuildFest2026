import { GeoJSON } from 'react-leaflet'
import DISTRICTS from '../../data/districtData'

const getFeatureName = (feature) => {
  const props = feature?.properties || {}
  return (
    props.shapeName ||
    props.NAME_2 ||
    props.NAME_1 ||
    props.NAME ||
    props.district ||
    props.DISTRICT ||
    props.NAME_EN ||
    ''
  )
}

const normalizeName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim()

const getFillColor = (riskClass, intensity) => {
  if (riskClass === 'High') return '#ff6b6b'
  if (riskClass === 'Medium') return '#ffa8a8'
  if (riskClass === 'Low') return '#ffe3e3'

  if (intensity > 0.85) return '#ff6b6b'
  if (intensity > 0.7) return '#ff8787'
  if (intensity > 0.55) return '#ffa8a8'
  if (intensity > 0.4) return '#ffc9c9'
  if (intensity > 0.25) return '#ffe3e3'
  return '#fff5f5'
}

function DistrictLayer({
  geoData,
  selectedDistricts,
  onToggleDistrict,
  districtMetrics,
  showBorders,
  resolveDistrictName,
  availableDistricts,
}) {
  const selectedSet = new Set(selectedDistricts.map(normalizeName))

  const styleFeature = (feature) => {
    const rawName = getFeatureName(feature)
    const resolved = resolveDistrictName ? resolveDistrictName(rawName) : rawName
    const normalized = normalizeName(resolved)
    const isSelected = selectedSet.has(normalized)
    const metrics = districtMetrics?.[resolved]
    const intensity = metrics?.intensity ?? 0.15
    const distData = availableDistricts?.find((d) => normalizeName(d.name) === normalized)
    const riskClass = distData?.riskClass

    return {
      color: isSelected ? '#1c7ed6' : '#c8d2df',
      weight: showBorders ? (isSelected ? 3 : 1) : 0,
      fillColor: getFillColor(riskClass, intensity),
      fillOpacity: 0.75,
      opacity: 0.9,
    }
  }

  const onEachFeature = (feature, layer) => {
    const rawName = getFeatureName(feature)
    const resolved = resolveDistrictName ? resolveDistrictName(rawName) : rawName
    const metrics = districtMetrics?.[resolved]
    const fallback = DISTRICTS.find((district) => district.name === resolved)
    const distData = availableDistricts?.find((d) => normalizeName(d.name) === normalizeName(resolved))
    const population = metrics?.population ?? distData?.population ?? fallback?.population
    const cases = metrics?.cases
    const riskScore = distData?.newsEnrichedRiskScore
    const populationLabel = Number.isFinite(population)
      ? Math.round(population).toLocaleString()
      : 'N/A'
    const casesLabel = Number.isFinite(cases)
      ? Math.round(cases).toLocaleString()
      : 'N/A'

    const popupContent = `
      <div class="map-popup">
        <strong>${resolved || 'Unknown district'}</strong><br />
        <span>Population: ${populationLabel}</span><br />
        <span>Risk Class: ${distData?.riskClass || 'N/A'}</span><br />
        <span>Risk Score: ${Number.isFinite(riskScore) ? riskScore.toFixed(2) : 'N/A'}</span><br />
        <span>Active cases: ${casesLabel}</span>
      </div>
    `

    layer.bindTooltip(resolved, {
      sticky: true,
      direction: 'top',
      className: 'district-tooltip',
    })

    layer.bindPopup(popupContent)

    layer.on({
      mouseover: () => {
        layer.setStyle({
          weight: showBorders ? 3 : 1,
          color: '#4dabf7',
          fillOpacity: 0.88,
        })
      },
      mouseout: () => {
        layer.setStyle(styleFeature(feature))
      },
      click: () => {
        if (resolved) onToggleDistrict(resolved)
      },
    })
  }

  return <GeoJSON data={geoData} style={styleFeature} onEachFeature={onEachFeature} />
}

export default DistrictLayer
