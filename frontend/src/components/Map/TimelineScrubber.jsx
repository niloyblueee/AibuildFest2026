function TimelineScrubber({
  currentWeek,
  setCurrentWeek,
  isPlaying,
  togglePlayback,
}) {
  return (
    <div className="timeline-scrubber map-overlay-card">
      <div className="timeline-header">
        <div>
          <p className="overlay-label">Timeline</p>
          <p className="week-label">Week {currentWeek}</p>
        </div>
        <button
          type="button"
          className={`play-button ${isPlaying ? 'active' : ''}`}
          onClick={togglePlayback}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <input
        className="timeline-range"
        type="range"
        min={1}
        max={52}
        value={currentWeek}
        onChange={(event) => setCurrentWeek(Number(event.target.value))}
      />
      <div className="timeline-scale">
        <span>Week 1</span>
        <span>Week 52</span>
      </div>
    </div>
  )
}

export default TimelineScrubber
