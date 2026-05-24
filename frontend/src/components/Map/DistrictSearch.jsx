import { useMemo, useState } from 'react'
import { searchDistricts } from '../../data/districtData'

function DistrictSearch({ selectedDistricts, onAddDistrict, onRemoveDistrict }) {
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    if (!query) return []
    const selected = new Set(selectedDistricts)
    return searchDistricts(query)
      .filter((district) => !selected.has(district.name))
      .slice(0, 6)
  }, [query, selectedDistricts])

  return (
    <div className="district-search map-overlay-card">
      <p className="overlay-label">District search</p>
      <input
        className="search-input"
        type="search"
        placeholder="Search 64 districts"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {suggestions.length > 0 ? (
        <div className="search-results">
          {suggestions.map((district) => (
            <button
              key={district.name}
              type="button"
              className="search-result"
              onClick={() => {
                onAddDistrict(district)
                setQuery('')
              }}
            >
              <span>{district.name}</span>
              <span className="muted">{district.division}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="selected-tags">
        {selectedDistricts.length === 0 ? (
          <span className="muted">No districts selected yet.</span>
        ) : (
          selectedDistricts.map((name) => (
            <button
              key={name}
              type="button"
              className="tag"
              onClick={() => onRemoveDistrict(name)}
            >
              {name}
              <span aria-hidden="true">x</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default DistrictSearch
