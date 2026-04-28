import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    
    // Initial check
    const timer = setTimeout(() => {
      if (isMobile === undefined) {
        onChange()
      }
    }, 0)
    
    return () => {
      mql.removeEventListener("change", onChange)
      clearTimeout(timer)
    }
  }, [isMobile])

  return !!isMobile
}
