import { useState, useCallback } from 'react'
import { getRecording, updateRecording } from '../services/storageService'
import { analyzeRecording } from '../services/analysisService'

// Formats that Web Speech API cannot play back for transcription
const SPEECH_API_UNSUPPORTED_EXTS = new Set(['opus', 'ogg', 'amr', '3gp', 'flac', 'wma'])
const SPEECH_API_UNSUPPORTED_TYPES = new Set([
  'audio/opus', 'audio/ogg', 'application/ogg',
  'audio/amr', 'audio/3gpp', 'audio/flac', 'audio/x-flac',
])

function isTranscribable(blob, filename) {
  if (!blob) return false
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  if (SPEECH_API_UNSUPPORTED_EXTS.has(ext)) return false
  if (blob.type && SPEECH_API_UNSUPPORTED_TYPES.has(blob.type)) return false
  return true
}

function getTranscriptionContext(filename, mimeType) {
  const ext = filename?.split('.').pop()?.toLowerCase() || ''
  if (ext === 'opus' || mimeType === 'audio/opus') {
    return `This is a WhatsApp voice message in opus format (filename: ${filename}). Transcription not available — analyze based on the filename context and provide a general mood analysis.`
  }
  if (ext === 'ogg' || mimeType?.includes('ogg')) {
    return `This is an OGG audio file (filename: ${filename}). Transcription not available — analyze based on the filename context.`
  }
  return filename || 'No transcription available'
}

export function useAnalysis() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Transcribing audio')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  const runAnalysis = useCallback(async (recordingId) => {
    try {
      setProgress(0)
      setStepIndex(0)
      setCurrentStep('Transcribing audio')
      setError(null)
      setIsComplete(false)

      const recording = await getRecording(recordingId)
      if (!recording) throw new Error('Recording not found in local storage. Please re-import the file.')

      const blob = recording.audioBlob
      const filename = recording.filename || ''
      const mimeType = blob?.type || ''

      // Step 1: Transcribe (0–33%)
      let transcription = ''
      const canTranscribe = isTranscribable(blob, filename)
        && typeof window !== 'undefined'
        && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

      if (canTranscribe) {
        try {
          transcription = await transcribeAudio(blob)
        } catch {
          transcription = getTranscriptionContext(filename, mimeType)
        }
      } else {
        transcription = getTranscriptionContext(filename, mimeType)
      }

      for (let p = 0; p <= 33; p += 3) {
        await delay(80)
        setProgress(p)
      }

      // Step 2: Analyze emotions (33–66%)
      setStepIndex(1)
      setCurrentStep('Analyzing emotions')
      await updateRecording(recordingId, { analysisStatus: 'analyzing' })

      const analysis = await analyzeRecording(blob, transcription, recordingId)

      for (let p = 33; p <= 66; p += 3) {
        await delay(50)
        setProgress(p)
      }

      // Step 3: Generate report (66–100%)
      setStepIndex(2)
      setCurrentStep('Generating mood report')

      for (let p = 66; p <= 100; p += 2) {
        await delay(40)
        setProgress(p)
      }

      setResult(analysis)
      setIsComplete(true)
    } catch (err) {
      setError(err.message || 'Analysis failed')
    }
  }, [])

  return { progress, currentStep, stepIndex, result, error, isComplete, runAnalysis }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function transcribeAudio(blob) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    if (!SpeechRecognition) return reject(new Error('No speech API'))

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    let transcript = ''

    recognition.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '
      }
    }

    recognition.onerror = () => resolve(transcript || '')
    recognition.onend = () => { URL.revokeObjectURL(url); resolve(transcript.trim()) }

    recognition.start()
    audio.play().catch(() => {})
    setTimeout(() => recognition.stop(), 10000)
  })
}
