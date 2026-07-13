import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FileEntry,
  listDir,
  readFile,
  writeFile,
  uploadFile,
  deleteFile,
  renameFile,
  mkdir,
  mkfile,
  archive,
  unarchive,
  openInExplorer
} from '../../api/instancesApi'
import {
  IconFolder,
  IconFile,
  IconArrowLeft,
  IconTrash,
  IconEdit,
  IconArchive,
  IconUnarchive
} from '../Shared/Icons'
import FileEditorModal from '../Shared/FileEditorModal'

interface Props {
  instanceId: string
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

export default function FileManagerTab({ instanceId }: Props): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  type SortField = 'name' | 'size' | 'mtime' | null
  type SortDirection = 'asc' | 'desc' | null
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleSort = (field: NonNullable<SortField>): void => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else setSortDirection('asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortIndicator = (field: NonNullable<SortField>): React.ReactNode => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const sortedFiles = useMemo(() => {
    const list = [...files]
    list.sort((a, b) => {
      // Always directories first
      const dirDiff = (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0)
      if (dirDiff !== 0) return dirDiff

      if (!sortField || !sortDirection) {
        return a.name.localeCompare(b.name)
      }

      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'size') {
        comparison = a.size - b.size
      } else if (sortField === 'mtime') {
        comparison = new Date(a.mtime).getTime() - new Date(b.mtime).getTime()
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
    return list
  }, [files, sortField, sortDirection])

  // Editor Modal State
  const [editorFile, setEditorFile] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [editorSaving, setEditorSaving] = useState<boolean>(false)

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileEntry } | null>(
    null
  )

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setIsDragging(false)

    if (!e.dataTransfer) return

    setLoading(true)
    let hasFolderOrError = false

