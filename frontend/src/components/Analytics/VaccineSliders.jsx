import AnimatedCounter from '../shared/AnimatedCounter.jsx'

const formatNumber = (value) => Math.round(value).toLocaleString()

function VaccineSliders({
  selectedDistricts,
  vaccineAllocations,
  setVaccineAllocation,
  totalVaccines,
}) {
  if (selectedDistricts.length === 0) {
    return <p className="empty-state">Select districts to unlock allocation controls.</p>
  }

  const totalAssigned = selectedDistricts.reduce((sum, district) => {
    return sum + (vaccineAllocations[district.name] ?? 0)
  }, 0)

  return (
    <div className="vaccine-sliders">
      {selectedDistricts.map((district) => {
        const value = vaccineAllocations[district.name] ?? 0
        const percent = totalVaccines ? (value / totalVaccines) * 100 : 0
        const othersTotal = totalAssigned - value
        const maxValue = Math.max(0, totalVaccines - othersTotal)
        return (
          <div key={district.name} className="slider-row">
            <div className="slider-header">
              <div>
                <h3>{district.name}</h3>
                <p>{district.division} Division</p>
              </div>
              <div className="slider-value">
                <AnimatedCounter
                  value={value}
                  format={(val) => formatNumber(val)}
                />
                <span> doses</span>
              </div>
            </div>
            <input
              className="slider"
              type="range"
              min={0}
              max={maxValue}
              value={value}
              onChange={(event) =>
                setVaccineAllocation(district.name, Number(event.target.value))
              }
              aria-label={`${district.name} allocation`}
            />
            <div className="slider-footer">
              <span>{percent.toFixed(1)}%</span>
              <span>{totalVaccines.toLocaleString()} total</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default VaccineSliders
