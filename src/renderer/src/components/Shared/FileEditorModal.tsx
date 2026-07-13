import React, { useState } from 'react'

interface Props {
  filename: string
  initialContent: string
  onSave: (content: string) => void
  onClose: () => void
  saving: boolean
  warning?: string
  readOnly?: boolean
}

export default function FileEditorModal({
  filename,
  initialContent,
  onSave,
  onClose,
  saving,
  warning,
  readOnly
}: Props): React.JSX.Element {
  const [content, setContent] = useState(initialContent)

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '1000px',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(20, 20, 25, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
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
          <h2
            style={{
              margin: 0,
              fontSize: '1.2rem',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
          >
            Editing: {filename}
          </h2>
        </div>

        {warning && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            {warning}
          </div>
        )}

        <div
          style={{
            flex: 1,
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={readOnly || saving}
            style={{
              width: '100%',
              height: '100%',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              border: 'none',
              resize: 'none',
              outline: 'none'
            }}
            spellCheck={false}
          />
        </div>

        <div
          className="modal-actions"
          style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}
        >
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(content)}
            disabled={saving || readOnly}
            style={{ minWidth: '100px', display: readOnly ? 'none' : 'block' }}
          >
            {saving ? 'Saving...' : 'Save File'}
          </button>
        </div>
      </div>
    </div>
  )
}
