import { useCallback, useEffect, useMemo, useState } from 'react'
import geoData from '../data/bangladeshDistricts.json'
import DISTRICTS, {
  DEFAULT_DISTRICTS,
  MAX_WEEKS,
  PLAYBACK_SPEEDS,
  TOTAL_VACCINES,
} from '../data/districtData'

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

const MAX_POINTS_PER_DISTRICT = 5000

const normalizeName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim()

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

const getDistrictByName = (name) => {
  const resolved = resolveDistrictName(name)
  return DISTRICTS.find((district) => district.name === resolved) || null
}

const allocateEvenly = (names) => {
  if (names.length === 0) return {}
  const base = Math.floor(TOTAL_VACCINES / names.length)
  const remainder = TOTAL_VACCINES - base * names.length
  return names.reduce((acc, name, index) => {
    acc[name] = base + (index < remainder ? 1 : 0)
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

const computeLogistic = (week) => 1 / (1 + Math.exp(-0.18 * (week - 24)))

const computeCases = ({ district, week, vaccines }) => {
  const vaccineShare = vaccines / TOTAL_VACCINES
  const vaccineShield = 0.18 + vaccineShare * 0.62
  const adjustedRate = district.baseInfectionRate * (1 - vaccineShield)
  const growth = computeLogistic(week)
  return district.population * adjustedRate * (0.32 + 0.78 * growth)
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

function useSimulation() {
  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    const defaults = DEFAULT_DISTRICTS.map(getDistrictByName).filter(Boolean)
    return defaults.length > 0 ? defaults : DISTRICTS.slice(0, 2)
  })
  const [vaccineAllocations, setVaccineAllocations] = useState(() =>
    allocateEvenly(selectedDistricts.map((district) => district.name)),
  )
  const [currentWeek, setCurrentWeek] = useState(12)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEEDS[0])

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
    setVaccineAllocations((prev) => {
      const names = selectedDistricts.map((district) => district.name)
      if (names.length === 0) return {}
      return names.reduce((acc, name) => {
        acc[name] = clamp(prev[name] ?? 0, 0, TOTAL_VACCINES)
        return acc
      }, {})
    })
  }, [selectedDistricts])

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
        const names = selectedDistricts.map((district) => district.name)
        if (!names.includes(name)) return prev
        const next = { ...prev }
        names.forEach((districtName) => {
          if (!(districtName in next)) next[districtName] = 0
        })
        const othersTotal = names.reduce((sum, districtName) => {
          if (districtName === name) return sum
          return sum + (next[districtName] ?? 0)
        }, 0)
        const maxAllowed = Math.max(0, TOTAL_VACCINES - othersTotal)
        next[name] = clamp(Math.round(value), 0, maxAllowed)
        return next
      })
    },
    [selectedDistricts],
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
    let totalHospitalLoad = 0
    let totalRisk = 0
    let baseRateSum = 0
    let adjustedRateSum = 0

    selectedDistricts.forEach((district) => {
      const vaccines = vaccineAllocations[district.name] ?? 0
      const cases = computeCases({ district, week: currentWeek, vaccines })
      const vaccineShare = vaccines / TOTAL_VACCINES
      const vaccineShield = 0.18 + vaccineShare * 0.62
      const adjustedRate = district.baseInfectionRate * (1 - vaccineShield)
      const activeCases = cases * (0.12 + district.baseInfectionRate * 2)
      const capacity = district.population * district.healthcareCapacity * 0.015
      const hospitalLoad = clamp((activeCases / capacity) * 100, 0, 100)
      const riskIndex = clamp(
        hospitalLoad * 0.6 + adjustedRate * 1200 + (1 - district.healthcareCapacity) * 20,
        0,
        100,
      )
      const intensity = clamp(cases / (district.population * 0.085), 0.1, 1)

      byDistrict[district.name] = {
        cases,
        activeCases,
        hospitalLoad,
        riskIndex,
        intensity,
        vaccineShare,
        adjustedRate,
        population: district.population,
      }

      totalCases += cases
      totalHospitalLoad += hospitalLoad
      totalRisk += riskIndex
      baseRateSum += district.baseInfectionRate
      adjustedRateSum += adjustedRate
    })

    const previousWeek = Math.max(1, currentWeek - 1)
    const previousCases = selectedDistricts.reduce((sum, district) => {
      const vaccines = vaccineAllocations[district.name] ?? 0
      return sum + computeCases({ district, week: previousWeek, vaccines })
    }, 0)
    const growthRate = previousCases
      ? ((totalCases - previousCases) / previousCases) * 100
      : 0

    const vaccineEfficiency = clamp(
      (1 - adjustedRateSum / baseRateSum) * 100,
      0,
      100,
    )
    const hospitalLoad = totalHospitalLoad / selectedDistricts.length
    const riskIndex = totalRisk / selectedDistricts.length
    const mortalityReduction = clamp(vaccineEfficiency * 0.65 + (100 - hospitalLoad) * 0.12, 0, 100)

    return {
      totalCases,
      growthRate,
      vaccineEfficiency,
      mortalityReduction,
      hospitalLoad,
      riskIndex,
      byDistrict,
    }
  }, [selectedDistricts, vaccineAllocations, currentWeek])

  const infectionData = useMemo(() => {
    if (selectedDistricts.length === 0) return []
    const data = []
    for (let week = 1; week <= MAX_WEEKS; week += 1) {
      const total = selectedDistricts.reduce((sum, district) => {
        const vaccines = vaccineAllocations[district.name] ?? 0
        return sum + computeCases({ district, week, vaccines })
      }, 0)
      const previous = week > 1 ? data[data.length - 1].cases : total
      const growth = previous ? ((total - previous) / previous) * 100 : 0
      const acceleration = week > 2 ? growth - data[data.length - 1].growth : 0
      data.push({ week, cases: total, growth, acceleration })
    }
    return data
  }, [selectedDistricts, vaccineAllocations])

  const districtComparison = useMemo(() => {
    return selectedDistricts.map((district) => ({
      name: district.name,
      cases: predictions.byDistrict[district.name]?.cases ?? 0,
      vaccines: vaccineAllocations[district.name] ?? 0,
    }))
  }, [selectedDistricts, predictions.byDistrict, vaccineAllocations])

  const vaccineData = useMemo(() => {
    return selectedDistricts.map((district) => {
      const metrics = predictions.byDistrict[district.name]
      const efficiency = metrics
        ? clamp((1 - metrics.adjustedRate / district.baseInfectionRate) * 100, 0, 100)
        : 0
      return {
        name: district.name,
        efficiency,
        vaccines: vaccineAllocations[district.name] ?? 0,
      }
    })
  }, [selectedDistricts, predictions.byDistrict, vaccineAllocations])

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
      const vaccineShare = vaccines / TOTAL_VACCINES
      const baseCount = 5000
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

  return {
    selectedDistricts,
    addDistrict,
    removeDistrict,
    vaccineAllocations,
    setVaccineAllocation,
    totalVaccines: TOTAL_VACCINES,
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
  }
}

export default useSimulation
