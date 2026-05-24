import { useEffect, useRef, useState } from 'react'

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3)

function AnimatedCounter({ value, duration = 800, format }) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)

  useEffect(() => {
    const startValue = previousValue.current
    const endValue = value
    const startTime = performance.now()
    let frameId = null

    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = easeOutCubic(progress)
      const nextValue = startValue + (endValue - startValue) * eased
      setDisplayValue(nextValue)
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    previousValue.current = value

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [value, duration])

  const output = format ? format(displayValue) : Math.round(displayValue)

  return <span>{output}</span>
}

export default AnimatedCounter
