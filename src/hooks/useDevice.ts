import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

export function useDevice() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isMobile = width < MOBILE_BREAKPOINT
  return { isMobile, width }
}
