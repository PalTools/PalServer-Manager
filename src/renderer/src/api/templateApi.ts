export type TemplateStatus = 'not_installed' | 'missing_files' | 'ok'

export interface TemplateApi {
  getTemplateStatus(): Promise<TemplateStatus>
  installTemplate(): Promise<{ success: boolean; error?: string }>
  onTemplateProgress(callback: (data: { stage: string; percentage: number }) => void): () => void
}

const api: TemplateApi = (window as unknown as { palServerManager: TemplateApi }).palServerManager

export const getTemplateStatus = api.getTemplateStatus
export const installTemplate = api.installTemplate
export const onTemplateProgress = api.onTemplateProgress
