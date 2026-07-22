import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Schedule,
  ScheduleTask,
  ScheduleHistory,
  TaskActionType,
  listSchedules,
  saveSchedule,
  deleteSchedule,
  runScheduleNow
} from '../../api/instancesApi'
import ConfirmModal from '../Shared/ConfirmModal'
import {
  IconClock,
  IconPlay,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconHistory
} from '../Shared/Icons'

interface Props {
  instanceId: string
}

function translateCronToText(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'Custom Cron Schedule'

  const [m, h, , , dow] = parts

  if (cron === '*/30 * * * *') return 'Every 30 minutes'
  if (cron === '0 * * * *') return 'Every hour at minute 0'
  if (cron === '0 */2 * * *') return 'Every 2 hours'
  if (cron === '0 */6 * * *') return 'Every 6 hours'
  if (cron === '0 0 * * *') return 'Every day at Midnight (00:00)'
  if (cron === '0 4 * * *') return 'Every day at 04:00 AM'
  if (cron === '0 0 * * 0') return 'Every Sunday at Midnight'

  let text = ''
  if (m.startsWith('*/')) {
    text += `Every ${m.substring(2)} minutes`
  } else if (m === '0' && h.startsWith('*/')) {
    text += `Every ${h.substring(2)} hours`
  } else if (m !== '*' && h !== '*') {
    const padH = h.padStart(2, '0')
    const padM = m.padStart(2, '0')
    text += `Daily at ${padH}:${padM}`
  } else {
    text += `Cron (${cron})`
  }

  if (dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dowNum = parseInt(dow, 10)
    if (!isNaN(dowNum) && days[dowNum]) {
      text += ` on ${days[dowNum]}`
    }
  }

  return text
}

function ToggleSwitch({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '44px',
        height: '24px',
        padding: '2px',
        borderRadius: '12px',
        backgroundColor: checked ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease',
        outline: 'none'
      }}
    >
      <span
        style={{
          display: 'block',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 0.2s ease'
        }}
      />
    </button>
  )
}

