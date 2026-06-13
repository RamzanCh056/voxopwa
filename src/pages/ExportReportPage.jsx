import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getRecordingMeta } from '../services/firestoreService'

function tsToDate(ts) {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  return new Date(ts)
}
function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
function formatDate(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/* Small labeled text input */
function Field({ label, value, onChange, placeholder, darkMode, type = 'text' }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: darkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FF',
          border: `1.5px solid ${focused ? '#6C63FF' : darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
          color: darkMode ? '#ffffff' : '#1F2937',
          boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.15)' : 'none',
        }} />
    </div>
  )
}

export default function ExportReportPage() {
  const navigate     = useNavigate()
  const { id }       = useParams()
  const { user }     = useAuth()
  const { darkMode } = useTheme()

  const [recording,       setRecording]       = useState(null)
  const [analysis,        setAnalysis]        = useState(null)
  const [selectedFormat,  setSelectedFormat]  = useState('pdf')
  const [loading,         setLoading]         = useState(false)
  const [toast,           setToast]           = useState('')

  const today = new Date()
  const [patient, setPatient] = useState({
    name:          '',
    date:          today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time:          today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    refNr:         '',
    practitioner:  '',
  })
  const patchPatient = k => v => setPatient(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (id && user) {
      getRecordingMeta(user.uid, id).then(rec => {
        setRecording(rec)
        setAnalysis(rec?.analysis || null)
      })
    }
  }, [id, user])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(''), 2800)
  }

  async function handleGenerate() {
    setLoading(true)
    try {
      if (selectedFormat === 'pdf') await exportPDF()
      else if (selectedFormat === 'csv') exportCSV()
      else shareLink()
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const a = analysis || {}
    const rows = [
      ['Field', 'Value'],
      ['Patient Name', patient.name],
      ['Date', patient.date],
      ['Time', patient.time],
      ['Ref Nr', patient.refNr],
      ['Practitioner', patient.practitioner],
      ['Filename', recording?.filename || ''],
      ['Primary Mood', a.primaryMood || ''],
      ['Confidence', a.confidence || ''],
      ['Reliability', a.reliability || ''],
      ['Reliability Score', a.reliabilityScore || ''],
      ['Honesty Score', a.honestyScore || ''],
      ['Honesty Label', a.honestyLabel || ''],
      ['Detected Signals', (a.detectedSignals || []).join('; ')],
      ['Insights', (a.insights || []).join('; ')],
      ['Recommendations', (a.recommendations || []).join('; ')],
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const el   = document.createElement('a')
    el.href = url; el.download = `${recording?.filename || 'analysis'}.csv`; el.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported!')
  }

  function shareLink() {
    const url = `${window.location.origin}/summary/${id}`
    navigator.clipboard?.writeText(url)
      .then(() => showToast('Link copied!'))
      .catch(() => showToast(`Link: ${url}`))
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const W = 595.28, margin = 40, cW = W - margin * 2
    const PAGE_H = 841.89, FOOTER_H = 30, SAFE_BOTTOM = PAGE_H - FOOTER_H - 10
    let y = 0

    const PURPLE = [30, 27, 75], ACCENT = [108, 99, 255], GREEN = [34, 197, 94]
    const RED = [239, 68, 68], GRAY = [107, 114, 128], LIGHT = [240, 242, 247]
    const WHITE = [255, 255, 255], DARK = [17, 24, 39], BORDER = [229, 231, 235]
    const PURPLE_LIGHT = [237, 233, 254]

    const moodRGB = {
      Happy: [251,191,36], Excited: [249,115,22], Calm: [34,197,94],
      Neutral: [107,114,128], Sad: [59,130,246], Stressed: [239,68,68],
      Angry: [220,38,38], Anxious: [168,85,247],
    }

    const sf = (...rgb) => doc.setFillColor(...rgb)
    const st = (...rgb) => doc.setTextColor(...rgb)
    const a = analysis || {}

    const checkPageBreak = (needed = 20) => {
      if (y + needed > SAFE_BOTTOM) { doc.addPage(); y = 30 }
    }
    const sectionLabel = text => {
      checkPageBreak(24); st(...GRAY)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
      doc.text(text.toUpperCase(), margin, y); y += 14
    }
    const cardRect = (x, cy, w, h) => {
      sf(...WHITE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.5)
      doc.roundedRect(x, cy, w, h, 5, 5, 'FD')
    }

    const durSecs = recording?.duration || 0
    const dur = durSecs
      ? `${Math.floor(durSecs / 60)}:${String(Math.floor(durSecs % 60)).padStart(2, '0')} min`
      : 'Duration unknown'

    // ── HEADER ──────────────────────────────────────────────────────────────
    sf(...PURPLE); doc.rect(0, 0, W, 80, 'F')
    st(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
    doc.text('VOXOFIED AI', margin, 32)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text('Voice Mood & Intent Analysis Report', margin, 48)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text((recording?.filename || 'Unknown').slice(0, 65), margin, 64)
    st(148, 136, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text(`${formatDate(recording?.createdAt)}  •  ${dur}`, W - margin, 64, { align: 'right' })
    y = 90

    // ── PROFESSIONAL / PATIENT INFO BOX ─────────────────────────────────────
    // Only include if any field is filled
    const hasPatientInfo = patient.name || patient.refNr || patient.practitioner
    if (hasPatientInfo) {
      // Outer box with light purple tint
      sf(...PURPLE_LIGHT); doc.setDrawColor(196, 181, 253); doc.setLineWidth(0.7)
      doc.roundedRect(margin, y, cW, 72, 6, 6, 'FD')

      // Top label bar
      sf(108, 99, 255); doc.roundedRect(margin, y, cW, 16, 6, 6, 'F')
      sf(108, 99, 255); doc.rect(margin, y + 8, cW, 8, 'F')
      st(...WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
      doc.text('PROFESSIONAL REPORT — CONFIDENTIAL', margin + 8, y + 11)

      y += 22

      // Two-column grid of fields
      const col1x = margin + 8, col2x = margin + cW / 2 + 4
      const fields = [
        ['PATIENT NAME', patient.name || '—'],
        ['DATE', patient.date || '—'],
        ['TIME', patient.time || '—'],
        ['REF NR', patient.refNr || '—'],
      ]
      const prac = patient.practitioner

      fields.forEach(([label, val], i) => {
        const x = i % 2 === 0 ? col1x : col2x
        if (i % 2 === 0 && i > 0) y += 18
        st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
        doc.text(label, x, y)
        st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text(val, x, y + 9)
      })
      y += 18

      if (prac) {
        st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
        doc.text('PRACTITIONER / CLINICIAN', col1x, y)
        st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text(prac, col1x, y + 9)
        y += 18
      }

      y += 10

      // Privacy note under box
      st(...GRAY); doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5)
      doc.text(
        '⚑  Audio file was never uploaded. Voice data processed locally on the practitioner\'s device only.',
        margin, y
      )
      y += 14
    } else {
      y += 10
    }

    // ── OVERALL JUDGEMENT ────────────────────────────────────────────────────
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
    doc.text('Reliability', c2x + 10, y + 16)
    st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(a.reliability || '—', c2x + 10, y + 38)
    st(...GREEN); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(`${a.reliabilityScore ?? 0} / 100`, c2x + 10, y + 55)
    y += 80

    if ((a.insights || []).length > 0) {
      checkPageBreak(20 + a.insights.length * 14)
      st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('Key Insights:', margin, y); y += 6
      a.insights.forEach(insight => {
        const lines = doc.splitTextToSize(`• ${insight}`, cW)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); st(60, 60, 60)
        doc.text(lines, margin, y); y += lines.length * 5 + 3
      })
      y += 6
    }

    // ── TRUTH & INTENT ───────────────────────────────────────────────────────
    sectionLabel('Truth & Intent')
    checkPageBreak(68)
    cardRect(margin, y, cW, 54)
    st(...GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text('Honesty Score', margin + 10, y + 14)
    st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`${a.honestyScore ?? 0}/100  —  ${a.honestyLabel || ''}`, margin + 10, y + 28)
    const bX = margin + 10, bY = y + 36, bW = cW - 20, bH = 8
    sf(...LIGHT); doc.roundedRect(bX, bY, bW, bH, 4, 4, 'F')
    if ((a.honestyScore ?? 0) > 0) {
      sf(...GREEN); doc.roundedRect(bX, bY, ((a.honestyScore ?? 0) / 100) * bW, bH, 4, 4, 'F')
    }
    y += 66

    if ((a.detectedSignals || []).length > 0) {
      checkPageBreak(32)
      sectionLabel('Detected Signals')
      let px = margin; const pillH = 16
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      a.detectedSignals.forEach(sig => {
        const tw = doc.getTextWidth(sig) + 14
        if (px + tw > W - margin) { px = margin; y += pillH + 4 }
        sf(254, 226, 226); doc.roundedRect(px, y - 11, tw, pillH, 3, 3, 'F')
        st(...RED); doc.text(sig, px + 7, y - 1); px += tw + 6
      })
      y += pillH + 6
    }

    if ((a.keyTimestamps || []).length > 0) {
      checkPageBreak(16 + a.keyTimestamps.length * 9)
      st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('Key Timestamps:', margin, y); y += 6
      a.keyTimestamps.forEach(ts => {
        sf(219, 234, 254); doc.circle(margin + 2, y - 1, 1.5, 'F')
        st(60, 60, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(`${ts.time} — ${ts.event}`, margin + 6, y); y += 7
      })
      y += 6
    }

    if ((a.moodTimeline || []).length > 0) {
      sectionLabel('Mood Timeline')
      checkPageBreak(102)
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
      y += chartH + 10
      checkPageBreak(16 + pts.length * 9)
      st(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('Timeline Segments:', margin, y); y += 6
      pts.forEach((pt, i) => {
        const next = pts[i + 1]
        const timeRange = next ? `${pt.time} – ${next.time}` : pt.time
        const mLow = (pt.mood || '').toLowerCase()
        const dotRgb = (mLow.includes('stress') || mLow.includes('angry')) ? [239,68,68]
          : (mLow.includes('calm') || mLow.includes('happy')) ? [16,185,129]
          : [245,158,11]
        sf(...dotRgb); doc.circle(margin + 2, y - 1, 1.5, 'F')
        st(60, 60, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(`${timeRange} — Mostly ${pt.mood} (Intensity: ${pt.intensity}/5)`, margin + 6, y)
        y += 7
      })
      y += 6
    }

    const emoRows = Object.entries(a.emotions || {}).filter(([, v]) => v > 0).sort((x, z) => z[1] - x[1]).slice(0, 7)
    if (emoRows.length > 0) {
      sectionLabel('Emotion Breakdown')
      checkPageBreak(emoRows.length * 17)
      emoRows.forEach(([label, value]) => {
        checkPageBreak(16)
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
      sectionLabel('Smart Highlights')
      a.smartHighlights.slice(0, 5).forEach(h => {
        const hlLines = doc.splitTextToSize(h.text || '', cW - 30)
        checkPageBreak(hlLines.length * 5 + 16)
        const tW = doc.getTextWidth(h.time || '') + 10
        sf(...PURPLE_LIGHT); doc.roundedRect(margin, y - 10, tW, 13, 3, 3, 'F')
        st(...ACCENT); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
        doc.text(h.time || '', margin + 5, y - 1)
        st(...DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        doc.text(hlLines, margin + tW + 6, y)
        y += Math.max(hlLines.length * 5 + 8, 14)
      })
      y += 4
    }

    if ((a.recommendations || []).length > 0) {
      sectionLabel('AI Wellness Recommendations')
      a.recommendations.forEach((rec, i) => {
        const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, cW - 10)
        checkPageBreak(recLines.length * 5 + 14)
        sf(245, 243, 255); doc.roundedRect(margin, y - 3, cW, recLines.length * 5 + 9, 3, 3, 'F')
        st(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text(recLines, margin + 5, y + 4)
        y += recLines.length * 5 + 12
      })
      y += 4
    }

    if (a.transcription || a.rawText) {
      sectionLabel('Voice Transcription')
      const transLines = doc.splitTextToSize(a.transcription || a.rawText || '', cW)
      checkPageBreak(Math.min(transLines.length * 5, 80) + 10)
      st(60, 60, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
      doc.text(transLines, margin, y)
      y += transLines.length * 4.5 + 6
    }

    // ── FOOTER on every page ─────────────────────────────────────────────────
    const total = doc.internal.getNumberOfPages()
    for (let pg = 1; pg <= total; pg++) {
      doc.setPage(pg)
      sf(...PURPLE); doc.rect(0, PAGE_H - FOOTER_H, W, FOOTER_H, 'F')
      st(148, 136, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
      const refText = patient.refNr ? `  Ref: ${patient.refNr}` : ''
      doc.text(`Generated by Voxofied AI  •  Voice processed on-device only${refText}`, margin, PAGE_H - 10)
      doc.text(`Page ${pg} of ${total}`, W - margin, PAGE_H - 10, { align: 'right' })
    }

    const safeName = (patient.name || recording?.filename || 'voxofied-report').replace(/[^a-z0-9]/gi, '_')
    doc.save(`${safeName}_voxofied.pdf`)
    showToast('PDF saved!')
  }

  // ── Format options ──────────────────────────────────────────────────────────
  const formats = [
    {
      id: 'pdf',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
      iconBg: 'rgba(239,68,68,0.1)',
      label: 'PDF Report',
      desc: 'Full clinical report with patient info, mood analysis, and honesty score.',
      badge: 'Recommended',
      badgeColor: '#EF4444',
    },
    {
      id: 'link',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
      iconBg: 'rgba(59,130,246,0.1)',
      label: 'Share Summary Link',
      desc: 'Quick shareable link to analysis results. No audio is shared.',
    },
    {
      id: 'csv',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
      iconBg: 'rgba(59,130,246,0.1)',
      label: 'Export Raw Data',
      desc: 'CSV with all voice analysis metrics. Good for spreadsheets & research.',
    },
  ]

  const reliabilityScore = analysis?.reliabilityScore ?? 0
  const honestyScore     = analysis?.honestyScore ?? 0
  const primaryMood      = analysis?.primaryMood || 'Neutral'

  const inputStyle = (focused = false) => ({
    background:  darkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FF',
    border:      `1.5px solid ${focused ? '#6C63FF' : darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
    color:       darkMode ? '#ffffff' : '#1F2937',
    boxShadow:   focused ? '0 0 0 3px rgba(108,99,255,0.15)' : 'none',
  })

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#1E1B4B' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-xl transition-all"
          style={{ background: toast.ok !== false ? '#22C55E' : '#EF4444', animation: 'scale-in 0.25s ease both' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Export Report</h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 rounded-t-3xl flex flex-col gap-4 px-4 pt-5 pb-10 overflow-y-auto bg-[#F0F2F7] dark:bg-[#0F0C29]">

        {/* Recording info */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#4F8AFF,#6C63FF)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{recording?.filename || '—'}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400">{formatDuration(recording?.duration)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"/>
              <span className="text-xs text-gray-400">{formatDate(recording?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* ── PROFESSIONAL DETAILS FORM ── */}
        {selectedFormat === 'pdf' && (
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden"
            style={{ animation: 'fade-up 0.4s ease both' }}>

            {/* Card header bar */}
            <div className="px-4 py-3 flex items-center gap-2.5"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Professional Report Fields</p>
                <p className="text-white/60 text-[11px]">These will appear at the top of the PDF</p>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Name + Ref Nr side by side */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Patient Name" value={patient.name}
                  onChange={patchPatient('name')} placeholder="e.g. Jane Smith" darkMode={darkMode} />
                <Field label="Ref Nr" value={patient.refNr}
                  onChange={patchPatient('refNr')} placeholder="e.g. REF-0042" darkMode={darkMode} />
              </div>

              {/* Date + Time side by side */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" value={patient.date}
                  onChange={patchPatient('date')} placeholder="June 13, 2026" darkMode={darkMode} />
                <Field label="Time" value={patient.time}
                  onChange={patchPatient('time')} placeholder="14:30" darkMode={darkMode} />
              </div>

              {/* Practitioner full width */}
              <Field label="Practitioner / Clinician" value={patient.practitioner}
                onChange={patchPatient('practitioner')} placeholder="e.g. Dr. A. Smith (optional)" darkMode={darkMode} />

              {/* Privacy notice */}
              <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 mt-1"
                style={{ background: darkMode ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: darkMode ? '#86EFAC' : '#16A34A' }}>
                  <strong>Privacy guaranteed.</strong> Your audio file never leaves this device — it stays in local storage only. The PDF is generated entirely in your browser. Nothing is uploaded.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Format selection */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Select Format</p>
          <div className="flex flex-col gap-2">
            {formats.map(fmt => (
              <button key={fmt.id} onClick={() => setSelectedFormat(fmt.id)}
                className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex items-start gap-3 text-left w-full transition-all active:scale-[0.98]"
                style={{ outline: selectedFormat === fmt.id ? '2px solid #6C63FF' : '2px solid transparent' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: fmt.iconBg }}>{fmt.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{fmt.label}</p>
                    {fmt.badge && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white flex-shrink-0"
                        style={{ background: fmt.badgeColor }}>{fmt.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{fmt.desc}</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={{ borderColor: selectedFormat === fmt.id ? '#6C63FF' : '#D1D5DB', background: selectedFormat === fmt.id ? '#6C63FF' : 'transparent' }}>
                  {selectedFormat === fmt.id && (
                    <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Preview</p>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-800 dark:text-white text-sm">Voice Analysis Report</p>
                {patient.name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Patient: {patient.name}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{patient.date}</p>
              </div>
              <div className="text-right">
                {patient.refNr && (
                  <p className="text-xs font-mono font-semibold" style={{ color: '#6C63FF' }}>{patient.refNr}</p>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                  {analysis?.reliability || 'Pending'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {[
                { label: primaryMood, value: analysis?.confidence ?? 0, color: '#4F8AFF' },
                { label: 'Reliability', value: reliabilityScore, color: '#22C55E' },
                { label: 'Honesty', value: honestyScore, color: '#6C63FF' },
              ].map(bar => (
                <div key={bar.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0">{bar.label}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: '#F0F2F7' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${bar.value}%`, background: bar.color }}/>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8 text-right">{bar.value}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#2E2B5B]">
              <span className="text-xs text-gray-400">Audio: on-device only</span>
              <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>🔒 Privacy safe</span>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="flex flex-col items-center gap-2 mt-1">
          <button onClick={handleGenerate} disabled={loading || !analysis}
            className="relative w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-all overflow-hidden active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4F8AFF, #6C63FF)',
              boxShadow: analysis ? '0 6px 24px rgba(79,138,255,0.4)' : 'none',
              animation: analysis && !loading ? 'glow-breathe 2.5s ease-in-out infinite' : 'none',
            }}>
            {analysis && !loading && (
              <span className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.15) 50%, transparent 80%)', animation: 'shimmer-sweep 2.5s ease-in-out infinite' }}/>
            )}
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
                </svg>
                Generating…
              </span>
            ) : !analysis ? 'Run Analysis First' : 'Generate Report'}
          </button>
          <p className="text-xs text-gray-400">All processing happens on your device — no uploads</p>
        </div>
      </div>
    </div>
  )
}
