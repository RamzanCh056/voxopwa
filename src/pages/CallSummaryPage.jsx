import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecordingMeta } from '../services/firestoreService'

function tsToDate(ts) {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  return new Date(ts)
}

function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m} min ${String(s).padStart(2, '0')} sec`
}

function formatDate(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const MOOD_EMOJIS = { Happy: '😊', Excited: '🤩', Sad: '😢', Angry: '😠', Calm: '😌', Neutral: '😐', Stressed: '😰', Anxious: '😟', Surprised: '😲' }
const MOOD_BG = { Happy: '#FEF9C3', Excited: '#F3E8FF', Sad: '#DBEAFE', Angry: '#FEE2E2', Calm: '#D1FAE5', Neutral: '#F3F4F6', Stressed: '#FFEDD5', Anxious: '#FEF3C7' }

function ClarityRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#F0F2F7" strokeWidth="9" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-bold text-gray-800 dark:text-white">{score}%</span>
        <span className="text-[10px] text-gray-400">clarity</span>
      </div>
    </div>
  )
}

export default function CallSummaryPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [recording, setRecording] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (id && user) {
      getRecordingMeta(user.uid, id).then(rec => {
        setRecording(rec)
        setAnalysis(rec?.analysis || null)
      })
    }
  }, [id, user])

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const W = 595.28, margin = 40, cW = W - margin * 2
    let y = 0
    const PURPLE = [30, 27, 75], ACCENT = [108, 99, 255], GREEN = [34, 197, 94]
    const RED = [239, 68, 68], GRAY = [107, 114, 128], LIGHT = [240, 242, 247]
    const WHITE = [255, 255, 255], DARK = [17, 24, 39]
    const moodRGB = { Happy: [251,191,36], Excited: [249,115,22], Calm: [34,197,94], Neutral: [107,114,128], Sad: [59,130,246], Stressed: [239,68,68], Angry: [220,38,38], Anxious: [168,85,247] }
    const sf = (...rgb) => doc.setFillColor(...rgb)
    const st = (...rgb) => doc.setTextColor(...rgb)
    const a = analysis || {}

    sf(...PURPLE); doc.rect(0, 0, W, 78, 'F')
    st(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
    doc.text('VOXOFIED AI', margin, 32)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Voice Mood & Intent Analysis Report', margin, 48)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text((recording?.filename || 'Unknown').slice(0, 65), margin, 64)
    st(148, 136, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text(`${formatDate(recording?.createdAt)}  •  ${formatDuration(recording?.duration)}`, W - margin, 64, { align: 'right' })
    y = 96

    const sectionLabel = (text) => { st(...GRAY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(text.toUpperCase(), margin, y); y += 14 }
    const cardRect = (x, cy, w, h) => { sf(...WHITE); doc.setDrawColor(229,231,235); doc.setLineWidth(0.5); doc.roundedRect(x, cy, w, h, 5, 5, 'FD') }

    sectionLabel('Overall Judgement')
    const half = (cW - 10) / 2
    cardRect(margin, y, half, 68)
    st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text('Primary Mood', margin + 10, y + 16)
    st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(`${a.primaryMoodEmoji || ''} ${a.primaryMood || 'Neutral'}`, margin + 10, y + 38)
    st(...ACCENT); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(`${a.confidence ?? 0}% confidence`, margin + 10, y + 55)
    const c2x = margin + half + 10
    cardRect(c2x, y, half, 68)
    st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text('Clarity', c2x + 10, y + 16)
    st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(a.communicationStyle || '—', c2x + 10, y + 38)
    st(...GREEN); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(`${a.clarityScore ?? 0} / 100`, c2x + 10, y + 55)
    y += 80

    sectionLabel('Communication Style')
    cardRect(margin, y, cW, 54)
    st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text('Clarity Score', margin + 10, y + 14)
    st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`${a.clarityScore ?? 0}/100  —  Sentiment: ${a.sentimentFlow || ''}`, margin + 10, y + 28)
    const bX = margin + 10, bY = y + 36, bW = cW - 20, bH = 8
    sf(...LIGHT); doc.roundedRect(bX, bY, bW, bH, 4, 4, 'F')
    if ((a.clarityScore ?? 0) > 0) { sf(...GREEN); doc.roundedRect(bX, bY, ((a.clarityScore ?? 0) / 100) * bW, bH, 4, 4, 'F') }
    y += 68

    if ((a.moodTimeline || []).length > 0) {
      if (y > 660) { doc.addPage(); y = 40 }
      sectionLabel('Mood Timeline')
      const chartH = 90, pts = a.moodTimeline, slotW = cW / pts.length
      sf(...LIGHT); doc.rect(margin, y, cW, chartH, 'F')
      pts.forEach((pt, i) => {
        const rgb = moodRGB[pt.mood] || ACCENT
        const intensity = Math.min(Math.max(pt.intensity || 3, 1), 5)
        const barH = (intensity / 5) * (chartH - 20)
        const bx = margin + i * slotW + 3, bw = slotW - 6, by = y + (chartH - 18) - barH
        sf(...rgb); doc.roundedRect(bx, by, bw, barH, 2, 2, 'F')
        st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5)
        doc.text(pt.time || '', bx + bw / 2, y + chartH - 5, { align: 'center' })
      })
      y += chartH + 12
    }

    const emoRows = Object.entries(a.emotions || {}).filter(([, v]) => v > 0).sort((x, z) => z[1] - x[1]).slice(0, 7)
    if (emoRows.length > 0) {
      if (y > 680) { doc.addPage(); y = 40 }
      sectionLabel('Emotion Breakdown')
      emoRows.forEach(([label, value]) => {
        st(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(label, margin, y)
        const tX = margin + 72, tW = cW - 72
        sf(...LIGHT); doc.roundedRect(tX, y - 7, tW, 8, 4, 4, 'F')
        const rgb = moodRGB[label] || ACCENT
        if (value > 0) { sf(...rgb); doc.roundedRect(tX, y - 7, (Math.min(value, 100) / 100) * tW, 8, 4, 4, 'F') }
        st(...GRAY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
        doc.text(`${value}%`, W - margin, y, { align: 'right' }); y += 16
      })
      y += 6
    }

    if ((a.smartHighlights || []).length > 0) {
      if (y > 660) { doc.addPage(); y = 40 }
      sectionLabel('Smart Highlights')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      a.smartHighlights.slice(0, 5).forEach(h => {
        if (y > 755) { doc.addPage(); y = 40 }
        const tW = doc.getTextWidth(h.time || '') + 10
        sf(237, 233, 254); doc.roundedRect(margin, y - 10, tW, 13, 3, 3, 'F')
        st(...ACCENT); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
        doc.text(h.time || '', margin + 5, y - 1)
        st(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        const lines = doc.splitTextToSize(h.text || '', cW - tW - 10)
        doc.text(lines, margin + tW + 6, y); y += Math.max(lines.length * 11, 16) + 5
      })
      y += 4
    }

    if ((a.recommendations || []).length > 0) {
      if (y > 680) { doc.addPage(); y = 40 }
      sectionLabel('AI Recommendations')
      a.recommendations.forEach(rec => {
        if (y > 755) { doc.addPage(); y = 40 }
        sf(...ACCENT); doc.circle(margin + 4, y - 3, 2.5, 'F')
        st(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        const lines = doc.splitTextToSize(rec, cW - 14)
        doc.text(lines, margin + 12, y); y += lines.length * 12 + 6
      })
    }

    const total = doc.internal.getNumberOfPages()
    for (let pg = 1; pg <= total; pg++) {
      doc.setPage(pg); sf(...PURPLE); doc.rect(0, 818, W, 24, 'F')
      st(148, 136, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
      doc.text('Generated by Voxofied AI  •  Voice Mood & Intent Analysis', margin, 832)
      doc.text(`Page ${pg} of ${total}`, W - margin, 832, { align: 'right' })
    }
    doc.save(`${recording?.filename || 'voxofied-report'}.pdf`)
  }

  function exportCSV() {
    if (!analysis) return
    const a = analysis
    const rows = [
      ['Field', 'Value'],
      ['Filename', recording?.filename || ''],
      ['Primary Mood', a.primaryMood || ''],
      ['Confidence', a.confidence || ''],
      ['Communication Style', a.communicationStyle || ''],
      ['Clarity Score', a.clarityScore || ''],
      ['Sentiment Flow', a.sentimentFlow || ''],
      ['Insights', (a.insights || []).join('; ')],
      ['Recommendations', (a.recommendations || []).join('; ')],
      ['What Went Well', (a.whatWentWell || []).join('; ')],
      ['Improvements', (a.improvements || []).join('; ')],
      ['Transcription', a.transcription || ''],
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${recording?.filename || 'analysis'}.csv`
    anchor.click(); URL.revokeObjectURL(url)
  }

  const a = analysis || {}
  const emoEntries = Object.entries(a.emotions || {}).filter(([, v]) => v >= 0)

  const clarityScore = a.clarityScore ?? 0
  const clarityLabel = clarityScore >= 70 ? 'High' : clarityScore >= 40 ? 'Medium' : 'Low'
  const clarityColor = clarityScore >= 70 ? '#22C55E' : clarityScore >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">Call Summary</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPDF}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
              PDF
            </button>
            <button onClick={exportCSV}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between bg-white dark:bg-[#1A1740] border-b border-gray-200 dark:border-[#2E2B5B] px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Call Summary</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#2E2B5B] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2E2B5B] transition-colors">
            Export PDF
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#6C63FF' }}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-6 md:px-8 flex flex-col gap-4 overflow-y-auto md:max-w-4xl md:w-full md:mx-auto">

        {/* File info */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{recording?.filename || '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDuration(recording?.duration)} · {formatDate(recording?.createdAt)}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
            style={recording?.analysisStatus === 'done'
              ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
              : { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
            {recording?.analysisStatus === 'done' ? 'Analyzed' : 'Not analyzed'}
          </span>
        </div>

        {!analysis ? (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-gray-400 text-sm">No analysis available yet.</p>
          </div>
        ) : (
          <>
            {/* Overall Judgement */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                Overall Judgement
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-2">Primary mood</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.primaryMoodEmoji || '😐'}</span>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm">{a.primaryMood || 'Neutral'}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: '#6C63FF' }}>
                        {a.confidence ?? 0}% confidence
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-2">Clarity</p>
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill={clarityColor} className="w-6 h-6 flex-shrink-0">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm">{clarityLabel}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: clarityColor }}>
                        {clarityScore} / 100
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mood Detected Grid */}
            {emoEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Mood Detected
                </p>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                  {emoEntries.map(([mood, value]) => {
                    const isTop = mood === a.primaryMood
                    return (
                      <div key={mood}
                        className="rounded-2xl p-3 flex flex-col items-center gap-1 transition-all"
                        style={{
                          background: MOOD_BG[mood] || '#F3F4F6',
                          outline: isTop ? '2px solid #A78BFA' : 'none',
                          outlineOffset: '0px',
                        }}>
                        <span className="text-2xl">{MOOD_EMOJIS[mood] || '😐'}</span>
                        <span className="text-xs font-medium text-gray-700">{mood}</span>
                        {value > 0 && (
                          <span className="text-xs font-semibold" style={{ color: '#6C63FF' }}>{value}%</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Communication Style */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                Communication Style
              </p>
              <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <ClarityRing score={clarityScore} />
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-xs text-gray-400">Communication Clarity</p>
                      <p className="font-bold text-gray-800 dark:text-white text-base">{clarityScore} / 100</p>
                    </div>
                    {a.communicationStyle && (
                      <span className="self-start text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                        {a.communicationStyle}
                      </span>
                    )}
                  </div>
                </div>

                {a.sentimentFlow && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#4F8AFF' }} />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sentiment flow: <span className="font-semibold">{a.sentimentFlow}</span>
                    </p>
                  </div>
                )}

                {(a.keyTimestamps || []).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Key moments</p>
                    <div className="flex flex-col gap-1.5">
                      {a.keyTimestamps.map((t, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4F8AFF' }} />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{t.time} — {t.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Suggestions */}
            {(a.whatWentWell || a.improvements || a.suggestedResponses || a.recommendations) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  AI Suggestions
                </p>
                <div className="rounded-2xl p-4 shadow-sm flex flex-col gap-4 bg-gradient-to-br from-[#F5F3FF] to-[#EEF2FF] dark:from-[#1E1B4B] dark:to-[#1A1740]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <span className="font-bold text-gray-800 dark:text-white text-base">AI Suggestions</span>
                  </div>

                  {/* What you did well */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span>👍</span>
                      <span className="font-semibold text-gray-800 dark:text-white text-sm">What you did well</span>
                    </div>
                    {(a.whatWentWell || a.recommendations?.slice(0, 1) || ['Good communication tone detected']).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* What to improve */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span>📈</span>
                      <span className="font-semibold text-gray-800 dark:text-white text-sm">What to improve</span>
                    </div>
                    {(a.improvements || a.recommendations?.slice(1, 2) || ['Consider varying your tone more']).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Suggested responses */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span>💡</span>
                      <span className="font-semibold text-gray-800 dark:text-white text-sm">Suggested responses</span>
                    </div>
                    {(a.suggestedResponses || [
                      'Pause before responding to collect your thoughts',
                      'Use "I feel" statements to express yourself clearly',
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Coach summary */}
                  {a.aiCoachSummary && (
                    <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(108,99,255,0.08)' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#6C63FF' }}>AI Coach</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a.aiCoachSummary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Smart Highlights */}
            {(a.smartHighlights || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Smart Highlights
                </p>
                <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(108,99,255,0.1)' }}>
                      <span className="text-lg">✨</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm">Smart Highlights</p>
                      <p className="text-xs text-gray-400">Key moments detected in your call</p>
                    </div>
                    <button onClick={() => navigate(`/mood-timeline/${id}`)}
                      className="ml-auto text-xs font-semibold flex-shrink-0" style={{ color: '#6C63FF' }}>
                      Full timeline →
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {a.smartHighlights.map((h, i) => {
                      const text = h.text || ''
                      const isPositive = text.toLowerCase().includes('calm') ||
                        text.toLowerCase().includes('confident') ||
                        text.toLowerCase().includes('positive') ||
                        text.toLowerCase().includes('steady') ||
                        text.toLowerCase().includes('recovery') ||
                        text.toLowerCase().includes('natural')
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: isPositive ? '#F0FDF4' : '#FFF7ED' }}>
                          <div className="px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                            style={isPositive
                              ? { background: '#BBF7D0', color: '#15803D' }
                              : { background: '#FED7AA', color: '#C2410C' }}>
                            {h.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            {h.title && (
                              <p className="text-sm font-semibold text-gray-800 leading-tight">{h.title}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{text}</p>
                          </div>
                          <span className="text-base flex-shrink-0" style={{ color: isPositive ? '#22C55E' : '#F97316' }}>
                            {isPositive ? '↑' : '↓'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights */}
            {(a.insights || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  AI Insights
                </p>
                <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  {a.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#6C63FF' }} />
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={() => navigate(`/mood-timeline/${id}`)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white"
                style={{ background: '#6C63FF' }}>
                View Mood Timeline
              </button>
              <button onClick={() => navigate(`/reliability/${id}`)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm border-2 bg-white dark:bg-[#1E1B4B]"
                style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
                Clarity Insights
              </button>
            </div>

            {/* Export */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Export</p>
              <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => navigate(`/export/${id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2E2B5B] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white text-left">Export Report</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                    strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <div className="h-px mx-4 bg-gray-100 dark:bg-[#2E2B5B]" />
                <button onClick={exportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2E2B5B] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white text-left">Export as CSV</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                    strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
