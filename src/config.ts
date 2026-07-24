const debugRequested =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

export const DEBUG_UI = import.meta.env.DEV && debugRequested
