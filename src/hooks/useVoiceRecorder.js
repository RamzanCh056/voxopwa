import { useState, useRef, useCallback, useEffect } from 'react'

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState(new Array(40).fill(0))
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioURL, setAudioURL] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const durationTimerRef = useRef(null)
  const streamRef = useRef(null)

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const step = Math.floor(data.length / 40)
    const bars = Array.from({ length: 40 }, (_, i) => {
      const slice = data.slice(i * step, (i + 1) * step)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      return Math.round(avg)
    })
    setWaveformData(bars)
    animFrameRef.current = requestAnimationFrame(updateWaveform)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioURL(url)
      }

      recorder.start()
      setIsRecording(true)
      setDuration(0)

      durationTimerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      updateWaveform()
    } catch (err) {
      console.error('Mic permission denied:', err)
    }
  }, [updateWaveform])

  const stopRecording = useCallback(() => {
    return new Promise(resolve => {
      if (!mediaRecorderRef.current) return resolve(null)

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioURL(url)
        resolve({ audioBlob: blob, audioURL: url, duration })
      }

      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(durationTimerRef.current)
      setIsRecording(false)
      setWaveformData(new Array(40).fill(0))
    })
  }, [duration])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(durationTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return { isRecording, duration, waveformData, startRecording, stopRecording, audioBlob, audioURL }
}