export default function ScheduleManagerTab({ instanceId }: Props): React.JSX.Element {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<'frequency' | 'tasks' | 'options'>(
    'frequency'
  )

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<ScheduleHistory[] | null>(null)
  const [historyTitle, setHistoryTitle] = useState('')

  const fetchSchedules = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await listSchedules(instanceId)
      setSchedules(data)
    } catch (err) {
      console.error('Failed to list schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSchedules()
  }, [fetchSchedules])

  const handleOpenCreateModal = (): void => {
    setEditingSchedule({
      name: '',
      cronExpression: '0 4 * * *',
      isActive: true,
      onlyWhenOnline: true,
      tasks: [
        {
          id: String(Date.now()),
          action: 'send_command',
          payload: 'broadcast Server restarting in 5 minutes',
          delaySeconds: 0,
          continueOnFailure: true
        },
        {
          id: String(Date.now() + 1),
          action: 'backup',
          payload: '',
          delaySeconds: 300,
          continueOnFailure: true
        },
        {
          id: String(Date.now() + 2),
          action: 'power_action',
          payload: 'restart',
          delaySeconds: 10,
          continueOnFailure: false
        }
      ]
    })
    setActiveModalTab('frequency')
    setModalOpen(true)
  }

  const handleOpenEditModal = (schedule: Schedule): void => {
    setEditingSchedule(JSON.parse(JSON.stringify(schedule)))
    setActiveModalTab('frequency')
    setModalOpen(true)
  }

  const handleSaveModal = async (): Promise<void> => {
    if (!editingSchedule || !editingSchedule.name?.trim()) {
      alert('Please enter a valid schedule name.')
      return
    }
    if (!editingSchedule.tasks || editingSchedule.tasks.length === 0) {
      alert('Please add at least one task to the pipeline.')
      return
    }

    try {
      await saveSchedule(instanceId, editingSchedule)
      setModalOpen(false)
      setEditingSchedule(null)
      await fetchSchedules()
    } catch (err) {
      alert(`Failed to save schedule: ${err}`)
    }
  }

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean
    scheduleId: string | null
  }>({
    isOpen: false,
    scheduleId: null
  })

  const requestDeleteSchedule = (scheduleId: string): void => {
    setDeleteConfirmState({ isOpen: true, scheduleId })
  }

  const confirmDeleteSchedule = async (): Promise<void> => {
    if (!deleteConfirmState.scheduleId) return
    const scheduleId = deleteConfirmState.scheduleId
    setDeleteConfirmState({ isOpen: false, scheduleId: null })
    try {
      await deleteSchedule(instanceId, scheduleId)
      await fetchSchedules()
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    }
  }

  const handleToggleActive = async (schedule: Schedule): Promise<void> => {
    try {
      await saveSchedule(instanceId, {
        ...schedule,
        isActive: !schedule.isActive
      })
      await fetchSchedules()
    } catch (err) {
      alert(`Failed to toggle schedule status: ${err}`)
    }
  }

  const handleRunNow = async (scheduleId: string): Promise<void> => {
    setRunningScheduleId(scheduleId)
    try {
      await runScheduleNow(instanceId, scheduleId)
      await fetchSchedules()
    } catch (err) {
      alert(`Schedule execution failed: ${err}`)
    } finally {
      setRunningScheduleId(null)
    }
  }

  const handleOpenHistory = (schedule: Schedule): void => {
    setSelectedHistory(schedule.history || [])
    setHistoryTitle(schedule.name)
    setHistoryModalOpen(true)
  }

  const addTaskStep = (): void => {
    if (!editingSchedule) return
    const newTask: ScheduleTask = {
      id: String(Date.now()),
      action: 'send_command',
      payload: 'broadcast Server alert',
      delaySeconds: 0,
      continueOnFailure: true
    }
    setEditingSchedule((prev) => ({
      ...prev,
      tasks: [...(prev?.tasks || []), newTask]
    }))
  }

  const removeTaskStep = (index: number): void => {
    if (!editingSchedule || !editingSchedule.tasks) return
    const next = [...editingSchedule.tasks]
    next.splice(index, 1)
    setEditingSchedule((prev) => ({ ...prev, tasks: next }))
  }

  const updateTaskStep = (index: number, patch: Partial<ScheduleTask>): void => {
    if (!editingSchedule || !editingSchedule.tasks) return
    const next = [...editingSchedule.tasks]
    next[index] = { ...next[index], ...patch }
    setEditingSchedule((prev) => ({ ...prev, tasks: next }))
  }

  const CRON_PRESETS = [
    { label: 'Every 30 Minutes', cron: '*/30 * * * *' },
    { label: 'Every Hour', cron: '0 * * * *' },
    { label: 'Every 6 Hours', cron: '0 */6 * * *' },
    { label: 'Daily at Midnight', cron: '0 0 * * *' },
    { label: 'Daily at 04:00 AM', cron: '0 4 * * *' },
    { label: 'Weekly on Sunday', cron: '0 0 * * 0' }
  ]

  const cronExpr = editingSchedule?.cronExpression
  const cronText = useMemo(() => {
    if (!cronExpr) return ''
    return translateCronToText(cronExpr)
  }, [cronExpr])

  return (
    <div
      data-testid="ScheduleManagerTab"
      className="tab-pane"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>Schedule Manager</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              Automate task pipelines (broadcasts, save backups, server restarts) on custom cron
              schedules.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" onClick={fetchSchedules} disabled={loading}>
              <IconRefresh style={{ width: '16px', height: '16px' }} />
              Refresh
            </button>
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <IconPlus style={{ width: '16px', height: '16px' }} />
              New Schedule
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {schedules.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 0',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderRadius: '12px',
                border: '1px dashed rgba(255,255,255,0.1)'
              }}
            >
              <IconClock
                style={{ width: '48px', height: '48px', color: '#38bdf8', marginBottom: '16px' }}
              />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text)' }}>
                No Schedules Configured
              </h3>
              <p style={{ margin: '8px 0 20px 0', fontSize: '14px' }}>
                Create automated task schedules for backups, restarts, and broadcast warnings.
              </p>
              <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                <IconPlus style={{ width: '16px', height: '16px' }} />
                Create First Schedule
              </button>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px'
            }}
          >
            {schedules.map((schedule) => {
              const isExecuting = runningScheduleId === schedule.id
              const humanText = translateCronToText(schedule.cronExpression)
              const lastRunDate = schedule.lastRunAt
                ? new Date(schedule.lastRunAt).toLocaleString()
                : 'Never'

              return (
                <div
                  key={schedule.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '20px',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    border: schedule.isActive
                      ? '1px solid rgba(56, 189, 248, 0.3)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IconClock
                          style={{
                            color: schedule.isActive ? '#38bdf8' : 'var(--text-muted)'
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                          {schedule.name}
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={schedule.isActive}
                        onChange={() => handleToggleActive(schedule)}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>{humanText}</span>
                        <code
                          style={{
                            fontSize: '11px',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {schedule.cronExpression}
                        </code>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Last Run: {lastRunDate}
                      </div>
                      {schedule.onlyWhenOnline && (
                        <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                          Condition: Only when server is online
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '6px'
                        }}
                      >
                        Task Pipeline ({schedule.tasks.length} steps):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {schedule.tasks.map((task, idx) => (
                          <div
                            key={task.id || idx}
                            style={{
                              fontSize: '12px',
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>
                              <strong>Step {idx + 1}:</strong> {task.action}{' '}
                              {task.payload ? `("${task.payload}")` : ''}
                            </span>
                            {task.delaySeconds > 0 && (
                              <span style={{ color: '#38bdf8' }}>+{task.delaySeconds}s delay</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleRunNow(schedule.id)}
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <span className="spinner" />
                      ) : (
                        <IconPlay style={{ width: '14px', height: '14px' }} />
                      )}
                      Run Now
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleOpenHistory(schedule)}
                      title="View Execution History"
                    >
                      <IconHistory style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleOpenEditModal(schedule)}
                      title="Edit Schedule"
                    >
                      <IconEdit style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ color: '#ef4444' }}
                      onClick={() => requestDeleteSchedule(schedule.id)}
                      title="Delete Schedule"
                    >
                      <IconTrash style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modalOpen && editingSchedule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#12131a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
                {editingSchedule.id ? 'Edit Schedule' : 'Create New Schedule'}
              </h3>
              <button
                className="btn btn-ghost"
                onClick={() => setModalOpen(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Schedule Name</label>
              <input
                className="form-input"
                placeholder="e.g. Daily 4 AM Restart & Save Backup"
                value={editingSchedule.name || ''}
                onChange={(e) => setEditingSchedule((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '12px'
              }}
            >
              <button
                onClick={() => setActiveModalTab('frequency')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeModalTab === 'frequency' ? '#38bdf8' : 'transparent',
                  color: activeModalTab === 'frequency' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Frequency & Trigger
              </button>
              <button
                onClick={() => setActiveModalTab('tasks')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeModalTab === 'tasks' ? '#38bdf8' : 'transparent',
                  color: activeModalTab === 'tasks' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Task Pipeline ({editingSchedule.tasks?.length || 0})
              </button>
              <button
                onClick={() => setActiveModalTab('options')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeModalTab === 'options' ? '#38bdf8' : 'transparent',
                  color: activeModalTab === 'options' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Options & Conditions
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
              {activeModalTab === 'frequency' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '8px' }}>
                      Quick Schedule Presets
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {CRON_PRESETS.map((preset) => (
                        <button
                          key={preset.cron}
                          type="button"
                          onClick={() =>
                            setEditingSchedule((prev) => ({
                              ...prev,
                              cronExpression: preset.cron
                            }))
                          }
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textAlign: 'left',
                            backgroundColor:
                              editingSchedule.cronExpression === preset.cron
                                ? 'rgba(56, 189, 248, 0.2)'
                                : 'rgba(0,0,0,0.2)',
                            border:
                              editingSchedule.cronExpression === preset.cron
                                ? '1px solid #38bdf8'
                                : '1px solid rgba(255,255,255,0.1)',
                            color:
                              editingSchedule.cronExpression === preset.cron
                                ? '#38bdf8'
                                : 'var(--text)',
                            cursor: 'pointer'
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Cron Expression (5-part format)</label>
                    <input
                      className="form-input"
                      value={editingSchedule.cronExpression || ''}
                      onChange={(e) =>
                        setEditingSchedule((prev) => ({
                          ...prev,
                          cronExpression: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                      Schedule Translation:
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text)', marginTop: '4px' }}>
                      {cronText}
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Tasks execute sequentially in order. Each step waits for completion before
                      proceeding.
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                        onClick={() => {
                          if (!editingSchedule) return
                          setEditingSchedule({
                            ...editingSchedule,
                            tasks: [
                              {
                                id: '1',
                                action: 'send_command',
                                payload: 'broadcast Server restarting in 5 minutes for maintenance',
                                delaySeconds: 0,
                                continueOnFailure: true
                              },
                              {
                                id: '2',
                                action: 'backup',
                                payload: '',
                                delaySeconds: 0,
                                continueOnFailure: true
                              },
                              {
                                id: '3',
                                action: 'power_action',
                                payload: 'restart',
                                delaySeconds: 0,
                                continueOnFailure: true
                              }
                            ]
                          })
                        }}
                      >
                        Auto-Fill Preset
                      </button>
                      <button className="btn btn-ghost" onClick={addTaskStep}>
                        <IconPlus style={{ width: '14px', height: '14px' }} />
                        Add Step
                      </button>
                    </div>
                  </div>

                  {editingSchedule.tasks?.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      style={{
                        padding: '16px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#38bdf8' }}>
                          Step {idx + 1}
                        </span>
                        {editingSchedule.tasks && editingSchedule.tasks.length > 1 && (
                          <button
                            className="btn btn-ghost"
                            style={{ color: '#ef4444', padding: '2px 6px' }}
                            onClick={() => removeTaskStep(idx)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <label className="form-label">Action Type</label>
                          <select
                            className="form-input"
                            value={task.action}
                            onChange={(e) =>
                              updateTaskStep(idx, {
                                action: e.target.value as TaskActionType,
                                payload: e.target.value === 'power_action' ? 'restart' : ''
                              })
                            }
                          >
                            <option value="send_command">Send Broadcast / RCON</option>
                            <option value="power_action">Power Action</option>
                            <option value="backup">Create World Save Backup</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Delay Before Execution (seconds)</label>
                          <input
                            className="form-input"
                            type="number"
                            min="0"
                            value={task.delaySeconds}
                            onChange={(e) =>
                              updateTaskStep(idx, {
                                delaySeconds: parseInt(e.target.value, 10) || 0
                              })
                            }
                          />
                        </div>
                      </div>

                      {task.action === 'send_command' && (
                        <div>
                          <label className="form-label">Broadcast / RCON Command</label>
                          <input
                            className="form-input"
                            placeholder="e.g. broadcast Server restarting in 5 minutes"
                            value={task.payload}
                            onChange={(e) => updateTaskStep(idx, { payload: e.target.value })}
                          />
                        </div>
                      )}

                      {task.action === 'power_action' && (
                        <div>
                          <label className="form-label">Power Action</label>
                          <select
                            className="form-input"
                            value={task.payload}
                            onChange={(e) => updateTaskStep(idx, { payload: e.target.value })}
                          >
                            <option value="restart">Restart Server (Graceful)</option>
                            <option value="stop">Stop Server (Graceful)</option>
                            <option value="start">Start Server</option>
                            <option value="kill">Kill Server (Force)</option>
                          </select>
                        </div>
                      )}

                      {task.action === 'backup' && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Creates a compressed save backup archive in the instance Backups folder.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeModalTab === 'options' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>Schedule Active</div>
                      <div
                        style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}
                      >
                        Enable or pause this schedule.
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={editingSchedule.isActive ?? true}
                      onChange={(checked) =>
                        setEditingSchedule((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        Only When Server Online
                      </div>
                      <div
                        style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}
                      >
                        Skip execution if the server process is currently stopped.
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={editingSchedule.onlyWhenOnline ?? true}
                      onChange={(checked) =>
                        setEditingSchedule((prev) => ({ ...prev, onlyWhenOnline: checked }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveModal}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && selectedHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#12131a',
              borderRadius: '14px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px' }}>Execution Logs: {historyTitle}</h3>
              <button
                className="btn btn-ghost"
                onClick={() => setHistoryModalOpen(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {selectedHistory.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                  No past execution history.
                </div>
              )}
              {selectedHistory.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      marginBottom: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor:
                          h.status === 'success'
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color: h.status === 'success' ? '#22c55e' : '#ef4444'
                      }}
                    >
                      {h.status.toUpperCase()} ({h.triggerType})
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    {h.logs.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmText="Delete Schedule"
        confirmStyle="danger"
        onConfirm={confirmDeleteSchedule}
        onCancel={() => setDeleteConfirmState({ isOpen: false, scheduleId: null })}
      />
    </div>
  )
}
