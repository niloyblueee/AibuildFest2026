function Header({ currentWeek, selectedCount, isPlaying, apiStatus }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <p className="app-title">EpiPredict BD</p>
          <p className="app-subtitle">Disease Spread Prediction Simulator</p>
        </div>
      </div>
      <div className="header-meta">
        {apiStatus && (
          <span className={`meta-chip ${apiStatus.state === 'error' ? 'error' : apiStatus.state === 'loading' ? 'loading' : 'ready'}`}>
            API: {apiStatus.state}
          </span>
        )}
        <span className="meta-chip">Week {currentWeek}</span>
        <span className="meta-chip">{selectedCount} districts</span>
        <span className={`meta-pill ${isPlaying ? 'active' : ''}`}>
          {isPlaying ? 'Simulation live' : 'Paused'}
        </span>
      </div>
    </header>
  )
}

export default Header
