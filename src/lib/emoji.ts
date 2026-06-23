// Valida se uma string é UM emoji (pra reações personalizadas). Extended
// Pictographic + Emoji Component já cobrem ZWJ, seletor de variação, tons de
// pele e bandeiras (regional indicators). Rejeita texto/números/spam.
const EMOJI_ONLY =
  /^[\p{Extended_Pictographic}\p{Emoji_Component}\u{1F1E6}-\u{1F1FF}]+$/u

export function isSingleEmoji(input: string): boolean {
  const s = input.trim()
  if (!s || s.length > 16) return false
  if (!EMOJI_ONLY.test(s)) return false
  // precisa ter ao menos um pictográfico ou bandeira (evita só dígito/seletor)
  return /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u.test(s)
}
