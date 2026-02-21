import { useEffect, useMemo, useState } from 'react'

const QUIZ_COUNT = 10
const POINTS_PER_QUESTION = 5

const hypeMessages = [
  'Brain power activated ⚡',
  'You got this, quiz wizard 🧙',
  'Tiny facts, big flex 💪',
  'Science + guessing = glory 🏆',
  'Middle-school genius mode: ON 🚀'
]

const winMessages = [
  'Correct! Your brain just did a backflip 🤸',
  'Nailed it! That answer had no chance 😎',
  'Boom! Accuracy level: laser beam 🔥',
  'Yup! You just unlocked nerd points 🧠✨'
]

const missMessages = [
  'Nope! But hey, even legends miss sometimes 🫡',
  'Close-ish! Your next answer is gonna cook 🍳',
  'Oops! Plot twist. Try the next one 🎬',
  'Not this time! Your comeback arc starts now 📈'
]

const shortAnswerMessages = [
  'Precision mode engaged 🎯',
  'Nice estimate! Your measuring brain is leveling up 📏',
  'Good try—close numbers still build skill 💡'
]

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function pickWeighted(list, getWeight) {
  const weighted = list
    .map((item) => ({ item, weight: Math.max(0, getWeight(item) || 0) }))
    .filter((entry) => entry.weight > 0)

  if (!weighted.length) return null

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let threshold = Math.random() * total

  for (const entry of weighted) {
    threshold -= entry.weight
    if (threshold <= 0) return entry.item
  }

  return weighted[weighted.length - 1].item
}

function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function roundMetric(value) {
  if (value >= 100) return Math.round(value)
  if (value >= 10) return Math.round(value * 10) / 10
  return Math.round(value * 100) / 100
}

function formatMetricValue(value, unit) {
  return `${roundMetric(value)} ${unit}`
}

function formatMass(mass) {
  if (!mass) return 'unknown'
  if (mass.value !== undefined) return `${mass.value} g`
  if (mass.min !== undefined && mass.max !== undefined) return `${mass.min}–${mass.max} g`
  if (mass.max !== undefined) return `up to ${mass.max} g`
  return 'unknown'
}

function formatDimensions(dim) {
  if (!dim) return 'unknown'
  switch (dim.kind) {
    case 'rectangle':
      return `${dim.width} × ${dim.height} mm`
    case 'cuboid':
      return `${dim.length} × ${dim.width} × ${dim.height} mm`
    case 'cube':
      return `${dim.edge} mm cube`
    case 'cylinder':
      return `${dim.length} mm long, ${dim.diameter} mm diameter`
    case 'disc':
      return dim.thickness !== undefined
        ? `${dim.diameter} mm diameter, ${dim.thickness} mm thick`
        : `${dim.diameter} mm diameter`
    case 'sphere':
      if (dim.diameter !== undefined) return `${dim.diameter} mm diameter`
      if (dim.diameter_min !== undefined && dim.diameter_max !== undefined) {
        return `${dim.diameter_min}–${dim.diameter_max} mm diameter`
      }
      if (dim.diameter_min !== undefined) return `at least ${dim.diameter_min} mm diameter`
      return 'sphere'
    case 'length':
      return `${dim.length} mm long`
    case 'height':
      return `${dim.height} mm tall`
    case 'width':
      return `${dim.width} mm wide`
    default:
      return 'unknown'
  }
}

function extractMassTarget(item) {
  const mass = item.mass_g
  if (!mass) return null
  if (mass.value !== undefined) return { metric: 'mass', label: 'mass', unit: 'g', value: mass.value }
  if (mass.min !== undefined && mass.max !== undefined) {
    return { metric: 'mass', label: 'mass', unit: 'g', value: (mass.min + mass.max) / 2 }
  }
  if (mass.max !== undefined) return { metric: 'mass', label: 'mass', unit: 'g', value: mass.max }
  if (mass.min !== undefined) return { metric: 'mass', label: 'mass', unit: 'g', value: mass.min }
  return null
}

