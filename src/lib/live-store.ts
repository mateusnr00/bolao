'use client'

import { useEffect, useReducer } from 'react'

// Store singleton de placar ao vivo: enquanto houver ao menos um componente
// inscrito, faz polling em /api/live a cada 30s e "tica" o minuto a cada 10s.
// Vários cards compartilham o mesmo poll (dedupe automático). O minuto é
// recalculado aqui no store (fora do render) pra manter os componentes puros.

export interface LiveEntry {
  homeCode: string
  awayCode: string
  homeGoals: number
  awayGoals: number
  minute: number | null
  label: string | null
  homeScorers: string | null
  awayScorers: string | null
}

interface Stored extends LiveEntry {
  baseMinute: number | null
  fetchedAt: number
}

const POLL_MS = 15_000
const TICK_MS = 10_000

let byPair = new Map<string, Stored>()
const subscribers = new Set<() => void>()
let pollTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null
let refCount = 0

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function emit() {
  for (const cb of subscribers) cb()
}

// recalcula o minuto correndo (base + minutos desde o último fetch)
function recomputeMinutes() {
  const now = Date.now()
  for (const entry of byPair.values()) {
    entry.minute =
      entry.baseMinute != null
        ? entry.baseMinute + Math.floor((now - entry.fetchedAt) / 60_000)
        : null
  }
}

async function poll() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return
  }
  try {
    const res = await fetch('/api/live', { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { games?: LiveEntry[] }
    const next = new Map<string, Stored>()
    const now = Date.now()
    for (const g of data.games ?? []) {
      next.set(pairKey(g.homeCode, g.awayCode), {
        ...g,
        baseMinute: g.minute,
        fetchedAt: now,
      })
    }
    byPair = next
    emit()
  } catch {
    // silencioso: mantém o último estado conhecido
  }
}

function tick() {
  recomputeMinutes()
  emit()
}

function start() {
  refCount += 1
  if (refCount === 1) {
    void poll()
    pollTimer = setInterval(() => void poll(), POLL_MS)
    tickTimer = setInterval(tick, TICK_MS)
  }
}

function stop() {
  refCount = Math.max(0, refCount - 1)
  if (refCount === 0) {
    if (pollTimer) clearInterval(pollTimer)
    if (tickTimer) clearInterval(tickTimer)
    pollTimer = tickTimer = null
  }
}

/** Dados ao vivo (do front) pro par de seleções, ou null se não está rolando. */
export function useLivePair(homeCode: string, awayCode: string): LiveEntry | null {
  const [, force] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    start()
    subscribers.add(force)
    return () => {
      subscribers.delete(force)
      stop()
    }
  }, [])

  const entry = byPair.get(pairKey(homeCode, awayCode))
  if (!entry) return null

  return {
    homeCode: entry.homeCode,
    awayCode: entry.awayCode,
    homeGoals: entry.homeGoals,
    awayGoals: entry.awayGoals,
    minute: entry.minute,
    label: entry.label,
    homeScorers: entry.homeScorers,
    awayScorers: entry.awayScorers,
  }
}
