import React, { useState, useEffect } from 'react'
import { FileEntry, listDir, readFile } from '../../api/instancesApi'
import { IconFile, IconRefresh } from '../Shared/Icons'

interface LogViewerTabProps {
  instanceId: string
}

export default function LogViewerTab({ instanceId }: LogViewerTabProps): React.JSX.Element {
  const [logs, setLogs] = useState<FileEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<FileEntry | null>(null)
  const [logContent, setLogContent] = useState<string>('')
  const [loadingList, setLoadingList] = useState<boolean>(true)
  const [loadingContent, setLoadingContent] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async (): Promise<void> => {
    try {
      setLoadingList(true)
      setError(null)
      const entries = await listDir(instanceId, 'Logs')

      // Filter out directories and sort by mtime descending
      const files = entries
        .filter((e) => !e.isDir)
        .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())

      setLogs(files)

      // Auto-select the most recent log if none is selected
      if (files.length > 0 && !selectedLog) {
        setSelectedLog(files[0])
      }
    } catch (err: unknown) {
      if ((err as Error).message?.includes('ENOENT')) {
        setLogs([])
        setError('No logs directory found. Start the server to generate logs.')
      } else {
        setError(`Failed to load log list: ${(err as Error).message}`)
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId])

  useEffect(() => {
    if (!selectedLog) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogContent('')
      return
    }

    let isCancelled = false
    const loadContent = async (): Promise<void> => {
      try {
        setLoadingContent(true)
        const content = await readFile(instanceId, `Logs/${selectedLog.name}`)
        if (!isCancelled) {
          setLogContent(content)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setLogContent(`Error reading log file: ${(err as Error).message}`)
        }
      } finally {
        if (!isCancelled) {
          setLoadingContent(false)
        }
      }
    }

    loadContent()
    return () => {
      isCancelled = true
    }
  }, [selectedLog, instanceId])

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div
      data-testid="LogViewerTab"
      className="tab-pane"
      style={{
        paddingTop: '24px',
        paddingBottom: '24px',
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        boxSizing: 'border-box',
        gap: '24px'
      }}
    >
      {/* Left Column: File List */}
      <div
        className="panel"
        style={{
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}
        >
          <div className="panel-title" style={{ margin: 0, padding: 0, border: 'none' }}>
            Log Files
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchLogs}
            disabled={loadingList}
            title="Refresh logs"
            style={{ padding: '4px', minWidth: '32px' }}
          >
            <IconRefresh />
          </button>
        </div>

        {error ? (
          <div
            style={{
              color: 'var(--danger)',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '20px'
            }}
          >
            {error}
          </div>
        ) : loadingList ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span
              className="spinner"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '20px'
            }}
          >
            No log files found.
          </div>
        ) : (
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {logs.map((file) => (
              <div
                key={file.name}
                onClick={() => setSelectedLog(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background:
                    selectedLog?.name === file.name ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedLog?.name !== file.name)
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseLeave={(e) => {
                  if (selectedLog?.name !== file.name)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <IconFile
                  style={{
                    color: selectedLog?.name === file.name ? 'var(--accent)' : 'var(--text-muted)'
                  }}
                />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      color:
                        selectedLog?.name === file.name
                          ? 'var(--text-main)'
                          : 'var(--text-secondary)'
                    }}
                  >
                    {file.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '4px'
                    }}
                  >
                    <span>{formatDate(file.mtime)}</span>
                    <span>{formatSize(file.size)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: File Content */}
      <div
        className="panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px'
        }}
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <div className="panel-title" style={{ margin: 0, padding: 0, border: 'none' }}>
            {selectedLog ? selectedLog.name : 'No file selected'}
          </div>
        </div>

        <div
          className="log-container"
          style={{
            flex: 1,
            margin: 0,
            overflowY: 'auto',
            minHeight: 0,
            userSelect: 'text',
            cursor: 'text'
          }}
        >
          {loadingContent ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%'
              }}
            >
              <span
                className="spinner"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : !selectedLog ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
              Select a log file from the left to view its contents.
            </div>
          ) : (
            <div className="log-line" style={{ userSelect: 'text' }}>
              {logContent || 'File is empty.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
