import { useState, useCallback } from 'react'
import { getRecording, updateRecording } from '../services/storageService'
import { transcribeWithWhisper, analyzeRecording } from '../services/analysisService'
import { checkMinutesBeforeAnalysis } from '../services/billingService'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function useAnalysis() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Transcribing audio')
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [insufficientMinutes, setInsufficientMinutes] = useState(false)

  const runAnalysis = useCallback(async (recordingId) => {
    try {
      setProgress(0)
      setStepIndex(0)
      setCurrentStep('Transcribing audio')
      setError(null)
      setIsComplete(false)
      setInsufficientMinutes(false)

      const recording = await getRecording(recordingId)
      if (!recording) throw new Error('Recording not found in local storage. Please re-import the file.')

      // Gate: reserve minutes before calling OpenAI
      const durationSec = recording.duration || 60
      const estimatedMinutes = Math.max(1, Math.ceil(durationSec / 60))
      const minutesCheck = await checkMinutesBeforeAnalysis(estimatedMinutes)
      if (!minutesCheck.ok) {
        setInsufficientMinutes(true)
        return
      }

      const blob = recording.audioBlob
      const filename = recording.filename || 'audio.webm'

      // Step 1: Transcribe with Whisper (0–40%)
      setStepIndex(0)
      setCurrentStep('Transcribing audio with AI')
      await updateRecording(recordingId, { analysisStatus: 'transcribing' })

      let whisperResult = { text: '', segments: [], duration: null }
      try {
        whisperResult = await transcribeWithWhisper(blob, filename)
      } catch (err) {
        throw new Error(`Transcription failed: ${err.message}`)
      }

      for (let p = 0; p <= 40; p += 4) {
        await delay(60)
        setProgress(p)
      }

      // Step 2: Analyze communication (40–80%)
      setStepIndex(1)
      setCurrentStep('Analyzing communication patterns')
      await updateRecording(recordingId, { analysisStatus: 'analyzing' })

      const analysis = await analyzeRecording(blob, whisperResult, recordingId)

      for (let p = 40; p <= 80; p += 4) {
        await delay(40)
        setProgress(p)
      }

      // Step 3: Generate report (80–100%)
      setStepIndex(2)
      setCurrentStep('Generating your report')

      for (let p = 80; p <= 100; p += 2) {
        await delay(35)
        setProgress(p)
      }

      setResult(analysis)
      setIsComplete(true)
    } catch (err) {
      setError(err.message || 'Analysis failed')
    }
  }, [])

  return { progress, currentStep, stepIndex, result, error, isComplete, insufficientMinutes, runAnalysis }
}
