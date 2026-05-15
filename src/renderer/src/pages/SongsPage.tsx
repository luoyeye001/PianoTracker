import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Song } from '../types/api'
import '../types/api'
import './SongsPage.css'

const STATUS_KEYS = ['not_started', 'practicing', 'completed'] as const

export function SongsPage(): JSX.Element {
  const { t } = useTranslation()
  const [songs, setSongs] = useState<Song[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', composer: '', notes: '' })

  const reload = useCallback(() => {
    window.api?.songs.list().then(setSongs).catch(console.error)
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleSubmit = async (): Promise<void> => {
    if (!form.title.trim()) return
    if (editId !== null) {
      await window.api?.songs.update(editId, form)
    } else {
      await window.api?.songs.create(form)
    }
    setForm({ title: '', composer: '', notes: '' })
    setShowForm(false)
    setEditId(null)
    reload()
  }

  const handleEdit = (song: Song): void => {
    setForm({ title: song.title, composer: song.composer, notes: song.notes })
    setEditId(song.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api?.songs.delete(id)
    reload()
  }

  const handleStatus = async (song: Song): Promise<void> => {
    const next = STATUS_KEYS[(STATUS_KEYS.indexOf(song.status) + 1) % 3]
    await window.api?.songs.update(song.id, { status: next })
    reload()
  }

  return (
    <div className="songs-page">
      <div className="songs-header">
        <h2 className="songs-title">{t('songs')}</h2>
        <button className="songs-add-btn" onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', composer: '', notes: '' }) }}>
          + {t('songsView.add')}
        </button>
      </div>

      {/* 添加/编辑表单 */}
      {showForm && (
        <div className="songs-form">
          <input
            className="songs-input"
            placeholder={t('songsView.titlePlaceholder')}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <input
            className="songs-input"
            placeholder={t('songsView.composerPlaceholder')}
            value={form.composer}
            onChange={(e) => setForm((f) => ({ ...f, composer: e.target.value }))}
          />
          <textarea
            className="songs-input songs-textarea"
            placeholder={t('songsView.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="songs-form-actions">
            <button className="songs-btn songs-btn--primary" onClick={handleSubmit}>
              {editId !== null ? t('songsView.save') : t('songsView.create')}
            </button>
            <button className="songs-btn" onClick={() => { setShowForm(false); setEditId(null) }}>
              {t('songsView.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* 曲目列表 */}
      {songs.length === 0 ? (
        <div className="songs-empty">{t('songsView.empty')}</div>
      ) : (
        <div className="songs-list">
          {songs.map((song) => (
            <div key={song.id} className="song-card">
              <button
                className={`song-status song-status--${song.status}`}
                onClick={() => handleStatus(song)}
                title={t('songsView.clickToChange')}
              >
                {t(`songsView.status.${song.status}`)}
              </button>
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                {song.composer && <div className="song-composer">{song.composer}</div>}
                {song.notes && <div className="song-notes">{song.notes}</div>}
              </div>
              <div className="song-actions">
                <button className="song-action-btn" onClick={() => handleEdit(song)}>✏️</button>
                <button className="song-action-btn song-action-btn--delete" onClick={() => handleDelete(song.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
