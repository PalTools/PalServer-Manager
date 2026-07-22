import React, { useState } from 'react'
import { InstanceConfig } from '../../api/instancesApi'

interface Props {
  isOpen: boolean
  remoteBuildId: string | null
  currentBuildId: string | null
  instances: InstanceConfig[]
  templateUpdating: boolean
  templateProgress: { stage: string; percentage: number } | null
  templateError: string | null
  updatingInstances: Record<string, { stage: string; percentage: number }>
  isUpdatingBatch: boolean
  onUpdateSelected: (selectedIds: string[]) => Promise<void>
  onClose: () => void
}

export default function StartupUpdateModal({
  isOpen,
  remoteBuildId,
  currentBuildId,
  instances,
  templateUpdating,
  templateProgress,
  templateError,
  updatingInstances,
  isUpdatingBatch,
  onUpdateSelected,
  onClose
}: Props): React.JSX.Element | null {
  const [unselectedIds, setUnselectedIds] = useState<string[]>([])

  if (!isOpen) return null

  const selectedIds = instances.map((i) => i.id).filter((id) => !unselectedIds.includes(id))

  const toggleSelect = (id: string): void => {
    if (isUpdatingBatch) return
    setUnselectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = (): void => {
    if (isUpdatingBatch) return
    if (selectedIds.length === instances.length) {
      setUnselectedIds(instances.map((i) => i.id))
    } else {
      setUnselectedIds([])
    }
  }

  const handleUpdate = (): void => {
    if (selectedIds.length === 0 || isUpdatingBatch || templateUpdating) return
    onUpdateSelected(selectedIds)
  }

  const completedIds = Object.entries(updatingInstances)
    .filter(([, status]) => status.stage === 'Update Complete')
    .map(([id]) => id)

  const hasAnyCompleted = completedIds.length > 0

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div
        className="modal"
        style={{
          width: '540px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2
            className="modal-title"
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Palworld Server Update Found
          </h2>
          <span
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8'
            }}
          >
            Build: {remoteBuildId || 'Latest'}
          </span>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '13px',
            lineHeight: '1.5'
          }}
        >
          {templateUpdating ? (
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}
              >
                <span>Updating base server template...</span>
                <span>{Math.round(templateProgress?.percentage || 0)}%</span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${templateProgress?.percentage || 0}%`,
                    backgroundColor: '#38bdf8',
                    transition: 'width 0.2s linear'
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {templateProgress?.stage || 'Preparing SteamCMD...'}
              </div>
            </div>
          ) : templateError ? (
            <div style={{ color: '#f87171' }}>Failed to update base template: {templateError}</div>
          ) : (
            <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                Base server template updated ({currentBuildId || 'Old'} → {remoteBuildId || 'New'}).
              </span>
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              Select Server Instances to Update:
            </span>
            {instances.length > 0 && (
              <button
                className="btn-link"
                onClick={toggleSelectAll}
                disabled={isUpdatingBatch || templateUpdating}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: 0
                }}
              >
                {selectedIds.length === instances.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {instances.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '6px'
              }}
            >
              No server instances installed yet. Newly created instances will automatically use the
              updated template.
            </div>
          ) : (
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}
            >
              {instances.map((inst) => {
                const isSelected = selectedIds.includes(inst.id)
                const updateStatus = updatingInstances[inst.id]
                const isCompleted = completedIds.includes(inst.id)

                return (
                  <div
                    key={inst.id}
                    onClick={() => toggleSelect(inst.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: isCompleted
                        ? 'rgba(74, 222, 128, 0.05)'
                        : isSelected
                          ? 'rgba(56, 189, 248, 0.08)'
                          : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        isCompleted
                          ? 'rgba(74, 222, 128, 0.3)'
                          : isSelected
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'rgba(255, 255, 255, 0.06)'
                      }`,
                      cursor: isUpdatingBatch ? 'default' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={isUpdatingBatch || templateUpdating}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{inst.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCompleted && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(74, 222, 128, 0.15)',
                              color: '#4ade80',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Updated
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              inst.state === 'running'
                                ? 'rgba(74, 222, 128, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: inst.state === 'running' ? '#4ade80' : '#94a3b8'
                          }}
                        >
                          {inst.state}
                        </span>
                      </div>
                    </div>

                    {updateStatus && !isCompleted && (
                      <div style={{ marginTop: '4px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#38bdf8',
                            marginBottom: '2px'
                          }}
                        >
                          <span>{updateStatus.stage}</span>
                          <span>{Math.round(updateStatus.percentage)}%</span>
                        </div>
                        <div
                          style={{
                            height: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${updateStatus.percentage}%`,
                              backgroundColor: '#38bdf8',
                              transition: 'width 0.2s linear'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          className="modal-actions"
          style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}
        >
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isUpdatingBatch || templateUpdating}
          >
            {hasAnyCompleted ? 'Close' : 'Skip for Now'}
          </button>
          {selectedIds.length > 0 ? (
            <button
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={isUpdatingBatch || templateUpdating || instances.length === 0}
            >
              {isUpdatingBatch ? 'Updating Selected...' : `Update Selected (${selectedIds.length})`}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onClose}
              disabled={isUpdatingBatch || templateUpdating}
              style={{ backgroundColor: '#4ade80', color: '#0f172a' }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