function extractDimensionTarget(item) {
  const dim = item.dimensions_mm
  if (!dim) return null
  switch (dim.kind) {
    case 'rectangle': {
      const axis = randomPick(['width', 'height'])
      return axis === 'width'
        ? { metric: 'dimension', label: 'width', unit: 'mm', value: dim.width }
        : { metric: 'dimension', label: 'height', unit: 'mm', value: dim.height }
    }
    case 'cuboid': {
      const axes = item.item_key === 'smartphone_slab'
        ? ['length', 'width']
        : ['length', 'width', 'height']
      const axis = randomPick(axes)
      return { metric: 'dimension', label: axis, unit: 'mm', value: dim[axis] }
    }
    case 'cube':
      return { metric: 'dimension', label: 'edge length', unit: 'mm', value: dim.edge }
    case 'cylinder': {
      const axis = randomPick(['length', 'diameter'])
      return { metric: 'dimension', label: axis, unit: 'mm', value: dim[axis] }
    }
    case 'disc':
      if (dim.thickness !== undefined && Math.random() > 0.5) {
        return { metric: 'dimension', label: 'thickness', unit: 'mm', value: dim.thickness }
      }
      return { metric: 'dimension', label: 'diameter', unit: 'mm', value: dim.diameter }
    case 'sphere':
      if (dim.diameter !== undefined) {
        return { metric: 'dimension', label: 'diameter', unit: 'mm', value: dim.diameter }
      }
      if (dim.diameter_min !== undefined && dim.diameter_max !== undefined) {
        return {
          metric: 'dimension',
          label: 'diameter',
          unit: 'mm',
          value: (dim.diameter_min + dim.diameter_max) / 2
        }
      }
      if (dim.diameter_min !== undefined) {
        return { metric: 'dimension', label: 'diameter', unit: 'mm', value: dim.diameter_min }
      }
      return null
    case 'length':
      return { metric: 'dimension', label: 'length', unit: 'mm', value: dim.length }
    case 'height':
      return { metric: 'dimension', label: 'height', unit: 'mm', value: dim.height }
    case 'width':
      return { metric: 'dimension', label: 'width', unit: 'mm', value: dim.width }
    default:
      return null
  }
}

function extractDerivedTarget(item) {
  const derived = item.derived_metrics
  if (!derived) return null

  const candidates = []
  if (Number.isFinite(derived.volume_ml)) {
    candidates.push({ metric: 'derived', label: 'volume', unit: 'mL', value: derived.volume_ml })
  }
  if (Number.isFinite(derived.surface_area_cm2)) {
    candidates.push({ metric: 'derived', label: 'surface area', unit: 'cm²', value: derived.surface_area_cm2 })
  }
  if (Number.isFinite(derived.surface_area_m2)) {
    candidates.push({ metric: 'derived', label: 'surface area', unit: 'm²', value: derived.surface_area_m2 })
  }
  if (Number.isFinite(derived.diagonal_cm)) {
    candidates.push({ metric: 'derived', label: 'diagonal', unit: 'cm', value: derived.diagonal_cm })
  }
  if (Number.isFinite(derived.density_g_per_cm3)) {
    candidates.push({ metric: 'derived', label: 'density', unit: 'g/cm³', value: derived.density_g_per_cm3 })
  }
  if (Number.isFinite(derived.angle_deg)) {
    candidates.push({ metric: 'derived', label: 'angle', unit: '°', value: derived.angle_deg })
  }

  if (!candidates.length) return null
  return randomPick(candidates)
}

function buildMetricChoices(targetValue, unit) {
  const multipliers = shuffle([0.65, 0.8, 0.9, 1.1, 1.25, 1.4]).slice(0, 3)
  const wrongValues = multipliers.map((multiplier) => roundMetric(targetValue * multiplier))
  const uniqueWrongValues = [...new Set(wrongValues)].filter((value) => value !== roundMetric(targetValue)).slice(0, 3)

  let adjustedWrongValues = uniqueWrongValues
  if (adjustedWrongValues.length < 3) {
    adjustedWrongValues = [
      roundMetric(targetValue * 0.72),
      roundMetric(targetValue * 1.18),
      roundMetric(targetValue * 1.33)
    ]
      .filter((value) => value !== roundMetric(targetValue))
      .slice(0, 3)
  }

  const options = [
    { id: 'correct', value: roundMetric(targetValue), label: formatMetricValue(targetValue, unit), isCorrect: true },
    ...adjustedWrongValues.map((value, idx) => ({
      id: `wrong-${idx + 1}`,
      value,
      label: formatMetricValue(value, unit),
      isCorrect: false
    }))
  ]

  return shuffle(options)
}

