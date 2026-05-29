import { useCallback, useEffect, useMemo, useState } from 'react'
import geoData from '../data/bangladeshDistricts.json'
import DISTRICTS, {
  DEFAULT_DISTRICTS,
  MAX_WEEKS,
  PLAYBACK_SPEEDS,
  DEFAULT_COVERAGE_PCT,
} from '../data/districtData'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const DISTRICT_ALIASES = {
  barishal: 'Barisal',
  bogura: 'Bogra',
  chattogram: 'Chittagong',
  cumilla: 'Comilla',
  jashore: 'Jessore',
  khagrachari: 'Khagrachhari',
  maulvibazar: 'Moulvibazar',
  sirajgonj: 'Sirajganj',
  coxsbazar: "Cox's Bazar",
}

const MAX_POINTS_PER_DISTRICT = 1200

const normalizeName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim()

const API_NAME_OVERRIDES = {
  barisal: 'Barishal',
  bogra: 'Bogura',
  chittagong: 'Chattogram',
  comilla: 'Cumilla',
  jessore: 'Jashore',
  coxsbazar: 'Coxs Bazar',
}

const resolveDistrictName = (name) => {
  if (!name) return ''
  const normalized = normalizeName(name)
  const alias = DISTRICT_ALIASES[normalized]
  if (alias) return alias
  const match = DISTRICTS.find(
    (district) => normalizeName(district.name) === normalized,
  )
  return match?.name ?? name
}

const toApiDistrictName = (name) => {
  if (!name) return ''
  const normalized = normalizeName(name)
  return API_NAME_OVERRIDES[normalized] ?? name
}

const getDistrictByName = (name) => {
  const resolved = resolveDistrictName(name)
  return DISTRICTS.find((district) => district.name === resolved) || null
}

const initializeCoverage = (names, pct = DEFAULT_COVERAGE_PCT) => {
  return names.reduce((acc, name) => {
    acc[name] = pct
    return acc
  }, {})
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const createRng = (seed) => {
  let state = seed || 1
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const getFeatureName = (feature) => {
  const props = feature?.properties || {}
  return (
    props.shapeName ||
    props.NAME_2 ||
    props.NAME_1 ||
    props.NAME ||
    props.district ||
    props.DISTRICT ||
    props.NAME_EN ||
    ''
  )
}

const extractPolygons = (geometry) => {
  if (!geometry) return []
  if (geometry.type === 'Polygon') {
    return geometry.coordinates?.length ? [geometry.coordinates[0]] : []
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates?.map((poly) => poly[0]).filter(Boolean) || []
  }
  return []
}

const buildDistrictShapes = () => {
  const shapes = new Map()
  const features = geoData?.features || []

  features.forEach((feature) => {
    const rawName = getFeatureName(feature)
    const resolved = resolveDistrictName(rawName)
    if (!resolved) return
    const normalized = normalizeName(resolved)
    const polygons = extractPolygons(feature.geometry)
    if (!polygons.length) return

    const polygonShapes = polygons.map((ring) => {
      let minLat = Infinity
      let maxLat = -Infinity
      let minLng = Infinity
      let maxLng = -Infinity
      ring.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
      })
      return { ring, bbox: { minLat, maxLat, minLng, maxLng } }
    })

    if (!shapes.has(normalized)) {
      shapes.set(normalized, [])
    }
    shapes.get(normalized).push(...polygonShapes)
  })

  return shapes
}

const DISTRICT_SHAPES = buildDistrictShapes()
const DISTRICT_POINT_CACHE = new Map()

const pointInPolygon = (point, ring) => {
  let inside = false
  const x = point.lng
  const y = point.lat
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

const samplePointInShapes = (shapes, rng) => {
  if (!shapes || shapes.length === 0) return null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const shapeIndex = Math.floor(rng() * shapes.length)
    const shape = shapes[shapeIndex]
    const { bbox, ring } = shape
    const lng = bbox.minLng + rng() * (bbox.maxLng - bbox.minLng)
    const lat = bbox.minLat + rng() * (bbox.maxLat - bbox.minLat)
    const point = { lat, lng }
    if (pointInPolygon(point, ring)) return point
  }
  return null
}

