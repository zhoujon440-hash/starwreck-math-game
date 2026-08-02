export const assetPath = (path: string): string => {
  if (!path.startsWith('/assets/')) return path
  const base = import.meta.env.BASE_URL
  return base === '/' ? path : `${base}${path.slice(1)}`
}

export const withBaseAssets = (markup: string): string => {
  const base = import.meta.env.BASE_URL
  if (base === '/') return markup
  return markup
    .replaceAll('="/assets/', `="${base}assets/`)
    .replaceAll("('/assets/", `('${base}assets/`)
}