function buildQuestion(item) {
  const targets = [
    extractMassTarget(item),
    extractDimensionTarget(item),
    extractDerivedTarget(item)
  ].filter(Boolean)

  if (!targets.length) return null

  const hasDensityMetric = Number.isFinite(item?.derived_metrics?.density_g_per_cm3)
  const target = hasDensityMetric
    ? pickWeighted(targets, (candidate) => (candidate.label === 'density' ? 6 : 1))
    : randomPick(targets)

  if (!target) return null

  const answerMode = Math.random() > 0.5 ? 'multiple_choice' : 'short_answer'
  return {
    item,
    answerMode,
    target,
    prompt: `What is the ${target.label} of ${item.display_name}?`,
    choices: answerMode === 'multiple_choice' ? buildMetricChoices(target.value, target.unit) : []
  }
}

function calculateShortAnswerPoints(answer, expected) {
  if (!Number.isFinite(answer) || expected <= 0) {
    return { points: 0, errorPct: null }
  }
  const errorPct = (Math.abs(answer - expected) / expected) * 100
  if (errorPct <= 10) return { points: 5, errorPct }
  if (errorPct <= 20) return { points: 3, errorPct }
  if (errorPct <= 30) return { points: 1, errorPct }
  return { points: 0, errorPct }
}

