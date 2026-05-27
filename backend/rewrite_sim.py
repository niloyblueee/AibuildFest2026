import re

def rewrite():
    with open('f:/AibuildFest2026/frontend/src/hooks/useSimulation.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update imports
    content = content.replace('TOTAL_VACCINES,', 'DEFAULT_COVERAGE_PCT,')

    # 2. Remove allocateEvenly and replace with a simple map
    content = re.sub(
        r'const allocateEvenly = .*?\n}',
        'const initializeCoverage = (names, pct = DEFAULT_COVERAGE_PCT) => {\n  return names.reduce((acc, name) => {\n    acc[name] = pct\n    return acc\n  }, {})\n}',
        content,
        flags=re.DOTALL
    )

    # 3. Add scenarioName and update state initializations
    state_init_old = '''  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    const defaults = DEFAULT_DISTRICTS.map(getDistrictByName).filter(Boolean)
    return defaults.length > 0 ? defaults : DISTRICTS.slice(0, 2)
  })
  const [totalVaccines, setTotalVaccines] = useState(TOTAL_VACCINES)
  const [vaccineAllocations, setVaccineAllocations] = useState(() =>
    allocateEvenly(selectedDistricts.map((district) => district.name), TOTAL_VACCINES),
  )'''
    state_init_new = '''  const [availableDistricts, setAvailableDistricts] = useState(DISTRICTS)
  const [selectedDistricts, setSelectedDistricts] = useState(() => {
    const defaults = DEFAULT_DISTRICTS.map(getDistrictByName).filter(Boolean)
    return defaults.length > 0 ? defaults : DISTRICTS.slice(0, 2)
  })
  const [scenarioName, setScenarioName] = useState('observed_baseline')
  const [vaccineAllocations, setVaccineAllocations] = useState(() =>
    initializeCoverage(selectedDistricts.map((district) => district.name), DEFAULT_COVERAGE_PCT),
  )'''
    content = content.replace(state_init_old, state_init_new)

    # 4. Fetch available districts on mount
    fetch_districts_effect = '''
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
'''
    # insert after const [apiStatus...
    content = content.replace("  const [apiStatus, setApiStatus] = useState({ state: 'idle', error: null })", "  const [apiStatus, setApiStatus] = useState({ state: 'idle', error: null })\n" + fetch_districts_effect)

    # 5. Remove the complex vaccineAllocations useEffects (that distributed total doses)
    content = re.sub(
        r'  useEffect\(\(\) => \{\n    setVaccineAllocations\(\(prev\) => \{\n      const names = selectedDistricts.*?\}, \[selectedDistricts, totalVaccines\]\)\n',
        '',
        content,
        flags=re.DOTALL
    )
    # The second complex one
    content = re.sub(
        r'  useEffect\(\(\) => \{\n    setVaccineAllocations\(\(prev\) => \{\n      const names = selectedDistricts.*?return next\n    \}\)\n  \}, \[selectedDistricts, totalVaccines\]\)\n',
        '',
        content,
        flags=re.DOTALL
    )

    # 6. Update setVaccineAllocation logic to just set percentage directly (0-100)
    set_alloc_old = '''  const setVaccineAllocation = useCallback(
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
        const maxAllowed = Math.max(0, totalVaccines - othersTotal)
        next[name] = clamp(Math.round(value), 0, maxAllowed)
        return next
      })
    },
    [selectedDistricts, totalVaccines],
  )'''
    set_alloc_new = '''  const setVaccineAllocation = useCallback(
    (name, value) => {
      setVaccineAllocations((prev) => ({
        ...prev,
        [name]: clamp(Math.round(value), 0, 100)
      }))
    },
    [],
  )'''
    content = content.replace(set_alloc_old, set_alloc_new)

    # 7. Update batch-predict request body to include scenario_name and coverage percentages directly
    predict_req_old = '''          return {
            district: toApiDistrictName(district.name),
            coverage_children_pct: coverage,
            coverage_population_pct: coverage,
            include_daily: true,
            include_hourly: false,
          }'''
    predict_req_new = '''          return {
            district: toApiDistrictName(district.name),
            scenario_name: scenarioName,
            coverage_children_pct: allocation,
            coverage_population_pct: allocation,
            include_daily: true,
            include_hourly: false,
          }'''
    content = content.replace(predict_req_old, predict_req_new)

    # Also add scenarioName to dependency array of the batch-predict effect
    content = content.replace('}, [selectedDistricts, vaccineAllocations])', '}, [selectedDistricts, vaccineAllocations, scenarioName])')

    # 8. Add setScenarioName to return
    content = content.replace('setTotalVaccines,', 'setScenarioName,\n    scenarioName,\n    availableDistricts,')

    # 9. In `predictions` useMemo, fix vaccineShare since it's already a percentage 0-100
    vaccine_share_old = '''      const vaccines = vaccineAllocations[district.name] ?? 0
      const totalAvailable = totalVaccines || 1
      const cases = getCasesForWeek(district.name, currentWeek)
      const vaccineShare = vaccines / totalAvailable'''
    vaccine_share_new = '''      const vaccines = vaccineAllocations[district.name] ?? 0
      const cases = getCasesForWeek(district.name, currentWeek)
      const vaccineShare = vaccines / 100'''
    content = content.replace(vaccine_share_old, vaccine_share_new)
    
    # 10. Update totalVaccines in return
    content = content.replace('totalVaccines,\n', '')

    with open('f:/AibuildFest2026/frontend/src/hooks/useSimulation.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    rewrite()
