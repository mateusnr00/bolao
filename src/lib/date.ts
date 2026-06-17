import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export const TZ = 'America/Sao_Paulo'

// Chave de dia (yyyy-MM-dd) no fuso de Brasília — usada pra agrupar jogos.
export function dayKey(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd')
}

// "13:00"
export function timeLabel(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm')
}

// "ter · 16 jun" — ou "hoje/ontem/amanhã · 14 jun" relativo a `now`.
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const dayMonth = formatInTimeZone(date, TZ, 'dd MMM', { locale: ptBR })
  const diff = daysFromToday(iso, now)
  if (diff === 0) return `hoje · ${dayMonth}`
  if (diff === -1) return `ontem · ${dayMonth}`
  if (diff === 1) return `amanhã · ${dayMonth}`
  const weekday = formatInTimeZone(date, TZ, 'EEEE', { locale: ptBR })
  return `${weekday} · ${dayMonth}`
}

// "domingo, 14 jun · 13:00"
export function fullKickoff(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "EEEE, dd MMM '·' HH:mm", { locale: ptBR })
}

// "2d 4h" / "4h 12m" / "8m" — tempo até o kickoff. null se já passou.
export function closesInLabel(iso: string, now = new Date()): string | null {
  const ms = new Date(iso).getTime() - now.getTime()
  if (ms <= 0) return null
  const totalMin = Math.floor(ms / 60_000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function daysFromToday(iso: string, now: Date): number {
  const a = toZonedTime(new Date(iso), TZ)
  const b = toZonedTime(now, TZ)
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((da - db) / 86_400_000)
}
