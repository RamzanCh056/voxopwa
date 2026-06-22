import { updateRecording } from './storageService'

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

export async function analyzeRecording(audioBlob, transcription, recordingId) {
  const prompt = `Analyze this voice transcription for mood and emotions. Return ONLY a valid JSON object with no extra text.

CRITICAL RULES:
- moodTimeline MUST contain EXACTLY 6 objects, evenly spaced. If audio is short, use 0:00, 0:05, 0:10, 0:15, 0:20, 0:25. Never return fewer than 6 points.
- Each moodTimeline entry: { "time": "M:SS", "mood": one of Happy|Sad|Angry|Excited|Calm|Neutral|Stressed|Anxious, "intensity": integer 1-5 }
- emotions values MUST sum to 100.
- detectedSignals: at least 2 entries.
- smartHighlights: exactly 3 entries, each with "time", "title" (short 2-4 word label), and "text" (description).
- insights: exactly 3 entries.
- recommendations: exactly 2 entries.
- whatWentWell: exactly 2 positive observations about the speaker's communication.
- improvements: exactly 2 constructive improvements the speaker can work on.
- suggestedResponses: exactly 2 actionable phrases or techniques the speaker can use next time.
- aiCoachSummary: one concise paragraph (2-3 sentences) of coaching feedback.

{
  "primaryMood": "one of: Neutral|Happy|Sad|Angry|Excited|Calm|Stressed|Anxious",
  "primaryMoodEmoji": "matching emoji",
  "confidence": number 0-100,
  "reliability": "High|Medium|Low",
  "reliabilityScore": number 0-100,
  "honestyScore": number 0-100,
  "honestyLabel": "Likely Truthful|Uncertain|Deceptive indicators",
  "detectedSignals": ["Signal 1", "Signal 2", "Signal 3"],
  "emotions": { "Happy": 0, "Sad": 0, "Angry": 0, "Excited": 0, "Calm": 0, "Neutral": 0, "Stressed": 0 },
  "keyTimestamps": [{ "time": "0:05", "event": "description" }, { "time": "0:15", "event": "description" }],
  "smartHighlights": [
    { "time": "0:00", "title": "Calm Opening", "text": "Speaker starts with a steady, controlled tone" },
    { "time": "0:10", "title": "Stress Spike", "text": "Noticeable tension detected in vocal pattern" },
    { "time": "0:20", "title": "Recovery", "text": "Voice returns to baseline composure" }
  ],
  "moodTimeline": [
    { "time": "0:00", "mood": "Neutral", "intensity": 3 },
    { "time": "0:05", "mood": "Calm", "intensity": 2 },
    { "time": "0:10", "mood": "Stressed", "intensity": 4 },
    { "time": "0:15", "mood": "Neutral", "intensity": 3 },
    { "time": "0:20", "mood": "Calm", "intensity": 2 },
    { "time": "0:25", "mood": "Neutral", "intensity": 3 }
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "whatWentWell": ["positive observation 1", "positive observation 2"],
  "improvements": ["improvement area 1", "improvement area 2"],
  "suggestedResponses": ["actionable suggestion 1", "actionable suggestion 2"],
  "aiCoachSummary": "One paragraph coaching summary here."
}
Transcription: "${transcription || 'No transcription available, analyze based on context'}"
`

  const response = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || '{}'

  let analysis
  try {
    analysis = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    analysis = JSON.parse(match ? match[0] : '{}')
  }

  // Guarantee moodTimeline always has ≥ 6 points
  if (!analysis.moodTimeline || analysis.moodTimeline.length < 6) {
    const fallback = [
      { time: '0:00', mood: analysis.primaryMood || 'Neutral', intensity: 3 },
      { time: '0:05', mood: 'Calm', intensity: 2 },
      { time: '0:10', mood: analysis.primaryMood || 'Neutral', intensity: 4 },
      { time: '0:15', mood: 'Neutral', intensity: 3 },
      { time: '0:20', mood: 'Calm', intensity: 2 },
      { time: '0:25', mood: analysis.primaryMood || 'Neutral', intensity: 3 },
    ]
    const existing = analysis.moodTimeline || []
    analysis.moodTimeline = [
      ...existing,
      ...fallback.slice(existing.length),
    ]
  }

  if (recordingId) {
    await updateRecording(recordingId, { analysis, analysisStatus: 'done' })
  }

  return analysis
}
