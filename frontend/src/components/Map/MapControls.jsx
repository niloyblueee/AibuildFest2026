function MapControls({
  showDots,
  showBorders,
  onToggleDots,
  onToggleBorders,
  playbackSpeed,
  onSpeedChange,
}) {
  return (
    <div className="map-controls map-overlay-card">
      <p className="overlay-label">Map layers</p>
      <div className="control-group">
        <button
          type="button"
          className={`control-button ${showDots ? 'active' : ''}`}
          onClick={onToggleDots}
        >
          Infection dots
        </button>
        <button
          type="button"
          className={`control-button ${showBorders ? 'active' : ''}`}
          onClick={onToggleBorders}
        >
          District borders
        </button>
      </div>
      <div className="control-group">
        <p className="overlay-label">Playback speed</p>
        <div className="speed-toggle">
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              type="button"
              className={`speed-pill ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapControls
