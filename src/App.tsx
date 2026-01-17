import { useCallback, useEffect, useMemo, useState } from "react"
import confetti from "canvas-confetti"
import { Button } from "./components/ui/button"

const WORD_BANK = [
  "ARC",
  "ASH",
  "BEE",
  "BIRD",
  "BLOSSOM",
  "BREEZE",
  "CAMP",
  "CANYON",
  "CLOUD",
  "COMPASS",
  "DUNE",
  "EMBER",
  "FABLE",
  "FERN",
  "FLINT",
  "FOREST",
  "GALE",
  "GARDEN",
  "GLOW",
  "HARBOR",
  "HARMONY",
  "HORIZON",
  "ICE",
  "ISLE",
  "JOURNEY",
  "LAGOON",
  "LANTERN",
  "MEADOW",
  "MOON",
  "MOUNTAIN",
  "NEBULA",
  "NOVA",
  "OAK",
  "OASIS",
  "ORBIT",
  "PINE",
  "POETRY",
  "RIDGE",
  "RIVER",
  "SEA",
  "SKY",
  "SOLAR",
  "STAR",
  "SUMMIT",
  "SUN",
  "TIDE",
  "TRAIL",
  "VALLEY",
  "VOYAGE",
  "WIND"
]

const NORMAL_SIZES = [10, 15, 20] as const
const LEVEL_SIZES = [3, 5, 7, 10, 12, 15, 20] as const
const LEVEL_TIME_LIMIT = 5 * 60

const WORD_COUNTS: Record<number, number> = {
  3: 2,
  5: 4,
  7: 6,
  10: 8,
  12: 10,
  15: 12,
  20: 18
}

const SMALL_WORDS = WORD_BANK.filter((word) => word.length <= 3)

const LEADERBOARD_KEY = "word-search-leaderboard"
const PLAYER_KEY = "word-search-player"

const randomId = () => Math.random().toString(36).slice(2)

type Position = { row: number; col: number }

type Puzzle = {
  grid: string[][]
  words: string[]
  size: number
}

type Mode = "normal" | "level"

type LeaderboardEntry = {
  id: string
  name: string
  level: number
  time: number
  completedAt: number
}

type Direction = { dr: number; dc: number }

const DIRECTIONS: Direction[] = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: -1, dc: -1 }
]

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const shuffle = <T,>(items: T[]) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const createEmptyGrid = (size: number) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => ""))

const buildPath = (start: Position, end: Position) => {
  const rowDiff = end.row - start.row
  const colDiff = end.col - start.col
  if (rowDiff === 0 && colDiff === 0) {
    return [start]
  }
  const stepRow = Math.sign(rowDiff)
  const stepCol = Math.sign(colDiff)
  if (stepRow !== 0 && stepCol !== 0 && Math.abs(rowDiff) !== Math.abs(colDiff)) {
    return null
  }
  if (stepRow === 0 && stepCol === 0) {
    return null
  }
  if (stepRow !== 0 && stepCol === 0) {
    return Array.from({ length: Math.abs(rowDiff) + 1 }, (_, index) => ({
      row: start.row + index * stepRow,
      col: start.col
    }))
  }
  if (stepRow === 0 && stepCol !== 0) {
    return Array.from({ length: Math.abs(colDiff) + 1 }, (_, index) => ({
      row: start.row,
      col: start.col + index * stepCol
    }))
  }
  return Array.from({ length: Math.abs(rowDiff) + 1 }, (_, index) => ({
    row: start.row + index * stepRow,
    col: start.col + index * stepCol
  }))
}

const placeWords = (size: number, words: string[]) => {
  const grid = createEmptyGrid(size)
  for (const word of words) {
    let placed = false
    const attempts = 200
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
      const rowMin = direction.dr === -1 ? word.length - 1 : 0
      const rowMax = direction.dr === 1 ? size - word.length : size - 1
      const colMin = direction.dc === -1 ? word.length - 1 : 0
      const colMax = direction.dc === 1 ? size - word.length : size - 1

      const startRow =
        rowMax < rowMin
          ? null
          : Math.floor(Math.random() * (rowMax - rowMin + 1)) + rowMin
      const startCol =
        colMax < colMin
          ? null
          : Math.floor(Math.random() * (colMax - colMin + 1)) + colMin

      if (startRow === null || startCol === null) {
        continue
      }

      const positions: Position[] = []
      let fits = true
      for (let i = 0; i < word.length; i += 1) {
        const row = startRow + i * direction.dr
        const col = startCol + i * direction.dc
        const existing = grid[row][col]
        if (existing !== "" && existing !== word[i]) {
          fits = false
          break
        }
        positions.push({ row, col })
      }

      if (!fits) {
        continue
      }

      positions.forEach((pos, index) => {
        grid[pos.row][pos.col] = word[index]
      })
      placed = true
      break
    }

    if (!placed) {
      return null
    }
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col] === "") {
        grid[row][col] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      }
    }
  }

  return grid
}

const createPuzzle = (size: number): Puzzle => {
  const totalWords = WORD_COUNTS[size] ?? Math.min(12, WORD_BANK.length)
  const source = size <= 3 ? SMALL_WORDS : WORD_BANK.filter((word) => word.length <= size)
  const words = shuffle(source).slice(0, totalWords)

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const grid = placeWords(size, words)
    if (grid) {
      return { grid, words, size }
    }
  }

  return {
    grid: createEmptyGrid(size).map((row) =>
      row.map(() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)])
    ),
    words,
    size
  }
}

const App = () => {
  const [mode, setMode] = useState<Mode>("normal")
  const [levelIndex, setLevelIndex] = useState(0)
  const [puzzle, setPuzzle] = useState<Puzzle>(() => createPuzzle(20))
  const [foundWords, setFoundWords] = useState<Record<string, Position[]>>({})
  const [startCell, setStartCell] = useState<Position | null>(null)
  const [activePath, setActivePath] = useState<Position[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [playerName, setPlayerName] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(PLAYER_KEY) ?? ""
  )
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    if (typeof window === "undefined") {
      return []
    }
    const raw = window.localStorage.getItem(LEADERBOARD_KEY)
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : []
  })
  const [timeLeft, setTimeLeft] = useState(LEVEL_TIME_LIMIT)
  const [levelStart, setLevelStart] = useState<number | null>(null)
  const [runStart, setRunStart] = useState<number | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [completionHandled, setCompletionHandled] = useState(false)
  const [lastRecordedLevel, setLastRecordedLevel] = useState<number | null>(null)
  const [normalCompleted, setNormalCompleted] = useState(false)

  const foundKeys = useMemo(() => {
    const keys = new Set<string>()
    Object.values(foundWords).forEach((positions) => {
      positions.forEach((position) => {
        keys.add(`${position.row}-${position.col}`)
      })
    })
    return keys
  }, [foundWords])

  const activeKeys = useMemo(() => {
    return new Set(activePath.map((position) => `${position.row}-${position.col}`))
  }, [activePath])

  const wordsRemaining = puzzle.words.filter((word) => !foundWords[word])
  const levelSize = LEVEL_SIZES[levelIndex] ?? LEVEL_SIZES[LEVEL_SIZES.length - 1]
  const isLevelComplete = mode === "level" && wordsRemaining.length === 0
  const isNormalComplete = mode === "normal" && wordsRemaining.length === 0
  const timeProgress = Math.max(0, timeLeft / LEVEL_TIME_LIMIT)
  const shouldBlockGrid = mode === "level" && (gameOver || isLevelComplete)
  const leaderboardNote = mode === "level" && !playerName.trim()

  const finalizeSelection = useCallback(() => {
    if (activePath.length < 2 || gameOver) {
      return
    }

    const selection = activePath
      .map((position) => puzzle.grid[position.row][position.col])
      .join("")
    const reversed = selection.split("").reverse().join("")

    const match = puzzle.words.find(
      (word) => !foundWords[word] && (word === selection || word === reversed)
    )

    if (match) {
      setFoundWords((previous) => ({
        ...previous,
        [match]: activePath
      }))
    }
  }, [activePath, foundWords, gameOver, puzzle.grid, puzzle.words])

  const handleLevelComplete = useCallback(() => {
    if (mode !== "level") {
      return
    }
    setShowConfetti(true)
  }, [mode])

  const handleNormalComplete = useCallback(() => {
    if (mode !== "normal") {
      return
    }
    setShowConfetti(true)
  }, [mode])

  const registerLeaderboardEntry = useCallback(
    (completedLevel: number, totalTime: number) => {
      if (!playerName.trim()) {
        return
      }
      setLeaderboard((previous) => {
        const next = [
          {
            id: randomId(),
            name: playerName.trim(),
            level: completedLevel,
            time: totalTime,
            completedAt: Date.now()
          },
          ...previous
        ]
        return next
          .sort((a, b) => {
            if (b.level !== a.level) {
              return b.level - a.level
            }
            return a.time - b.time
          })
          .slice(0, 10)
      })
    },
    [playerName]
  )

  useEffect(() => {
    const handlePointerUp = () => {
      if (!isDragging) {
        return
      }
      finalizeSelection()
      setIsDragging(false)
      setStartCell(null)
      setActivePath([])
    }

    window.addEventListener("pointerup", handlePointerUp)
    return () => window.removeEventListener("pointerup", handlePointerUp)
  }, [finalizeSelection, isDragging])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(PLAYER_KEY, playerName)
  }, [playerName])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard))
  }, [leaderboard])

  useEffect(() => {
    if (mode !== "level" || gameOver || isLevelComplete || levelStart === null) {
      return
    }
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval)
          setGameOver(true)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [gameOver, isLevelComplete, levelStart, mode])

  useEffect(() => {
    if (!isLevelComplete || mode !== "level" || gameOver || completionHandled) {
      return
    }
    setCompletionHandled(true)
    handleLevelComplete()

    if (runStart === null) {
      return
    }
    const totalElapsed = Math.max(0, Math.floor((Date.now() - runStart) / 1000))
    const completedLevel = levelIndex + 1

    if (lastRecordedLevel !== completedLevel) {
      setLastRecordedLevel(completedLevel)
      registerLeaderboardEntry(completedLevel, totalElapsed)
    }
  }, [
    completionHandled,
    gameOver,
    handleLevelComplete,
    isLevelComplete,
    lastRecordedLevel,
    levelIndex,
    mode,
    registerLeaderboardEntry,
    runStart
  ])

  useEffect(() => {
    if (!showConfetti) {
      return
    }
    const duration = 1600
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 70,
        origin: { x: 0 }
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 70,
        origin: { x: 1 }
      })
      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
    const timeout = window.setTimeout(() => setShowConfetti(false), duration)
    return () => window.clearTimeout(timeout)
  }, [showConfetti])

  useEffect(() => {
    if (mode !== "normal") {
      return
    }
    if (!isNormalComplete || normalCompleted) {
      return
    }
    setNormalCompleted(true)
    handleNormalComplete()
  }, [handleNormalComplete, isNormalComplete, mode, normalCompleted])

  const handlePointerDown = (row: number, col: number) => {
    if (shouldBlockGrid) {
      return
    }
    setStartCell({ row, col })
    setIsDragging(true)
    setActivePath([{ row, col }])
  }

  const handlePointerEnter = (row: number, col: number) => {
    if (!isDragging || !startCell || shouldBlockGrid) {
      return
    }
    const nextPath = buildPath(startCell, { row, col })
    if (!nextPath) {
      return
    }
    setActivePath(nextPath)
  }

  const handlePointerUp = () => {
    if (!isDragging) {
      return
    }
    finalizeSelection()
    setIsDragging(false)
    setStartCell(null)
    setActivePath([])
  }

  const handleNewPuzzle = (size = puzzle.size) => {
    setPuzzle(createPuzzle(size))
    setFoundWords({})
    setStartCell(null)
    setActivePath([])
    setIsDragging(false)
    setNormalCompleted(false)
  }

  const handleResetLevel = useCallback(
    (index = 0) => {
      const nextSize = LEVEL_SIZES[index] ?? LEVEL_SIZES[0]
      setLevelIndex(index)
      setPuzzle(createPuzzle(nextSize))
      setFoundWords({})
      setStartCell(null)
      setActivePath([])
      setIsDragging(false)
      setTimeLeft(LEVEL_TIME_LIMIT)
      setLevelStart(Date.now())
      setGameOver(false)
      setCompletionHandled(false)
      setLastRecordedLevel(null)
      setNormalCompleted(false)
      if (index === 0) {
        setRunStart(Date.now())
      }
    },
    [setLevelIndex]
  )

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode)
    setShowConfetti(false)
    if (nextMode === "level") {
      handleResetLevel(0)
    } else {
      setGameOver(false)
      setLevelStart(null)
      setTimeLeft(LEVEL_TIME_LIMIT)
      setNormalCompleted(false)
      handleNewPuzzle(20)
    }
  }

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60)
    const seconds = `${value % 60}`.padStart(2, "0")
    return `${minutes}:${seconds}`
  }

  const handleResetHighlights = () => {
    setFoundWords({})
    setStartCell(null)
    setActivePath([])
    setIsDragging(false)
    setNormalCompleted(false)
  }

  const handleAdvanceLevel = useCallback(() => {
    if (mode !== "level") {
      return
    }

    if (levelIndex >= LEVEL_SIZES.length - 1) {
      setGameOver(true)
      return
    }

    handleResetLevel(levelIndex + 1)
  }, [handleResetLevel, levelIndex, mode])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,238,228,0.9),_rgba(231,223,210,0.95)_45%,_rgba(215,205,190,0.98))] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_rgba(74,60,39,0.2)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {mode === "level" ? "Level Challenge" : "Classic Word Search"}
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
                  Wander & Find
                </h1>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Drag across the grid to highlight words. Found words stay glowing in
                  the puzzle and on the list.
                </p>
                {mode === "normal" && isNormalComplete && (
                  <p className="mt-2 text-sm font-semibold text-amber-700">
                    Puzzle complete! Great work.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/70 bg-white/60 p-1">
                  <Button
                    size="sm"
                    variant={mode === "normal" ? "default" : "ghost"}
                    onClick={() => handleModeChange("normal")}
                  >
                    Normal Mode
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "level" ? "default" : "ghost"}
                    onClick={() => handleModeChange("level")}
                  >
                    Level Mode
                  </Button>
                </div>
                {mode === "normal" ? (
                  <>
                    <Button onClick={() => handleNewPuzzle(20)}>New Puzzle</Button>
                    <div className="flex flex-wrap items-center gap-2">
                      {NORMAL_SIZES.map((size) => (
                        <Button
                          key={size}
                          size="sm"
                          variant={puzzle.size === size ? "default" : "ghost"}
                          onClick={() => handleNewPuzzle(size)}
                        >
                          {size}x{size}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Button onClick={() => handleResetLevel(levelIndex)}>Restart Level</Button>
                    <Button variant="ghost" onClick={() => handleResetLevel(0)}>
                      Restart Run
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={handleResetHighlights}>
                  Reset Highlights
                </Button>
              </div>
            </div>

            {mode === "level" && (
              <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Level {levelIndex + 1} · {levelSize}x{levelSize}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {gameOver
                        ? "Game Over"
                        : isLevelComplete
                          ? "Level Cleared"
                          : "Find all words before time runs out"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <span>{formatTime(timeLeft)}</span>
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-amber-400 transition-[width] duration-500"
                        style={{ width: `${timeProgress * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                {isLevelComplete && !gameOver && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button onClick={handleAdvanceLevel}>Next Level</Button>
                    <Button variant="ghost" onClick={() => handleResetLevel(levelIndex)}>
                      Replay Level
                    </Button>
                  </div>
                )}
                {gameOver && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button onClick={() => handleResetLevel(0)}>Start Again</Button>
                    <Button variant="ghost" onClick={() => handleModeChange("normal")}>
                      Back to Normal
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner">
              <div
                className="grid gap-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-700 sm:text-sm md:text-base"
                style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}
              >
                {puzzle.grid.map((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`
                    const isFound = foundKeys.has(key)
                    const isActive = activeKeys.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={shouldBlockGrid}
                        onPointerDown={() => handlePointerDown(rowIndex, colIndex)}
                        onPointerEnter={() => handlePointerEnter(rowIndex, colIndex)}
                        onPointerUp={handlePointerUp}
                        className={`flex aspect-square items-center justify-center rounded-md border text-[0.65rem] font-semibold transition sm:text-sm md:text-base ${
                          isFound
                            ? "border-amber-300 bg-amber-200/80 text-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                            : isActive
                              ? "border-slate-400 bg-slate-200 text-slate-900"
                              : "border-white/70 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {letter}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full max-w-md shrink-0">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_rgba(74,60,39,0.2)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {mode === "level" ? "Level Stats" : "Words to Find"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {Object.keys(foundWords).length > 0
                    ? `${Object.keys(foundWords).length} found`
                    : "Search List"}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {wordsRemaining.length} left
                </span>
                {mode === "normal" && isNormalComplete && (
                  <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-slate-900">
                    Puzzle complete!
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {mode === "level" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Player Name
                  </label>
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-slate-400"
                  />
                  {leaderboardNote && (
                    <p className="text-xs text-slate-500">
                      Add your name to save scores.
                    </p>
                  )}
                </div>
              )}

              <ul className="grid grid-cols-2 gap-3 text-sm uppercase tracking-wide text-slate-700">
                {puzzle.words.map((word) => {
                  const isFound = Boolean(foundWords[word])
                  return (
                    <li
                      key={word}
                      className={`rounded-xl border px-3 py-2 text-center font-semibold transition ${
                        isFound
                          ? "border-amber-300 bg-amber-100/80 text-slate-900 line-through"
                          : "border-white/70 bg-white"
                      }`}
                    >
                      {word}
                    </li>
                  )
                })}
              </ul>

              {mode === "level" && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Leaderboard
                    </p>
                    <span className="text-xs font-semibold text-slate-600">
                      Top 10
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {leaderboard.length === 0 ? (
                      <p className="text-sm text-slate-500">No runs yet.</p>
                    ) : (
                      leaderboard.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          <span>
                            {index + 1}. {entry.name}
                          </span>
                          <span>Lv {entry.level} · {formatTime(entry.time)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
