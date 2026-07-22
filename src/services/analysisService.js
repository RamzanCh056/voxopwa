import { updateRecording } from './storageService'

const OPENAI_API = 'https://api.openai.com/v1'

function segTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Normalise filename to an extension Whisper accepts
function audioFilename(originalName) {
  const supported = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|flac)$/i
  if (supported.test(originalName)) return originalName
  const base = originalName.replace(/\.[^.]+$/, '') || 'audio'
  return `${base}.webm`
}

export async function transcribeWithWhisper(audioBlob, filename = 'audio.webm') {
  if (!audioBlob) throw new Error('No audio data to transcribe.')

  const form = new FormData()
  form.append('file', audioBlob, audioFilename(filename))
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')

  const res = await fetch(`${OPENAI_API}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    text: data.text?.trim() || '',
    segments: data.segments || [],
    duration: data.duration || null,
  }
}

export async function analyzeRecording(audioBlob, whisperResult, recordingId, recordingType = 'general') {
  const transcription = whisperResult?.text || ''
  const segments = whisperResult?.segments || []
  const language = localStorage.getItem('voxofied_language') || 'English'

  if (!transcription) {
    throw new Error(
      'No speech detected in the recording. Please make sure the audio has clear speech and try again.'
    )
  }

  // Build timed transcript for GPT
  const timedTranscript =
    segments.length > 0
      ? segments.map(s => `[${segTime(s.start)}] ${s.text.trim()}`).join('\n')
      : transcription

  // Choose up to 6 real time points from Whisper segments
  const timelineChunks = []
  if (segments.length >= 2) {
    const step = Math.max(1, Math.floor(segments.length / 6))
    for (let i = 0; i < segments.length && timelineChunks.length < 5; i += step) {
      const seg = segments[i]
      timelineChunks.push({ time: segTime(seg.start), snippet: seg.text.trim().slice(0, 80) })
    }
    // Always include the last segment
    const last = segments[segments.length - 1]
    timelineChunks.push({ time: segTime(last.start), snippet: last.text.trim().slice(0, 80) })
  }

  const timelineInstruction =
    timelineChunks.length >= 2
      ? `Use EXACTLY these real timestamps from the transcript for moodTimeline (do NOT invent different times):\n${timelineChunks.map(c => `  { "time": "${c.time}", "snippet": "${c.snippet}" }`).join('\n')}\nAssign mood and intensity for each.`
      : `Create 6 moodTimeline entries with plausible timestamps spread across the recording.`

  const salesExtra = recordingType === 'sales' ? `
- Also include "salesAnalysis": {
    "overallScore": 0-100,
    "buyingSignals": [{ "timestamp": "M:SS", "signal": "short label", "quote": "exact words", "type": "positive|neutral|negative" }],
    "objections": [{ "timestamp": "M:SS", "description": "objection description" }],
    "rapportScore": 0-100,
    "rapportLabel": "Low|Medium|High",
    "confidenceScore": 0-100,
    "aiTip": "One actionable tip to improve this call"
  }` : ''

  const prompt = `You are an expert communication coach and AI speech analyst. Analyze this voice recording transcript and return a JSON coaching report.

IMPORTANT: Base ALL observations strictly on the words spoken. Do NOT make claims about voice pitch, vocal patterns, tremors, breathing, or any acoustic properties — you only have text.
${language !== 'English' ? `LANGUAGE: Respond with all mood labels, insights and recommendations in ${language}. Keep all JSON keys in English.` : ''}
Recording type: ${recordingType}

Rules:
- emotions values MUST sum to 100
- ${timelineInstruction}
- Each moodTimeline entry: { "time": "M:SS", "mood": one of Happy|Sad|Angry|Excited|Calm|Neutral|Stressed|Anxious, "intensity": integer 1-5 }
- smartHighlights: exactly 3 entries { "time": "M:SS", "title": "2-4 word label", "text": "what was communicated at this moment" }
- insights: exactly 3 specific observations about how this person communicates
- recommendations: exactly 2 actionable improvements for this speaker
- whatWentWell: exactly 2 specific positives from the transcript
- improvements: exactly 2 areas where communication could be stronger
- suggestedResponses: exactly 2 alternative phrases or techniques the speaker could use next time
- aiCoachSummary: 2-3 sentences of honest, specific coaching feedback
${salesExtra}

Return ONLY valid JSON:
{
  "primaryMood": "one of: Neutral|Happy|Sad|Angry|Excited|Calm|Stressed|Anxious",
  "primaryMoodEmoji": "matching emoji",
  "confidence": 0-100,
  "communicationStyle": "one of: Direct|Diplomatic|Assertive|Passive|Analytical|Emotional|Mixed",
  "clarityScore": 0-100,
  "sentimentFlow": "one of: Stable|Escalating|De-escalating|Mixed",
  "emotions": { "Happy": 0, "Sad": 0, "Angry": 0, "Excited": 0, "Calm": 0, "Neutral": 0, "Stressed": 0 },
  "moodTimeline": [],
  "smartHighlights": [],
  "insights": [],
  "recommendations": [],
  "whatWentWell": [],
  "improvements": [],
  "suggestedResponses": [],
  "aiCoachSummary": ""
}

Transcript:
${timedTranscript}`

  const res = await fetch(`${OPENAI_API}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'

  let analysis
  try {
    analysis = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    analysis = JSON.parse(match ? match[0] : '{}')
  }

  // Guarantee at least 2 timeline points
  if (!analysis.moodTimeline || analysis.moodTimeline.length < 2) {
    analysis.moodTimeline = [
      { time: '0:00', mood: analysis.primaryMood || 'Neutral', intensity: 3 },
      { time: '0:30', mood: analysis.primaryMood || 'Neutral', intensity: 3 },
    ]
  }

  // Store the real transcription so the UI can display it
  analysis.transcription = transcription
  analysis.transcriptionSegments = segments.slice(0, 50) // keep first 50 segments

  if (recordingId) {
    await updateRecording(recordingId, { analysis, analysisStatus: 'done' })
  }

  return analysis
}
