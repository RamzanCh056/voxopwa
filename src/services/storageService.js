import { openDB } from 'idb'

const DB_NAME = 'voxofied-db'
const STORE = 'recordings'

const ALLOWED_TYPES = new Set([
  'audio/mpeg',        // .mp3
  'audio/mp4',         // .m4a .mp4
  'audio/wav',         // .wav
  'audio/x-wav',       // .wav alternate
  'audio/webm',        // .webm
  'audio/ogg',         // .ogg
  'audio/opus',        // .opus (WhatsApp)
  'application/ogg',   // .opus fallback
  'audio/aac',         // .aac
  'audio/x-aac',       // .aac alternate
  'audio/flac',        // .flac
  'audio/x-flac',      // .flac alternate
  'audio/x-m4a',       // .m4a iOS
  'audio/3gpp',        // .3gp
  'audio/amr',         // .amr
  'video/mp4',         // some .m4a files report as video/mp4
  'video/webm',        // .webm with video track
  '',                  // unknown — allow (some opus files report no type)
])

export function isAudioTypeAllowed(file) {
  const type = file.type || ''
  // Always allow empty type (WhatsApp opus often reports no MIME type)
  if (type === '') return true
  return ALLOWED_TYPES.has(type)
}

export function friendlyFileType(filename, mimeType) {
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  if (ext === 'opus' || mimeType === 'audio/opus') return 'WhatsApp Audio'
  if (ext === 'ogg' || mimeType === 'audio/ogg') return 'OGG Audio'
  if (ext === 'mp3' || mimeType === 'audio/mpeg') return 'MP3'
  if (ext === 'm4a' || mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') return 'M4A'
  if (ext === 'wav' || mimeType?.includes('wav')) return 'WAV'
  if (ext === 'aac' || mimeType?.includes('aac')) return 'AAC'
  if (ext === 'flac' || mimeType?.includes('flac')) return 'FLAC'
  if (ext === 'webm') return 'WebM'
  if (ext === 'mp4') return 'MP4'
  if (ext === 'amr') return 'AMR'
  if (ext === '3gp') return '3GP'
  return 'Voice'
}

function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function saveRecording(data) {
  const db = await getDB()
  const record = {
    id: data.id || crypto.randomUUID(),
    filename: data.filename || 'recording.webm',
    audioBlob: data.audioBlob || null,
    duration: data.duration || 0,
    date: data.date || new Date().toISOString(),
    analysisStatus: data.analysisStatus || 'pending',
    analysis: data.analysis || null,
  }
  await db.put(STORE, record)
  return record
}

export async function getRecordings() {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function getRecording(id) {
  const db = await getDB()
  return db.get(STORE, id)
}

export async function updateRecording(id, updates) {
  const db = await getDB()
  const existing = await db.get(STORE, id)
  if (!existing) throw new Error(`Recording ${id} not found`)
  const updated = { ...existing, ...updates }
  await db.put(STORE, updated)
  return updated
}

export async function deleteRecording(id) {
  const db = await getDB()
  return db.delete(STORE, id)
}
