function SuggestionPanel({
  selectedDistricts,
  scenarioName,
  requestSuggestions,
  suggestions,
  suggestionsStatus,
}) {
  const hasDistricts = selectedDistricts.length > 0

  const formatNumber = (value) => Math.round(value).toLocaleString()

  return (
    <div className="suggestion-panel">
      <div className="suggestion-header">
        <button
          type="button"
          className="suggestion-button"
          onClick={requestSuggestions}
          disabled={!hasDistricts || suggestionsStatus.state === 'loading'}
        >
          {suggestionsStatus.state === 'loading'
            ? 'Generating optimal plans...'
            : 'Generate optimal vaccine distribution'}
        </button>
        {!hasDistricts && (
          <p className="suggestion-empty">Select at least one district to generate suggestions.</p>
        )}
      </div>

      {suggestionsStatus.state === 'error' && (
        <p className="suggestion-error">{suggestionsStatus.error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="suggestion-list">
          {suggestions.map((suggestion, index) => (
            <article key={index} className="suggestion-card">
              <div className="suggestion-card-header">
                <span>Option {index + 1}</span>
                <span className="suggestion-badge">Risk {suggestion.risk_score.toFixed(1)}</span>
              </div>
              <div className="suggestion-summary">
                <div>
                  <strong>{Math.round(suggestion.totals.cases_7d)}</strong> cases 7d
                </div>
                <div>
                  <strong>{Math.round(suggestion.totals.cases_14d)}</strong> cases 14d
                </div>
                <div>
                  <strong>{Math.round(suggestion.totals.deaths_7d)}</strong> deaths 7d
                </div>
                <div>
                  <strong>{Math.round(suggestion.cases_averted_14d)}</strong> averted 14d
                </div>
              </div>
              <div className="suggestion-plan">
                {(suggestion.allocation_plan || suggestion.coverage_plan).map((entry) => {
                  const label = entry.allocation_pct !== undefined
                    ? `${entry.allocation_pct}% of total supply`
                    : `${entry.coverage_children_pct}% coverage`

                  return (
                    <div key={entry.district} className="suggestion-plan-row">
                      <span>{entry.district}</span>
                      <span>
                        {label}
                        {entry.allocated_doses !== undefined && (
                          <span style={{ color: 'var(--gray-500)', marginLeft: '6px', fontSize: '12px' }}>
                            ({formatNumber(entry.allocated_doses)} doses)
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default SuggestionPanel
