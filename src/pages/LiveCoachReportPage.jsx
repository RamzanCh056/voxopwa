import { useLocation, useNavigate } from 'react-router-dom'

function ScoreRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#22C55E' : score >= 45 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#F0F2F7" strokeWidth="9" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-bold text-gray-800 dark:text-white">{score}</span>
        <span className="text-[10px] text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

export default function LiveCoachReportPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const report    = state?.report   || {}
  const transcript = state?.transcript || ''
  const tips      = state?.tips     || []
  const category  = state?.category || 'General'
  const date      = state?.date     || new Date().toISOString()

  const score = report.score || 0
  const scoreColor = score >= 70 ? '#22C55E' : score >= 45 ? '#F59E0B' : '#EF4444'
  const scoreLabel = score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low'

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // ─── PDF Export ────────────────────────────────────────────────────────────
  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const W = 595.28, margin = 40, cW = W - margin * 2
    let y = 0
    const PURPLE = [30,27,75], ACCENT = [108,99,255], GREEN = [34,197,94]
    const ORANGE = [249,115,22], GRAY = [107,114,128], LIGHT = [240,242,247]
    const WHITE = [255,255,255], DARK = [17,24,39]
    const sf = (...rgb) => doc.setFillColor(...rgb)
    const st = (...rgb) => doc.setTextColor(...rgb)
    const cardRect = (x, cy, w, h) => {
      sf(...WHITE); doc.setDrawColor(229,231,235); doc.setLineWidth(0.5)
      doc.roundedRect(x, cy, w, h, 5, 5, 'FD')
    }
    const sectionLabel = (text) => {
      st(...GRAY); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
      doc.text(text.toUpperCase(), margin, y); y += 14
    }

    // Header
    sf(...PURPLE); doc.rect(0, 0, W, 78, 'F')
    st(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(20)
    doc.text('VOXOFIED AI', margin, 32)
    doc.setFont('helvetica','normal'); doc.setFontSize(9)
    doc.text('Live Coach Session Report', margin, 48)
    doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(category, margin, 64)
    st(148,136,255); doc.setFont('helvetica','normal'); doc.setFontSize(7)
    doc.text(formattedDate, W - margin, 64, { align: 'right' })
    y = 96

    // Mood + Score
    sectionLabel('Session Overview')
    const half = (cW - 10) / 2
    cardRect(margin, y, half, 68)
    st(...GRAY); doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
    doc.text('Overall Mood', margin + 10, y + 16)
    st(...DARK); doc.setFont('helvetica','bold'); doc.setFontSize(14)
    doc.text(`${report.overallMoodEmoji || ''} ${report.overallMood || 'Neutral'}`, margin + 10, y + 38)
    st(...ACCENT); doc.setFont('helvetica','normal'); doc.setFontSize(8)
    doc.text(category, margin + 10, y + 55)
    const c2x = margin + half + 10
    cardRect(c2x, y, half, 68)
    st(...GRAY); doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
    doc.text('Effectiveness', c2x + 10, y + 16)
    st(...DARK); doc.setFont('helvetica','bold'); doc.setFontSize(20)
    doc.text(`${score}`, c2x + 10, y + 40)
    st(...GRAY); doc.setFontSize(10)
    doc.text('/ 100', c2x + 20 + doc.getTextWidth(`${score}`), y + 40)
    st(score >= 70 ? GREEN[0] : ORANGE[0], score >= 70 ? GREEN[1] : ORANGE[1], score >= 70 ? GREEN[2] : ORANGE[2])
    doc.setFont('helvetica','normal'); doc.setFontSize(8)
    doc.text(scoreLabel, c2x + 10, y + 55)
    y += 80

    // Summary
    if (report.summary) {
      sectionLabel('Summary')
      cardRect(margin, y, cW, 52)
      st(...DARK); doc.setFont('helvetica','normal'); doc.setFontSize(9)
      const lines = doc.splitTextToSize(report.summary, cW - 20)
      doc.text(lines, margin + 10, y + 16)
      y += Math.max(lines.length * 12 + 24, 60)
    }

    // Key phrase
    if (report.keyPhrase) {
      if (y > 700) { doc.addPage(); y = 40 }
      sectionLabel('Key Phrase')
      sf(237,233,254); doc.roundedRect(margin, y, cW, 36, 5, 5, 'F')
      st(...ACCENT); doc.setFont('helvetica','italic'); doc.setFontSize(9)
      const lines = doc.splitTextToSize(`"${report.keyPhrase}"`, cW - 20)
      doc.text(lines, margin + 10, y + 14)
      y += 52
    }

    // What went well
    if ((report.strengths || []).length > 0) {
      if (y > 700) { doc.addPage(); y = 40 }
      sectionLabel('What Went Well')
      report.strengths.forEach(s => {
        if (y > 755) { doc.addPage(); y = 40 }
        sf(...GREEN); doc.circle(margin + 4, y - 3, 2.5, 'F')
        st(...DARK); doc.setFont('helvetica','normal'); doc.setFontSize(9)
        const lines = doc.splitTextToSize(s, cW - 14)
        doc.text(lines, margin + 12, y); y += lines.length * 12 + 6
      })
      y += 6
    }

    // To improve
    if ((report.improvements || []).length > 0) {
      if (y > 700) { doc.addPage(); y = 40 }
      sectionLabel('Areas To Improve')
      report.improvements.forEach(imp => {
        if (y > 755) { doc.addPage(); y = 40 }
        sf(...ORANGE); doc.circle(margin + 4, y - 3, 2.5, 'F')
        st(...DARK); doc.setFont('helvetica','normal'); doc.setFontSize(9)
        const lines = doc.splitTextToSize(imp, cW - 14)
        doc.text(lines, margin + 12, y); y += lines.length * 12 + 6
      })
      y += 6
    }

    // Coaching tips received
    if (tips.length > 0) {
      if (y > 680) { doc.addPage(); y = 40 }
      sectionLabel('Coaching Tips Received')
      tips.forEach((tip, i) => {
        if (y > 755) { doc.addPage(); y = 40 }
        st(...ACCENT); doc.setFont('helvetica','bold'); doc.setFontSize(8)
        doc.text(`${tip.emoji || ''} ${tip.mood || ''}`, margin, y)
        st(...DARK); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        const lines = doc.splitTextToSize(tip.feedback || '', cW - 14)
        doc.text(lines, margin + 12, y + 10)
        if (tip.snippet) {
          st(...GRAY); doc.setFont('helvetica','italic'); doc.setFontSize(7.5)
          const sl = doc.splitTextToSize(`"${tip.snippet.slice(0,80)}${tip.snippet.length > 80 ? '…' : ''}"`, cW - 14)
          doc.text(sl, margin + 12, y + 10 + lines.length * 11)
          y += lines.length * 11 + sl.length * 10 + 18
        } else {
          y += lines.length * 11 + 16
        }
      })
      y += 4
    }

    // Transcript
    if (transcript.trim()) {
      if (y > 680) { doc.addPage(); y = 40 }
      sectionLabel('Full Transcript')
      cardRect(margin, y, cW, 24)
      st(...GRAY); doc.setFont('helvetica','normal'); doc.setFontSize(7.5)
      doc.text('Speech captured during session', margin + 10, y + 14)
      y += 32
      st(...DARK); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
      const tLines = doc.splitTextToSize(transcript, cW)
      tLines.forEach(line => {
        if (y > 755) { doc.addPage(); y = 40 }
        doc.text(line, margin, y); y += 12
      })
    }

    // Footer
    const total = doc.internal.getNumberOfPages()
    for (let pg = 1; pg <= total; pg++) {
      doc.setPage(pg); sf(...PURPLE); doc.rect(0, 818, W, 24, 'F')
      st(148,136,255); doc.setFont('helvetica','normal'); doc.setFontSize(7)
      doc.text('Generated by Voxofied AI  •  Live Coach Session Report', margin, 832)
      doc.text(`Page ${pg} of ${total}`, W - margin, 832, { align: 'right' })
    }
    doc.save(`live-coach-session-${Date.now()}.pdf`)
  }

  // ─── CSV Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Field', 'Value'],
      ['Date', formattedDate],
      ['Category', category],
      ['Overall Mood', report.overallMood || ''],
      ['Effectiveness Score', score],
      ['Summary', report.summary || ''],
      ['Key Phrase', report.keyPhrase || ''],
      ['Strengths', (report.strengths || []).join('; ')],
      ['Improvements', (report.improvements || []).join('; ')],
      ['Coaching Tips', tips.map(t => `[${t.mood}] ${t.feedback}`).join('; ')],
      ['Transcript', transcript],
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `live-coach-session-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">

      {/* Mobile header */}
      <div className="px-5 pt-12 pb-5 md:hidden"
        style={{ background: '#1E1B4B', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/checkin')}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Session Report</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{category}</p>
            </div>
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
          <button onClick={() => navigate('/checkin')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2B5B] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Session Report</h1>
            <p className="text-xs text-gray-400">{category} · {formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-[#2E2B5B] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2E2B5B] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Export PDF
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#6C63FF' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8 md:px-8 flex flex-col gap-4 md:max-w-4xl md:w-full md:mx-auto">

        {/* Session info bar */}
        <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6C63FF,#4F8AFF)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Live Coach Session</p>
            <p className="text-xs text-gray-400 mt-0.5">{category} · {formattedDate}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
            Completed
          </span>
        </div>

        {/* Overall Judgement */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Overall Judgement
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">Overall mood</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{report.overallMoodEmoji || '😐'}</span>
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{report.overallMood || 'Neutral'}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#6C63FF' }}>{category}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">Effectiveness</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: scoreColor + '22' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: scoreColor }} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{scoreLabel}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: scoreColor }}>{score} / 100</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score ring + summary */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Communication Effectiveness
          </p>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={score} />
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-xs text-gray-400">Effectiveness Score</p>
                  <p className="font-bold text-gray-800 dark:text-white text-base">{score} / 100</p>
                </div>
                <span className="self-start text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: scoreColor + '18', color: scoreColor }}>
                  {scoreLabel} effectiveness
                </span>
              </div>
            </div>
            {report.summary && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-[#2E2B5B] pt-3">
                {report.summary}
              </p>
            )}
          </div>
        </div>

        {/* Key phrase */}
        {report.keyPhrase && (
          <div className="rounded-2xl px-4 py-3.5"
            style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)' }}>
            <p className="text-xs font-semibold mb-1.5" style={{ color: '#6C63FF' }}>Key phrase</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 italic leading-relaxed">
              "{report.keyPhrase}"
            </p>
          </div>
        )}

        {/* AI Suggestions */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            AI Suggestions
          </p>
          <div className="rounded-2xl p-4 shadow-sm flex flex-col gap-4 bg-gradient-to-br from-[#F5F3FF] to-[#EEF2FF] dark:from-[#1E1B4B] dark:to-[#1A1740]">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-bold text-gray-800 dark:text-white text-base">AI Suggestions</span>
            </div>

            {/* What went well */}
            {(report.strengths || []).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>👍</span>
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">What you did well</span>
                </div>
                {report.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{s}</p>
                  </div>
                ))}
              </div>
            )}

            {/* What to improve */}
            {(report.improvements || []).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>📈</span>
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">What to improve</span>
                </div>
                {report.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{imp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coaching tips received */}
        {tips.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
              Coaching Tips Received
            </p>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
              {tips.map((tip, i) => (
                <div key={i}
                  className="px-4 py-3.5"
                  style={{ borderBottom: i < tips.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{tip.emoji}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{tip.mood}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{tip.feedback}</p>
                  {tip.snippet && (
                    <p className="text-xs text-gray-400 mt-1.5 italic">
                      "{tip.snippet.slice(0, 100)}{tip.snippet.length > 100 ? '…' : ''}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Transcript */}
        {transcript.trim() && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
              Full Transcript
            </p>
            <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {transcript}
              </p>
            </div>
          </div>
        )}

        {/* Export section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Export
          </p>
          <div className="bg-white dark:bg-[#1E1B4B] rounded-2xl shadow-sm overflow-hidden">
            <button onClick={exportPDF}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2E2B5B] transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white text-left">Export as PDF</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
            <div className="h-px mx-4 bg-gray-100 dark:bg-[#2E2B5B]" />
            <button onClick={exportCSV}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-[#2E2B5B] transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white text-left">Export as CSV</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"
                strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* New session button */}
        <button onClick={() => navigate('/checkin')}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg,#6C63FF,#4F8AFF)', boxShadow: '0 6px 24px rgba(108,99,255,0.35)' }}>
          Start New Session
        </button>

      </div>
    </div>
  )
}