const buildDistrictPoints = (district) => {
  const normalized = normalizeName(district.name)
  const shapes = DISTRICT_SHAPES.get(normalized)
  const points = []
  const rng = createRng(hashString(district.name))
  for (let i = 0; i < MAX_POINTS_PER_DISTRICT; i += 1) {
    const sampled = samplePointInShapes(shapes, rng)
    if (sampled) {
      points.push(sampled)
    } else {
      const jitter = rng()
      const jitter2 = rng()
      points.push({
        lat: district.lat + (jitter - 0.5) * 0.4,
        lng: district.lng + (jitter2 - 0.5) * 0.45,
      })
    }
  }
  return points
}

const getDistrictPoints = (district) => {
  if (DISTRICT_POINT_CACHE.has(district.name)) {
    return DISTRICT_POINT_CACHE.get(district.name)
  }
  const points = buildDistrictPoints(district)
  DISTRICT_POINT_CACHE.set(district.name, points)
  return points
}

const buildNarrative = ({
  currentWeek,
  topDistrict,
  growthRate,
  vaccineEfficiency,
  hospitalLoad,
}) => {
  if (!topDistrict) {
    return 'Select districts to generate localized AI guidance.'
  }

  const trend = growthRate > 0 ? 'accelerating' : 'stabilizing'
  const loadLabel = hospitalLoad > 75 ? 'critical' : 'manageable'
  return `Week ${currentWeek} shows ${trend} transmission with ${topDistrict} leading projected cases. Vaccine allocation yields an estimated ${vaccineEfficiency.toFixed(
    1,
  )}% efficiency, keeping hospital load in the ${loadLabel} range. Adjust doses to ease pressure on high-growth districts.`
}

const buildWeeklySeries = ({ cases7d, cases14d, seed }) => {
  if (!cases7d || cases7d <= 0) {
    return Array.from({ length: MAX_WEEKS }, () => 0)
  }
  const average14d = cases14d && cases14d > 0 ? cases14d / 2 : cases7d
  const ratio = average14d / Math.max(cases7d, 1)
  const weeklyGrowth = clamp(ratio - 1, -0.15, 0.25)
  const rng = createRng(hashString(seed || 'series'))

  const scaleAt = (week) => 0.7 + 0.9 / (1 + Math.exp(-0.12 * (week - 26)))
  const baseScale = scaleAt(1)

  return Array.from({ length: MAX_WEEKS }, (_, index) => {
    const week = index + 1
    const scale = scaleAt(week) / baseScale
    const trend = 1 + weeklyGrowth * (week - 1) / 10
    const jitter = 1 + (rng() - 0.5) * 0.06
    return Math.max(0, cases7d * scale * trend * jitter)
  })
}

