import { CircleMarker } from 'react-leaflet'

function InfectionMarkers({ points }) {
  return (
    <>
      {points.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.lat, point.lng]}
          radius={3 + point.intensity * 4}
          pathOptions={{
            className: 'infection-dot',
            color: '#ff6b6b',
            fillColor: '#ff6b6b',
            fillOpacity: 0.25 + point.intensity * 0.55,
            weight: 0,
          }}
        />
      ))}
    </>
  )
}

export default InfectionMarkers
