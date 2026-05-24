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

const getFillColor = (intensity) => {
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
}) {
  const selectedSet = new Set(selectedDistricts.map(normalizeName))

  const styleFeature = (feature) => {
    const rawName = getFeatureName(feature)
    const resolved = resolveDistrictName ? resolveDistrictName(rawName) : rawName
    const normalized = normalizeName(resolved)
    const isSelected = selectedSet.has(normalized)
    const metrics = districtMetrics?.[resolved]
    const intensity = metrics?.intensity ?? 0.15

    return {
      color: isSelected ? '#1c7ed6' : '#c8d2df',
      weight: showBorders ? (isSelected ? 3 : 1) : 0,
      fillColor: getFillColor(intensity),
      fillOpacity: 0.75,
      opacity: 0.9,
    }
  }

  const onEachFeature = (feature, layer) => {
    const rawName = getFeatureName(feature)
    const resolved = resolveDistrictName ? resolveDistrictName(rawName) : rawName
    const metrics = districtMetrics?.[resolved]
    const fallback = DISTRICTS.find((district) => district.name === resolved)
    const population = metrics?.population ?? fallback?.population
    const cases = metrics?.cases

    const popupContent = `
      <div class="map-popup">
        <strong>${resolved || 'Unknown district'}</strong><br />
        <span>Population: ${population ? population.toLocaleString() : 'N/A'}</span><br />
        <span>Active cases: ${cases ? Math.round(cases).toLocaleString() : 'N/A'}</span>
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
