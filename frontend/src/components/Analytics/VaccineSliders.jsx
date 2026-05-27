import AnimatedCounter from '../shared/AnimatedCounter.jsx'

const formatNumber = (value) => Math.round(value).toLocaleString()

function VaccineSliders({
  selectedDistricts,
  vaccineAllocations,
  setVaccineAllocation,
  predictions,
}) {
  if (selectedDistricts.length === 0) {
    return <p className="empty-state">Select districts to unlock allocation controls.</p>
  }

  return (
    <div className="vaccine-sliders">
      {selectedDistricts.map((district) => {
        const value = vaccineAllocations[district.name] ?? 0
        const metrics = predictions?.byDistrict?.[district.name] || {}
        const baselineCases = metrics.baselineCases ?? 0
        const casesAverted = metrics.casesAverted ?? 0
        const currentCases = metrics.cases ?? baselineCases

        return (
          <div key={district.name} className="slider-row">
            <div className="slider-header">
              <div>
                <h3>{district.name}</h3>
                <p>{district.division} Division</p>
              </div>
              <div className="slider-value">
                <AnimatedCounter
                  value={currentCases}
                  format={(val) => formatNumber(val)}
                />
                <span style={{ fontSize: '12px', color: 'var(--gray-500)', marginLeft: '4px' }}>
                  predicted cases
                </span>
              </div>
            </div>

            <input
              className="slider"
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(event) =>
                setVaccineAllocation(district.name, Number(event.target.value))
              }
              aria-label={`${district.name} coverage percentage`}
            />

            <div className="slider-footer">
              <span style={{ fontWeight: 'bold', color: 'var(--blue-dark)' }}>
                Coverage: {value}%
              </span>
              <span style={{ color: casesAverted > 0 ? 'var(--green-success)' : 'var(--gray-500)' }}>
                {casesAverted > 0 ? `-${formatNumber(casesAverted)} cases averted` : 'No cases averted'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default VaccineSliders