function useSimulation() {
  const [availableDistricts, setAvailableDistricts] = useState(DISTRICTS)
  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    const defaults = DEFAULT_DISTRICTS.map(getDistrictByName).filter(Boolean)
    return defaults.length > 0 ? defaults : DISTRICTS.slice(0, 2)
  })
  const [scenarioName, setScenarioName] = useState('observed_baseline')
  const [totalVaccineInStore, setTotalVaccineInStore] = useState(5000000)
  const [vaccineAllocations, setVaccineAllocations] = useState(() =>
    initializeCoverage(selectedDistricts.map((district) => district.name), 0),
  )
  const [currentWeek, setCurrentWeek] = useState(12)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEEDS[0])
  const [modelResults, setModelResults] = useState({})
  const [apiStatus, setApiStatus] = useState({ state: 'idle', error: null })

  const remainingVaccine = useMemo(() => {
    const allocated = Object.values(vaccineAllocations).reduce((sum, val) => sum + val, 0)
    return Math.max(0, totalVaccineInStore - allocated)
  }, [totalVaccineInStore, vaccineAllocations])

  useEffect(() => {
    fetch(`${API_BASE}/districts`)
      .then(res => res.json())
      .then(data => {
        if (data.districts && data.districts.length > 0) {
          // Map backend data format to frontend expectations
          const mapped = data.districts.map(d => ({
            name: d.name,
            division: d.division,
            population: d.population,
            riskClass: d.risk_class,
            newsEnrichedRiskScore: d.news_enriched_risk_score,
            lat: getDistrictByName(d.name)?.lat || 23.8, // Fallback to existing
            lng: getDistrictByName(d.name)?.lng || 90.4,
            baseInfectionRate: 0.04,
            healthcareCapacity: 0.5
          }))
          setAvailableDistricts(mapped)
        }
      })
      .catch(console.error)
  }, [])


  const addDistrict = useCallback((value) => {
    const district = typeof value === 'string' ? getDistrictByName(value) : value
    if (!district) return
    setSelectedDistricts((prev) => {
      if (prev.find((item) => item.name === district.name)) return prev
      return [...prev, district]
    })
  }, [])

  const removeDistrict = useCallback((name) => {
    const resolved = resolveDistrictName(name)
    setSelectedDistricts((prev) =>
      prev.filter((item) => item.name !== resolved),
    )
  }, [])

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])



  useEffect(() => {
    if (selectedDistricts.length === 0) {
      setModelResults({})
      return undefined
    }

    let isActive = true
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setApiStatus({ state: 'loading', error: null })
      try {
        const requests = selectedDistricts.map((district) => {
          const allocationAmount = vaccineAllocations[district.name] ?? 0
          const coveragePct = clamp((allocationAmount / (district.population || 1)) * 100, 0, 100)
          return {
            district: toApiDistrictName(district.name),
            scenario_name: scenarioName,
            coverage_children_pct: coveragePct,
            coverage_population_pct: coveragePct,
            include_daily: true,
            include_hourly: false,
          }
        })

        const response = await fetch(`${API_BASE}/batch-predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || response.statusText)
        }

        const data = await response.json()
        if (!isActive) return

        const next = {}
        const results = data?.results ?? []
        results.forEach((result) => {
          const resolved = resolveDistrictName(result.district)
          if (resolved) next[resolved] = result
        })

        setModelResults((prev) => {
          const merged = {}
          selectedDistricts.forEach((district) => {
            merged[district.name] = next[district.name] ?? prev[district.name]
          })
          return merged
        })
        setApiStatus({ state: 'ready', error: null })
      } catch (err) {
        if (!isActive) return
        setApiStatus({ state: 'error', error: err?.message || 'Prediction failed' })
      }
    }, 300)

    return () => {
      isActive = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [selectedDistricts, vaccineAllocations, scenarioName])

  useEffect(() => {
    if (!isPlaying) return undefined
    const interval = 1000 / playbackSpeed
    const id = setInterval(() => {
      setCurrentWeek((prev) => (prev >= MAX_WEEKS ? 1 : prev + 1))
    }, interval)
    return () => clearInterval(id)
  }, [isPlaying, playbackSpeed])

  const setVaccineAllocation = useCallback(
    (name, value) => {
      setVaccineAllocations((prev) => {
        const otherAllocations = Object.entries(prev).reduce((sum, [k, v]) => {
          return k !== name ? sum + v : sum
        }, 0)
        const maxAllowed = Math.max(0, totalVaccineInStore - otherAllocations)
        const val = Math.min(Math.max(0, Math.round(value)), maxAllowed)
        return {
          ...prev,
          [name]: val
        }
      })
    },
    [totalVaccineInStore],
  )

  const weeklySeriesByDistrict = useMemo(() => {
    const series = {}
    selectedDistricts.forEach((district) => {
      const result = modelResults[district.name]
      const scenario = result?.scenario ?? result?.baseline
      if (!scenario) return
      const cases7d = scenario.cases_7d ?? 0
      const cases14d = scenario.cases_14d ?? 0
      series[district.name] = buildWeeklySeries({
        cases7d,
        cases14d,
        seed: district.name,
      })
    })
    return series
  }, [selectedDistricts, modelResults])

  const getCasesForWeek = useCallback(
    (districtName, week) => {
      const series = weeklySeriesByDistrict[districtName]
      if (series && series.length >= week) return series[week - 1]
      const fallback = modelResults[districtName]?.scenario
      return fallback?.cases_7d ?? 0
    },
    [weeklySeriesByDistrict, modelResults],
  )

  const predictions = useMemo(() => {
    if (selectedDistricts.length === 0) {
      return {
        totalCases: 0,
        growthRate: 0,
        vaccineEfficiency: 0,
        mortalityReduction: 0,
        hospitalLoad: 0,
        riskIndex: 0,
        byDistrict: {},
      }
    }

    const byDistrict = {}
    let totalCases = 0
    let totalConfirmed = 0
    let totalDeaths = 0
    let totalHospitalLoad = 0
    let totalRisk = 0
    let baseRateSum = 0
    let adjustedRateSum = 0
    let baselineTotal = 0
    let scenarioTotal = 0

    selectedDistricts.forEach((district) => {
      const vaccines = vaccineAllocations[district.name] ?? 0
      const cases = getCasesForWeek(district.name, currentWeek)
      
      // Vaccine takes ~2 weeks for full immunity. 
      // Week 1: 0%, Week 2: 50%, Week 3+: 100%
      const efficacyFactor = currentWeek <= 1 ? 0 : currentWeek === 2 ? 0.5 : 1
      const effectiveVaccineShare = clamp(vaccines / (district.population || 1), 0, 1) * efficacyFactor
      
      const vaccineShield = 0.18 + effectiveVaccineShare * 0.62
      const adjustedRate = district.baseInfectionRate * (1 - vaccineShield)
      
      // Research: ~25% of cases need hospitalization. Avg stay is 4.8 days (4.8/7 weeks).
      const activeCases = cases * 0.25 * (4.8 / 7)
      const capacity = district.population * district.healthcareCapacity * 0.00005
      const hospitalLoad = clamp((activeCases / capacity) * 100, 0, 100)
      const riskIndex = clamp(
        hospitalLoad * 0.6 + adjustedRate * 1200 + (1 - district.healthcareCapacity) * 20,
        0,
        100,
      )
      const intensity = clamp(cases / (district.population * 0.085), 0.1, 1)

      const result = modelResults[district.name]
      const baselineCases = result?.baseline?.cases_7d ?? 0
      const scenarioCases = result?.scenario?.cases_7d ?? baselineCases
      const casesAverted = baselineCases - scenarioCases
      baselineTotal += baselineCases
      scenarioTotal += scenarioCases
      
      const ratio = scenarioCases > 0 ? cases / scenarioCases : 1

      byDistrict[district.name] = {
        cases,
        activeCases,
        hospitalLoad,
        riskIndex,
        intensity,
        vaccineShare: effectiveVaccineShare,
        adjustedRate,
        population: district.population,
        baselineCases,
        casesAverted
      }

      totalCases += cases
      
      const conf_7d = result?.scenario?.confirmed_7d ?? (result?.baseline?.confirmed_7d ?? 0)
      const death_7d = result?.scenario?.deaths_7d ?? (result?.baseline?.deaths_7d ?? 0)
      totalConfirmed += conf_7d * ratio
      totalDeaths += death_7d * ratio
      
      totalHospitalLoad += hospitalLoad
      totalRisk += riskIndex
      baseRateSum += district.baseInfectionRate
      adjustedRateSum += adjustedRate
    })

    const previousWeek = Math.max(1, currentWeek - 1)
    const previousCases = selectedDistricts.reduce((sum, district) => {
      return sum + getCasesForWeek(district.name, previousWeek)
    }, 0)
    const growthRate = previousCases
      ? ((totalCases - previousCases) / previousCases) * 100
      : 0

    const vaccineEfficiency = baselineTotal
      ? clamp((1 - scenarioTotal / baselineTotal) * 100, 0, 100)
      : clamp((1 - adjustedRateSum / baseRateSum) * 100, 0, 100)
    const hospitalLoad = totalHospitalLoad / selectedDistricts.length
    const riskIndex = totalRisk / selectedDistricts.length
    const mortalityReduction = clamp(
      vaccineEfficiency * 0.65 + (100 - hospitalLoad) * 0.12,
      0,
      100,
    )

    return {
      totalCases,
      totalConfirmed,
      totalDeaths,
      growthRate,
      vaccineEfficiency,
      mortalityReduction,
      hospitalLoad,
      riskIndex,
      byDistrict,
    }
  }, [
    selectedDistricts,
    vaccineAllocations,
    currentWeek,
    modelResults,
    getCasesForWeek,
  ])

  const infectionData = useMemo(() => {
    if (selectedDistricts.length === 0) return []
    const data = []
    for (let week = 1; week <= MAX_WEEKS; week += 1) {
      const total = selectedDistricts.reduce((sum, district) => {
        return sum + getCasesForWeek(district.name, week)
      }, 0)
      const previous = week > 1 ? data[data.length - 1].cases : total
      const growth = previous ? ((total - previous) / previous) * 100 : 0
      const acceleration = week > 2 ? growth - data[data.length - 1].growth : 0
      data.push({ week, cases: total, growth, acceleration })
    }
    return data
  }, [selectedDistricts, getCasesForWeek])

  const districtComparison = useMemo(() => {
    return selectedDistricts.map((district) => ({
      name: district.name,
      cases: predictions.byDistrict[district.name]?.cases ?? 0,
      vaccines: vaccineAllocations[district.name] ?? 0,
    }))
  }, [selectedDistricts, predictions.byDistrict, vaccineAllocations])

  const vaccineData = useMemo(() => {
    return selectedDistricts.map((district) => {
      const baselineCases = modelResults[district.name]?.baseline?.cases_7d
      const scenarioCases =
        modelResults[district.name]?.scenario?.cases_7d ?? baselineCases
      const efficiency = baselineCases
        ? clamp((1 - scenarioCases / baselineCases) * 100, 0, 100)
        : 0
      return {
        name: district.name,
        efficiency,
        vaccines: vaccineAllocations[district.name] ?? 0,
      }
    })
  }, [selectedDistricts, modelResults, vaccineAllocations])

  const aiNarrative = useMemo(() => {
    if (selectedDistricts.length === 0) return ''
    const topDistrict = [...selectedDistricts].sort((a, b) => {
      const aCases = predictions.byDistrict[a.name]?.cases ?? 0
      const bCases = predictions.byDistrict[b.name]?.cases ?? 0
      return bCases - aCases
    })[0]?.name

    return buildNarrative({
      currentWeek,
      topDistrict,
      growthRate: predictions.growthRate,
      vaccineEfficiency: predictions.vaccineEfficiency,
      hospitalLoad: predictions.hospitalLoad,
    })
  }, [selectedDistricts, predictions, currentWeek])

  const districtInfectionPoints = useMemo(() => {
    return selectedDistricts.flatMap((district) => {
      const metrics = predictions.byDistrict[district.name]
      const intensity = metrics?.intensity ?? 0.2
      const vaccines = vaccineAllocations[district.name] ?? 0
      const vaccineShare = clamp(vaccines / (district.population || 1), 0, 1)
      const baseCount = MAX_POINTS_PER_DISTRICT
      const count = Math.round(
        clamp(baseCount * (1 - vaccineShare), 0, MAX_POINTS_PER_DISTRICT),
      )
      const points = getDistrictPoints(district).slice(0, count)
      return points.map((point, index) => ({
        id: `${district.name}-${index}`,
        lat: point.lat,
        lng: point.lng,
        intensity,
      }))
    })
  }, [selectedDistricts, predictions.byDistrict, vaccineAllocations])

  const signals = useMemo(() => {
    if (selectedDistricts.length === 0) {
      return {
        rtEstimate: 0,
        testPositivityRate: 0,
        zeroDoseRiskScore: 0,
        stockoutRiskScore: 0,
      }
    }
    const rows = selectedDistricts
      .map((district) => modelResults[district.name]?.signals)
      .filter(Boolean)

    const average = (key) => {
      const values = rows
        .map((row) => Number(row?.[key]))
        .filter((value) => Number.isFinite(value))
      if (values.length === 0) return 0
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    const baseRt = average('rt_estimate')
    const baseTp = average('test_positivity_rate')
    const baseZd = average('zero_dose_risk_score')
    const baseSr = average('stockout_risk_score')

    const growthFactor = 1 + (predictions.growthRate / 100)
    
    let totalVaccines = 0
    let totalPop = 0
    selectedDistricts.forEach(d => {
      totalVaccines += (vaccineAllocations[d.name] ?? 0)
      totalPop += d.population || 1
    })
    const avgVaccineShare = clamp(totalVaccines / totalPop, 0, 1)
    const allocatedRatio = totalVaccineInStore > 0 ? clamp(totalVaccines / totalVaccineInStore, 0, 1) : 1

    return {
      rtEstimate: baseRt * growthFactor,
      testPositivityRate: baseTp * growthFactor,
      zeroDoseRiskScore: baseZd * (1 - avgVaccineShare * 0.8),
      stockoutRiskScore: baseSr * (0.5 + 0.5 * allocatedRatio),
    }
  }, [selectedDistricts, modelResults, predictions.growthRate, vaccineAllocations, totalVaccineInStore])

  return {
    selectedDistricts,
    addDistrict,
    removeDistrict,
    vaccineAllocations,
    setVaccineAllocation,
    totalVaccineInStore,
    setTotalVaccineInStore,
    remainingVaccine,
    setScenarioName,
    scenarioName,
    availableDistricts,
    currentWeek,
    setCurrentWeek,
    isPlaying,
    togglePlayback,
    playbackSpeed,
    setPlaybackSpeed,
    predictions,
    infectionData,
    vaccineData,
    districtComparison,
    spreadAcceleration: infectionData.map(({ week, acceleration }) => ({
      week,
      acceleration,
    })),
    aiNarrative,
    districtInfectionPoints,
    resolveDistrictName,
    signals,
    apiStatus,
  }
}

export default useSimulation