    try {
      const validFiles: File[] = []
      const items = e.dataTransfer.items
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          // Check if it's a directory
          const entry = item.webkitGetAsEntry?.()
          if (entry && entry.isDirectory) {
            hasFolderOrError = true
            continue
          }

          const file = item.getAsFile()
          if (file) validFiles.push(file)
        }
      }

      if (validFiles.length === 0) {
        if (hasFolderOrError) {
          showAlert('Upload Notice', 'Folder upload is not supported here.')
        }
        setLoading(false)
        return
      }

      const processUpload = async (filesToUpload: File[]): Promise<void> => {
        setLoading(true)
        let localError = hasFolderOrError
        try {
          for (const file of filesToUpload) {
            try {
              const buffer = await file.arrayBuffer()
              const uploadPath = currentPath ? `${currentPath}/${file.name}` : file.name
              await uploadFile(instanceId, uploadPath, buffer)
            } catch (err) {
              console.error('Failed to upload file', file.name, err)
              localError = true
            }
          }
          if (localError) {
            showAlert(
              'Upload Notice',
              'Some items failed to upload, or were folders. Folder upload is not supported here.'
            )
          }
        } finally {
          loadDirectory(currentPath)
        }
      }

      // Check collisions
      const collisions = validFiles.filter((f) =>
        files.some((existing) => existing.name === f.name && !existing.isDir)
      )

      if (collisions.length > 0) {
        setLoading(false)
        showConfirm(
          'File Already Exists',
          collisions.length === 1
            ? `The file "${collisions[0].name}" already exists in this folder. Do you want to replace it?`
            : `${collisions.length} files already exist in this folder. Do you want to replace all of them?`,
          () => {
            processUpload(validFiles)
          },
          collisions.length === 1 ? 'Replace' : 'Replace All'
        )
        return
      }

      await processUpload(validFiles)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleClick = (): void => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Dialogs
  const [dialog, setDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'alert' | 'confirm'
    onConfirm?: () => void
    confirmText?: string
  }>({ isOpen: false, title: '', message: '', type: 'alert' })

  const [inputDialog, setInputDialog] = useState<{
    isOpen: boolean
    title: string
    defaultValue: string
    placeholder?: string
    suffix?: string
    onConfirm?: (val: string) => void
  }>({ isOpen: false, title: '', defaultValue: '' })
  const [inputValue, setInputValue] = useState('')

  const showAlert = (title: string, message: string): void => {
    setDialog({ isOpen: true, title, message, type: 'alert' })
  }

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string
  ): void => {
    setDialog({ isOpen: true, title, message, type: 'confirm', onConfirm, confirmText })
  }

  const loadDirectory = useCallback(
    async (dirPath: string) => {
      setLoading(true)
      setError(null)
      setSelected(new Set())
      try {
        const entries = await listDir(instanceId, dirPath)
        setFiles(entries)
        setCurrentPath(dirPath)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [instanceId]
  )

  useEffect(() => {
    loadDirectory('')
  }, [loadDirectory])

  const handleNavigate = (folderName: string): void => {
    const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName
    loadDirectory(nextPath)
  }

  const handleNavigateUp = (): void => {
    if (!currentPath) return
    const parts = currentPath.split('/')
    parts.pop()
    loadDirectory(parts.join('/'))
  }

  const handleNavigateRoot = (): void => {
    loadDirectory('')
  }

  const handleNavigateBreadcrumb = (index: number): void => {
    const parts = currentPath.split('/')
    const nextPath = parts.slice(0, index + 1).join('/')
    loadDirectory(nextPath)
  }

  const getFullPath = (name: string): string => (currentPath ? `${currentPath}/${name}` : name)

  // === File Editing ===
  const handleFileClick = async (entry: FileEntry): Promise<void> => {
    const filename = entry.name.toLowerCase()

    // Check extension
    const allowedExts = [
      '.ini',
      '.cfg',
      '.conf',
      '.config',
      '.toml',
      '.yaml',
      '.yml',
      '.env',
      '.properties',
      '.plist',
      '.json',
      '.jsonc',
      '.xml',
      '.csv',
      '.tsv',
      '.txt',
      '.log',
      '.md',
      '.markdown',
      '.rst',
      '.adoc',
      '.sh',
      '.bash',
      '.zsh',
      '.bat',
      '.cmd',
      '.ps1',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.rb',
      '.go',
      '.rs',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.lua',
      '.sql',
      '.html',
      '.css',
      '.scss',
      '.less',
      '.gitignore',
      '.editorconfig',
      '.dockerfile'
    ]
    const isAllowed = allowedExts.some((e) => filename.endsWith(e) || filename === e)

    if (!isAllowed) {
      showAlert(
        'Unsupported File',
        'Only common text and configuration files can be edited via the manager.'
      )
      return
    }

    const openFile = async (): Promise<void> => {
      const filePath = getFullPath(entry.name)
      setLoading(true)
      try {
        const content = await readFile(instanceId, filePath)
        setEditorContent(content)
        setEditorFile(filePath)
      } catch (err) {
        showAlert('Error', `Failed to read file: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    if (entry.size > 5 * 1024 * 1024) {
      showConfirm(
        'Large File',
        'This file is larger than 5MB and might freeze the app. Open anyway?',
        openFile
      )
      return
    }

    openFile()
  }

  const handleSaveFile = async (content: string): Promise<void> => {
    if (!editorFile) return
    setEditorSaving(true)
    try {
      await writeFile(instanceId, editorFile, content)
      setEditorFile(null)
      setEditorContent('')
      loadDirectory(currentPath)
    } catch (err) {
      showAlert('Error', `Failed to save file: ${err}`)
    } finally {
      setEditorSaving(false)
    }
  }

  // === Advanced Operations ===

  const handleCreateFolder = (): void => {
    setInputDialog({
      isOpen: true,
      title: 'New Folder',
      defaultValue: '',
      placeholder: 'folder_name',
      onConfirm: async (name) => {
        try {
          await mkdir(instanceId, currentPath, name)
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    })
  }

  const handleCreateFile = (): void => {
    setInputDialog({
      isOpen: true,
      title: 'New File',
      defaultValue: '',
      placeholder: 'file.txt',
      onConfirm: async (name) => {
        if (!name.includes('.')) {
          showAlert(
            'Invalid File Name',
            'Please specify a file extension (e.g., file.txt, data.json).'
          )
          return
        }
        try {
          await mkfile(instanceId, currentPath, name)
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    })
  }

  const handleRename = (entry: FileEntry): void => {
    setInputDialog({
      isOpen: true,
      title: `Rename ${entry.name}`,
      defaultValue: entry.name,
      onConfirm: async (newName) => {
        try {
          await renameFile(instanceId, getFullPath(entry.name), newName)
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    })
  }

  const handleDelete = (entry: FileEntry): void => {
    showConfirm(
      'Delete Confirmation',
      `Are you sure you want to delete ${entry.name}? This action cannot be undone.`,
      async () => {
        try {
          await deleteFile(instanceId, getFullPath(entry.name))
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    )
  }

  const handleBulkDelete = (): void => {
    if (selected.size === 0) return
    showConfirm(
      'Delete Confirmation',
      `Are you sure you want to delete ${selected.size} selected item(s)?`,
      async () => {
        try {
          for (const name of selected) {
            await deleteFile(instanceId, getFullPath(name))
          }
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    )
  }

  const handleArchiveSingle = (entry: FileEntry): void => {
    setInputDialog({
      isOpen: true,
      title: 'Create Archive',
      defaultValue: entry.name,
      suffix: '.zip',
      onConfirm: async (archiveName) => {
        try {
          await archive(instanceId, [getFullPath(entry.name)], archiveName + '.zip')
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    })
  }

  const handleBulkArchive = (): void => {
    if (selected.size === 0) return
    setInputDialog({
      isOpen: true,
      title: 'Archive Selected',
      defaultValue: 'archive',
      suffix: '.zip',
      onConfirm: async (archiveName) => {
        try {
          const paths = Array.from(selected).map(getFullPath)
          await archive(instanceId, paths, archiveName + '.zip')
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    })
  }

  const handleUnarchive = (entry: FileEntry): void => {
    showConfirm(
      'Extract Archive',
      `Extract contents of ${entry.name} into the current directory?`,
      async () => {
        try {
          await unarchive(instanceId, getFullPath(entry.name))
          loadDirectory(currentPath)
        } catch (err) {
          showAlert('Error', String(err))
        }
      }
    )
  }

  const toggleSelect = (name: string): void => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelected(next)
  }

  const toggleSelectAll = (): void => {
    if (selected.size === files.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map((f) => f.name)))
    }
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : []

  return (
    <div
      className="tab-content"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            borderRadius: '8px',
            border: '2px dashed var(--primary-color)',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          Drop files to upload
        </div>
      )}
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        <button
          className="btn btn-ghost"
          disabled={!currentPath || loading}
          onClick={handleNavigateUp}
          style={{
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            minWidth: '40px'
          }}
        >
          <IconArrowLeft />
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            padding: '0 16px',
            minHeight: '40px',
            background: 'var(--bg-card)',
            borderRadius: '8px'
          }}
        >
          <span
            style={{
              cursor: 'pointer',
              color: !currentPath ? 'var(--text-main)' : 'var(--text-muted)'
            }}
            onClick={handleNavigateRoot}
          >
            root
          </span>
          {breadcrumbs.map((part, i) => (
            <React.Fragment key={i}>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span
                style={{
                  cursor: 'pointer',
                  color: i === breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--text-muted)'
                }}
                onClick={() => handleNavigateBreadcrumb(i)}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Top actions */}
        {selected.size > 0 ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleBulkArchive}
              title="Archive Selected"
            >
              <IconArchive />
            </button>
            <button className="btn btn-danger" onClick={handleBulkDelete} title="Delete Selected">
              <IconTrash />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCreateFolder}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconFolder /> New Folder
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCreateFile}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconFile /> New File
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div
          style={{
            color: 'var(--danger-color)',
            padding: '16px',
            background: 'var(--bg-card)',
            borderRadius: '8px'
          }}
        >
          Error: {error}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <div className="spinner" />
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
              <tr>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '48px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selected.size === files.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                    title="Select All"
                  />
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '40%',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => handleSort('name')}
                >
                  Name{renderSortIndicator('name')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '15%',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => handleSort('size')}
                >
                  Size{renderSortIndicator('size')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '25%',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => handleSort('mtime')}
                >
                  Modified{renderSortIndicator('mtime')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '20%',
                    textAlign: 'right'
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Folder is empty
                  </td>
                </tr>
              )}
              {sortedFiles.map((file) => (
                <tr
                  key={file.name}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: selected.has(file.name) ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                  onClick={() => (file.isDir ? handleNavigate(file.name) : handleFileClick(file))}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, file })
                  }}
                  onMouseOver={(e) => {
                    if (!selected.has(file.name))
                      e.currentTarget.style.background = 'var(--bg-glass)'
                  }}
                  onMouseOut={(e) => {
                    if (!selected.has(file.name)) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <td
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(file.name)}
                      onChange={() => toggleSelect(file.name)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {file.isDir ? (
                      <IconFolder style={{ color: 'var(--primary-color)' }} />
                    ) : (
                      <IconFile style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ wordBreak: 'break-all' }}>{file.name}</span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {file.isDir ? '--' : formatSize(file.size)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {formatDate(file.mtime)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      textAlign: 'right'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {file.name.endsWith('.zip') && !file.isDir && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px', minWidth: 'unset', color: 'var(--text-muted)' }}
                          onClick={() => handleUnarchive(file)}
                          title="Extract"
                        >
                          <IconUnarchive />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px', minWidth: 'unset', color: 'var(--text-muted)' }}
                        onClick={() => handleArchiveSingle(file)}
                        title="Archive"
                      >
                        <IconArchive />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px', minWidth: 'unset', color: 'var(--text-muted)' }}
                        onClick={() => handleRename(file)}
                        title="Rename"
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px', minWidth: 'unset', color: 'var(--danger-color)' }}
                        onClick={() => handleDelete(file)}
                        title="Delete"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 0',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            minWidth: '180px',
            backdropFilter: 'blur(24px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '4px 16px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
              marginBottom: '4px',
              paddingBottom: '8px',
              wordBreak: 'break-all'
            }}
          >
            {contextMenu.file.name}
          </div>
          {contextMenu.file.name.endsWith('.zip') && !contextMenu.file.isDir && (
            <button
              className="context-menu-item"
              onClick={() => {
                setContextMenu(null)
                handleUnarchive(contextMenu.file)
              }}
            >
              <IconUnarchive /> Extract
            </button>
          )}
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              handleArchiveSingle(contextMenu.file)
            }}
          >
            <IconArchive /> Archive
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              const filePath = currentPath
                ? `${currentPath}/${contextMenu.file.name}`
                : contextMenu.file.name
              openInExplorer(instanceId, filePath)
            }}
          >
            <IconFolder /> Open in Explorer
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null)
              handleRename(contextMenu.file)
            }}
          >
            <IconEdit /> Rename
          </button>
          <button
            className="context-menu-item"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              setContextMenu(null)
              handleDelete(contextMenu.file)
            }}
          >
            <IconTrash /> Delete
          </button>
        </div>
      )}

      {editorFile && (
        <FileEditorModal
          filename={editorFile.split('/').pop() || ''}
          initialContent={editorContent}
          onSave={handleSaveFile}
          onClose={() => setEditorFile(null)}
          saving={editorSaving}
        />
      )}

      {/* Input Dialog for rename, mkdir, etc */}
      {inputDialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div
            className="modal-content"
            style={{
              width: '400px',
              background: 'var(--bg-primary)',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>
              {inputDialog.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <input
                type="text"
                autoFocus
                className="input-field"
                style={{
                  flex: 1,
                  borderTopRightRadius: inputDialog.suffix ? 0 : undefined,
                  borderBottomRightRadius: inputDialog.suffix ? 0 : undefined
                }}
                value={
                  inputValue !== ''
                    ? inputValue
                    : inputValue === '' && !inputDialog.defaultValue
                      ? ''
                      : inputDialog.defaultValue
                }
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputDialog.placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = inputValue || inputDialog.defaultValue
                    if (val && inputDialog.onConfirm) {
                      inputDialog.onConfirm(val)
                      setInputDialog({ ...inputDialog, isOpen: false })
                      setInputValue('')
                    }
                  }
                }}
              />
              {inputDialog.suffix && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderLeft: 'none',
                    borderTopRightRadius: 'var(--radius-sm)',
                    borderBottomRightRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    fontFamily: 'var(--font)'
                  }}
                >
                  {inputDialog.suffix}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setInputDialog({ ...inputDialog, isOpen: false })
                  setInputValue('')
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const val = inputValue || inputDialog.defaultValue
                  if (val && inputDialog.onConfirm) {
                    inputDialog.onConfirm(val)
                  }
                  setInputDialog({ ...inputDialog, isOpen: false })
                  setInputValue('')
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Alert / Confirm Dialog */}
      {dialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div
            className="modal-content"
            style={{
              width: '400px',
              background: 'var(--bg-primary)',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>
              {dialog.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              {dialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {dialog.type === 'confirm' && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setDialog({ ...dialog, isOpen: false })}
                >
                  Cancel
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  setDialog({ ...dialog, isOpen: false })
                  if (dialog.type === 'confirm' && dialog.onConfirm) {
                    dialog.onConfirm()
                  }
                }}
              >
                {dialog.type === 'alert' ? 'OK' : dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
