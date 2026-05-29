import AnimatedCounter from '../shared/AnimatedCounter.jsx'

const formatNumber = (value) => Math.round(value).toLocaleString()

function VaccineSliders({
  selectedDistricts,
  vaccineAllocations,
  setVaccineAllocation,
  totalVaccineInStore,
  setTotalVaccineInStore,
  remainingVaccine,
  predictions,
}) {
  if (selectedDistricts.length === 0) {
    return <p className="empty-state">Select districts to unlock allocation controls.</p>
  }

  return (
    <div className="vaccine-sliders">
      <div className="store-controls" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label htmlFor="total-store" style={{ fontWeight: 'bold' }}>Total Vaccine in Store</label>
          <span style={{ fontWeight: 'bold', color: 'var(--blue-dark)' }}>{formatNumber(remainingVaccine)} remaining</span>
        </div>
        <input
          id="total-store"
          type="number"
          min={0}
          value={totalVaccineInStore}
          onChange={(e) => setTotalVaccineInStore(Math.max(0, Number(e.target.value)))}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--gray-300)' }}
        />
      </div>

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
              max={district.population ? Math.min(district.population, value + remainingVaccine) : value + remainingVaccine}
              value={value}
              onChange={(event) =>
                setVaccineAllocation(district.name, Number(event.target.value))
              }
              aria-label={`${district.name} allocation`}
            />

            <div className="slider-footer">
              <span style={{ fontWeight: 'bold', color: 'var(--blue-dark)' }}>
                Allocated: {formatNumber(value)} {district.population ? `(${(value / district.population * 100).toFixed(1)}%)` : ''}
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
