# Disease Spread Prediction Simulator — Implementation Plan

A modern, ultra-clean, white-themed dashboard for ML-powered disease spread prediction across Bangladesh districts.

---

## Existing State

- **Frontend**: Vite + React 19 scaffold at [frontend/](file:///d:/AibuildFest2026/frontend)
- **Backend**: Empty directory at [backend/](file:///d:/AibuildFest2026/backend)
- **Dependencies installed**: Only `react` and `react-dom`

---

## Proposed Changes

### Phase 1 — Dependencies & Data

#### [MODIFY] [package.json](file:///d:/AibuildFest2026/frontend/package.json)

Install the following npm packages:

| Package | Purpose |
|---|---|
| `leaflet` | Interactive map rendering |
| `react-leaflet` | React bindings for Leaflet |
| `recharts` | Lightweight chart library (line, bar, area) |
| `framer-motion` | Smooth animations & transitions |

> [!NOTE]
> **No backend needed for Phase 1.** All simulation logic (mock ML predictions) will run client-side with deterministic formulas. This keeps the app fully self-contained and demonstrable. Backend/Express can be added later for real ML model integration.

#### [NEW] [bangladeshDistricts.json](file:///d:/AibuildFest2026/frontend/src/data/bangladeshDistricts.json)

GeoJSON data for all 64 Bangladesh districts (Admin Level 2). Source: [yasserius/bangladesh_geojson_shapefile](https://github.com/yasserius/bangladesh_geojson_shapefile) on GitHub. Will be downloaded and placed as a static JSON file in the project.

#### [NEW] [districtData.js](file:///d:/AibuildFest2026/frontend/src/data/districtData.js)

Static metadata for all 64 districts:
- District name, division, population estimate
- Centroid coordinates (lat/lng)
- Base infection rate, healthcare capacity index
- Used for autocomplete, map labels, and simulation parameters

---

### Phase 2 — Design System & Core CSS

#### [MODIFY] [index.css](file:///d:/AibuildFest2026/frontend/src/index.css)

Global design tokens and base reset:

```css
/* Color palette */
--white: #ffffff;
--off-white: #f8f9fa;
--gray-50: #f1f3f5;
--gray-100: #e9ecef;
--gray-200: #dee2e6;
--gray-300: #ced4da;
--gray-500: #868e96;
--gray-700: #495057;
--gray-900: #212529;
--red-accent: #ff5a5a;
--red-light: #fff0f0;
--red-dark: #e03131;
--blue-medical: #4dabf7;
--blue-light: #e7f5ff;
--blue-dark: #1c7ed6;
--green-success: #51cf66;

/* Typography — Inter from Google Fonts */
/* Shadows, border-radius tokens */
/* Smooth transition defaults */
```

#### [NEW] [App.css](file:///d:/AibuildFest2026/frontend/src/App.css) (overwrite existing)

Main layout styles:
- Split-screen grid (`grid-template-columns: 1fr 1fr`)
- Responsive breakpoint at 1024px → stack vertically
- Mobile reorder (map goes to bottom)
- Card component styles with soft shadows
- Slider styles
- Chart container styles
- Floating overlay styles for map controls

---

### Phase 3 — Component Architecture

```
src/
├── components/
│   ├── Map/
│   │   ├── MapPanel.jsx          — Main map container with Leaflet
│   │   ├── MapPanel.css          — Map-specific styles
│   │   ├── DistrictLayer.jsx     — GeoJSON district polygons + hover
│   │   ├── InfectionMarkers.jsx  — Animated red dots / pulse markers
│   │   ├── MapControls.jsx       — Toggle buttons (heatmap, dots, borders)
│   │   ├── DistrictSearch.jsx    — Autocomplete search component
│   │   └── TimelineScrubber.jsx  — Play/pause timeline at bottom
│   │
│   ├── Analytics/
│   │   ├── AnalyticsPanel.jsx    — Right-side container
│   │   ├── AnalyticsPanel.css    — Analytics panel styles
│   │   ├── VaccineSliders.jsx    — Linked allocation sliders
│   │   ├── PredictionCards.jsx   — 6 stat cards with sparklines
│   │   ├── AIInsights.jsx        — Narrative text panel
│   │   └── StatCharts.jsx        — 4 compact Recharts graphs
│   │
│   └── shared/
│       ├── Header.jsx            — Top bar with app title + status
│       └── AnimatedCounter.jsx   — Number counter with animation
│
├── hooks/
│   └── useSimulation.js          — Core simulation engine hook
│
├── data/
│   ├── bangladeshDistricts.json  — GeoJSON boundaries
│   └── districtData.js           — District metadata + simulation helpers
│
├── App.jsx                       — Root layout component
├── App.css                       — Layout styles
├── index.css                     — Design system
└── main.jsx                      — Entry point
```

---

### Phase 3a — Map Components

#### [NEW] MapPanel.jsx + MapPanel.css

- Leaflet map initialized at Bangladesh center `[23.8, 90.4]`, zoom 7
- **Tile layer**: OpenStreetMap light/carto-positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`)
- Full height of viewport
- Floating overlays positioned with `position: absolute` inside map container

#### [NEW] DistrictLayer.jsx

- Renders GeoJSON polygons for all 64 districts
- Selected districts get:
  - Highlighted border (medical blue, weight 3)
  - Soft glow via CSS `filter: drop-shadow()`
  - Fill color based on infection intensity (white → soft red gradient)
  - District name label via Leaflet tooltip
- Hover shows popup with: district name, population, current infection count
- Click to select/deselect district

#### [NEW] InfectionMarkers.jsx

- Red `CircleMarker` dots scattered within selected districts
- Dot count increases based on simulation timeline week
- Opacity varies by infection intensity (0.3 → 0.9)
- Animated pulsing effect via CSS keyframes on marker elements
- Density controlled by simulation state

#### [NEW] MapControls.jsx

- Floating card (top-right of map) with toggle buttons:
  - Show/hide infection dots
  - Show/hide district borders
  - Timeline playback speed (1x, 2x, 4x)
- Glass-morphism card with backdrop-filter blur

#### [NEW] DistrictSearch.jsx

- Floating search input (top-left of map)
- Autocomplete dropdown listing all 64 districts
- Fuzzy-match filtering as user types
- Click to add district to selection
- Selected districts shown as removable chips/tags

#### [NEW] TimelineScrubber.jsx

- Bottom overlay bar on the map
- Range slider: Week 1 → Week 52
- Play/Pause button with animated icon
- Current week label
- Auto-advances when playing (setInterval)
- Smooth slider thumb animation

---

### Phase 3b — Analytics Components

#### [NEW] AnalyticsPanel.jsx + AnalyticsPanel.css

- Scrollable right panel, white background
- Sections stacked vertically with consistent spacing
- Soft gray dividers between sections
- Smooth scroll behavior

#### [NEW] VaccineSliders.jsx

- One slider per selected district
- Total vaccines fixed at 1000
- When one slider moves, others rebalance proportionally
- Shows: district name, slider, percentage, absolute count
- Large, accessible slider tracks with custom styling
- Real-time update as user drags
- Animated value counters

#### [NEW] PredictionCards.jsx

Six cards in a 2×3 or 3×2 grid:

| Card | Icon | Color |
|---|---|---|
| Predicted Cases | 📊 | Red accent |
| Infection Growth Rate | 📈 | Red accent |
| Vaccine Efficiency | 💉 | Medical blue |
| Mortality Reduction | ❤️ | Green |
| Hospital Load | 🏥 | Orange |
| Risk Index | ⚠️ | Red/amber |

Each card:
- Large number with animated counter
- Trend arrow (↑/↓) with color
- Mini sparkline (Recharts `<Sparkline>`)
- Soft shadow card with subtle hover lift

#### [NEW] AIInsights.jsx

- Card with AI icon header
- Dynamically generated narrative text based on current simulation state
- Template-based text generation using simulation parameters
- Typewriter-style animation on text changes (framer-motion)
- Scientific/clinical tone

#### [NEW] StatCharts.jsx

Four compact charts (Recharts):

1. **Infection Trend** — Line chart, weeks vs cases, red line
2. **Vaccine Efficiency** — Area chart, allocation vs reduction
3. **District Comparison** — Bar chart comparing selected districts
4. **Spread Acceleration** — Line chart showing rate of change

Styling:
- Light gray grid lines
- Soft red accent for infection data
- Medical blue for vaccine data
- Smooth `animationDuration` transitions
- Minimal axes, clean labels

---

### Phase 3c — Simulation Engine

#### [NEW] useSimulation.js

Custom React hook providing all simulation state:

```js
const {
  selectedDistricts,        // Array of district objects
  addDistrict,              // Add district to simulation
  removeDistrict,           // Remove district
  vaccineAllocations,       // { districtName: count }
  setVaccineAllocation,     // Update one slider
  totalVaccines,            // Fixed 1000
  currentWeek,              // 1-52
  setCurrentWeek,           // Manual scrub
  isPlaying,                // Timeline playing
  togglePlayback,           // Play/pause
  playbackSpeed,            // 1x, 2x, 4x
  predictions,              // Computed prediction cards data
  infectionData,            // Time-series for charts
  aiNarrative,              // Generated insight text
  districtInfectionPoints,  // Dot positions for map
} = useSimulation();
```

**Simulation logic** (deterministic mock ML):
- Base infection rate per district (from population density)
- Vaccine allocation reduces infection rate proportionally
- Growth modeled as logistic curve
- Each week compounds previous
- Hospital load = f(active cases, district capacity)
- Risk index = composite score
- AI narrative assembled from template strings with computed values

---

### Phase 4 — Entry Point & Layout

#### [MODIFY] [index.html](file:///d:/AibuildFest2026/frontend/index.html)

- Update `<title>` to "EpiPredict BD — Disease Spread Prediction Simulator"
- Add `<meta>` description for SEO
- Add Google Fonts link for Inter

#### [MODIFY] [App.jsx](file:///d:/AibuildFest2026/frontend/src/App.jsx)

Root component:
```jsx
<div className="app-container">
  <Header />
  <main className="dashboard">
    <div className="map-section">
      <MapPanel ... />
    </div>
    <div className="analytics-section">
      <AnalyticsPanel ... />
    </div>
  </main>
</div>
```

---

## User Review Required

> [!IMPORTANT]
> **No backend in this phase.** The simulation runs entirely client-side with deterministic formulas. The Express/Node backend can be added as Phase 2 to serve actual ML model predictions. Is this approach acceptable?

> [!IMPORTANT]
> **GeoJSON data source.** I'll download the 64-district GeoJSON from the `yasserius/bangladesh_geojson_shapefile` GitHub repo and include it as a static file (~500KB). This is real administrative boundary data, not fake.

> [!IMPORTANT]  
> **Map tile provider.** Using CartoDB Positron (light theme) tiles via `basemaps.cartocdn.com` — this is a free, no-API-key-required tile server that matches the white/light aesthetic perfectly. No Mapbox token needed.

---

## Open Questions

> [!NOTE]
> **App name.** I'm proposing "EpiPredict BD" as the application name shown in the header. Would you prefer a different name?

---

## Verification Plan

### Automated Tests
- `npm run build` — ensure clean production build with no errors
- `npm run dev` — verify dev server starts and loads correctly

### Manual Verification
- Verify map loads with Bangladesh districts visible
- Confirm district click/selection highlights polygons
- Test autocomplete search finds districts
- Drag vaccine sliders and verify linked rebalancing
- Confirm prediction cards update in real-time
- Verify timeline scrubber advances infection dots
- Check mobile responsiveness at 375px, 768px breakpoints
- Verify all animations are smooth and subtle