export default function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null)
  const [shortInput, setShortInput] = useState('')
  const [answerResult, setAnswerResult] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/items_reference.json')
        if (!res.ok) throw new Error('Could not load item data')
        const data = await res.json()
        if (!Array.isArray(data) || data.length < 4) {
          throw new Error('Need at least 4 items in items_reference.json')
        }
        setItems(data)
      } catch (e) {
        setError(e.message || 'Data load failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const current = questions[index] ?? null
  const maxScore = questions.length * POINTS_PER_QUESTION

  const summaryTitle = useMemo(() => {
    const pct = maxScore ? Math.round((score / maxScore) * 100) : 0
    if (pct >= 90) return 'Legend Status Unlocked 🏆'
    if (pct >= 70) return 'Certified Smart Cookie 🍪'
    if (pct >= 50) return 'Solid Brain Moves 🧠'
    return 'Training Arc Continues 🌱'
  }, [score, maxScore])

  function startGame() {
    const picked = shuffle(items).slice(0, Math.min(QUIZ_COUNT, items.length))
    const quiz = picked.map(buildQuestion).filter(Boolean)
    setQuestions(quiz)
    setIndex(0)
    setScore(0)
    setSelectedKey(null)
    setShortInput('')
    setAnswerResult(null)
    setHistory([])
    setStarted(true)
  }

  function choose(option) {
    if (!current || current.answerMode !== 'multiple_choice' || answerResult) return

    const points = option.isCorrect ? POINTS_PER_QUESTION : 0
    const result = {
      mode: 'multiple_choice',
      points,
      maxPoints: POINTS_PER_QUESTION,
      isCorrect: option.isCorrect,
      pickedLabel: option.label,
      correctLabel: formatMetricValue(current.target.value, current.target.unit)
    }

    setSelectedKey(option.id)
    setAnswerResult(result)
    setScore((v) => v + points)
    setHistory((prev) => [
      ...prev,
      {
        q: index + 1,
        prompt: current.prompt,
        result
      }
    ])
  }

  function submitShortAnswer() {
    if (!current || current.answerMode !== 'short_answer' || answerResult) return
    const answer = Number.parseFloat(shortInput)
    const scoring = calculateShortAnswerPoints(answer, current.target.value)
    const result = {
      mode: 'short_answer',
      points: scoring.points,
      maxPoints: POINTS_PER_QUESTION,
      answer,
      expected: current.target.value,
      unit: current.target.unit,
      errorPct: scoring.errorPct
    }

    setAnswerResult(result)
    setScore((v) => v + scoring.points)
    setHistory((prev) => [
      ...prev,
      {
        q: index + 1,
        prompt: current.prompt,
        result
      }
    ])
  }

  function next() {
    if (!current) return
    if (index + 1 >= questions.length) {
      setStarted(false)
      return
    }
    setIndex((v) => v + 1)
    setSelectedKey(null)
    setShortInput('')
    setAnswerResult(null)
  }

  const gameOver = !started && history.length > 0 && questions.length > 0

  return (
    <div className="app-shell">
      <div className="bg-blob blob1" />
      <div className="bg-blob blob2" />
      <main className="card">
        <h1>MetricMastery Quiz Blast 🎉</h1>
        <p className="subtitle">Estimate item mass, size, volume, or surface area. Mixed question modes. 10 rounds, up to 5 points each.</p>

        {loading && <p>Loading quiz fuel...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && !started && !gameOver && (
          <section className="panel">
            <h2>Ready to play?</h2>
            <p>{randomPick(hypeMessages)}</p>
            <button className="btn" onClick={startGame}>Start 10-Question Quiz</button>
          </section>
        )}

        {started && current && (
          <section className="panel">
            <div className="status-row">
              <span>Question {index + 1} / {questions.length}</span>
              <span>Score: {score} / {maxScore}</span>
            </div>

            <div className="clue-box">
              <p className="question-text"><strong>{current.prompt}</strong></p>
              <p><strong>Item:</strong> {current.item.display_name}</p>
              {current.item.image_url && (
                <div className="question-image-wrap">
                  <img
                    className="question-image"
                    src={current.item.image_url}
                    alt={current.item.display_name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {current.answerMode === 'multiple_choice' && (
              <div className="choices">
                {current.choices.map((opt) => {
                  const isSelected = selectedKey === opt.id
                  let className = 'choice'
                  if (answerResult) {
                    if (opt.isCorrect) className += ' correct'
                    else if (isSelected) className += ' wrong'
                  }

                  return (
                    <button
                      key={opt.id}
                      className={className}
                      onClick={() => choose(opt)}
                      disabled={!!answerResult}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            {current.answerMode === 'short_answer' && (
              <div className="short-answer-box">
                <div className="short-input-wrap">
                  <input
                    className="short-input"
                    type="number"
                    step="any"
                    placeholder={`Enter value in ${current.target.unit}`}
                    value={shortInput}
                    onChange={(e) => setShortInput(e.target.value)}
                    disabled={!!answerResult}
                  />
                  <button
                    className="btn"
                    onClick={submitShortAnswer}
                    disabled={!!answerResult || shortInput.trim() === ''}
                  >
                    Submit Answer
                  </button>
                </div>
                <p className="hint">Scoring: within 10% = 5 pts, 20% = 3 pts, 30% = 1 pt.</p>
              </div>
            )}

            <div className="feedback-row">
              {!answerResult && <p>Choose wisely, Professor Chaos 😄</p>}
              {answerResult && answerResult.mode === 'multiple_choice' && (
                <p>
                  {answerResult.isCorrect ? randomPick(winMessages) : randomPick(missMessages)}
                </p>
              )}
              {answerResult && answerResult.mode === 'short_answer' && (
                <p>
                  {randomPick(shortAnswerMessages)} You earned {answerResult.points} / {answerResult.maxPoints} points
                  {answerResult.errorPct !== null ? ` (error: ${roundMetric(answerResult.errorPct)}%)` : ''}. Correct value:
                  {' '}
                  {formatMetricValue(answerResult.expected, answerResult.unit)}.
                </p>
              )}
            </div>

            <button className="btn" onClick={next} disabled={!answerResult}>
              {index + 1 === questions.length ? 'See Results' : 'Next Question'}
            </button>
          </section>
        )}

        {gameOver && (
          <section className="panel">
            <h2>{summaryTitle}</h2>
            <p className="big-score">You scored <strong>{score}</strong> / {maxScore}</p>

            <div className="result-list">
              {history.map((row) => (
                <div
                  key={row.q}
                  className={`result-item ${row.result.points === POINTS_PER_QUESTION ? 'ok' : 'nope'}`}
                >
                  <span>Q{row.q}</span>
                  <span>{row.prompt}</span>
                  <span>Points: {row.result.points} / {row.result.maxPoints}</span>
                  {row.result.mode === 'multiple_choice' && (
                    <>
                      <span>Picked: {row.result.pickedLabel}</span>
                      <span>Correct: {row.result.correctLabel}</span>
                    </>
                  )}
                  {row.result.mode === 'short_answer' && (
                    <>
                      <span>Your answer: {Number.isFinite(row.result.answer) ? formatMetricValue(row.result.answer, row.result.unit) : 'invalid input'}</span>
                      <span>Target: {formatMetricValue(row.result.expected, row.result.unit)}</span>
                      <span>Error: {row.result.errorPct !== null ? `${roundMetric(row.result.errorPct)}%` : 'n/a'}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button className="btn" onClick={startGame}>Play Again</button>
          </section>
        )}
      </main>
    </div>
  )
}
