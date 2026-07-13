export function signal(name: string, data?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  void import('@reticlehq/react').then(({ reticle }) => reticle.signal(name, data))
}
