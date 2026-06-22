import 'server-only'

// Cliente do gateway CodePay (PIX cash-in). Base oficial e únicos endpoints:
//   POST /cli/client/authenticate          → { clientId, password } → { data: { token } }
//   POST /cli/payment/pix/generate-pix      → { value, externalId, expiration } → { data: { pix, paymentId, movId } }
// Credenciais via env (app monolítico — sem multi-tenant, sem secret no banco).

const DEFAULT_BASE = 'https://production.codetech.technology'

export interface CodePayCredentials {
  clientId: string
  password: string // == "SecretKey" do painel
}

export function apiBase(): string {
  return process.env.CODEPAY_BASE_URL || DEFAULT_BASE
}

/** Lê as credenciais das env vars (server-only). null se não configurado. */
export function getCredentials(): CodePayCredentials | null {
  const clientId = process.env.CODEPAY_CLIENT_ID
  const password = process.env.CODEPAY_SECRET_KEY
  if (!clientId || !password) return null
  return { clientId, password }
}

// ── cache de token (JWT) em memória, por clientId ───────────────────────────
interface CachedToken {
  token: string
  exp: number // epoch seconds
}
const tokenCache = new Map<string, CachedToken>()

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    )
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

function invalidateToken(clientId: string) {
  tokenCache.delete(clientId)
}

export async function getAccessToken(creds: CodePayCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const cached = tokenCache.get(creds.clientId)
  if (cached && cached.exp - 60 > now) return cached.token // renova 60s antes

  const res = await fetch(`${apiBase()}/cli/client/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clientId: creds.clientId, password: creds.password }),
    cache: 'no-store',
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('CodePay rejeitou as credenciais')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CodePay auth ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { data?: { token?: string } }
  const token = json?.data?.token
  if (!token) throw new Error('CodePay não retornou token')
  tokenCache.set(creds.clientId, { token, exp: decodeJwtExp(token) ?? now + 300 })
  return token
}

export interface CreatePixInput {
  amount: number // valor em reais
  externalRef: string // nossa referência (id do registro de pagamento)
  expirationSeconds?: number
}
export interface PixCharge {
  pix_code: string // copia e cola
  identifier: string // paymentId da CodePay
  movId?: string
}

export async function createPixCharge(
  creds: CodePayCredentials,
  input: CreatePixInput,
): Promise<PixCharge> {
  const token = await getAccessToken(creds)
  const res = await fetch(`${apiBase()}/cli/payment/pix/generate-pix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      value: input.amount,
      externalId: input.externalRef,
      expiration: input.expirationSeconds ?? 0,
    }),
    cache: 'no-store',
  })
  if (res.status === 401) {
    invalidateToken(creds.clientId) // força renovar na próxima
    throw new Error('CodePay: sessão expirada, tente de novo')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CodePay pix ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    data?: { pix?: string; paymentId?: string | number; movId?: string | number }
  }
  const d = json?.data ?? {}
  if (!d.pix || d.paymentId == null) {
    throw new Error('CodePay: resposta sem pix/paymentId')
  }
  return {
    pix_code: d.pix,
    identifier: String(d.paymentId),
    movId: d.movId != null ? String(d.movId) : undefined,
  }
}

// ── webhook ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

function classifyStatus(raw: string): PaymentStatus {
  const s = raw.toLowerCase()
  // CodePay manda "CONFIRMED" no PIX IN — precisa contar como aprovado.
  if (/(approved|paid|completed|success|confirmed|aprovad|pago|conclu|confirmad)/.test(s))
    return 'APPROVED'
  if (/(rejected|failed|cancel|expired|refused|recus|falh|expir)/.test(s)) return 'REJECTED'
  return 'PENDING'
}

// Formato documentado do PIX IN (cash-in confirmado). Campos no topo do corpo.
export interface CodePayWebhook {
  paymentId: string | null // id da CodePay (guardamos em payments.external_id)
  externalId: string | null // NOSSA referência (= payments.id)
  movId: string | null
  status: PaymentStatus
  securityParaphrase: string | null
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.length ? v : null
  if (typeof v === 'number') return String(v)
  return null
}

/** Lê os campos documentados do webhook do CodePay (case-insensitive no topo). */
export function parseCodePayWebhook(payload: unknown): CodePayWebhook {
  const o = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const get = (want: string): unknown => {
    for (const k of Object.keys(o)) {
      if (k.toLowerCase() === want.toLowerCase()) return o[k]
    }
    return undefined
  }
  return {
    paymentId: str(get('paymentId')),
    externalId: str(get('externalId')),
    movId: str(get('movId')),
    status: classifyStatus(str(get('status')) ?? ''),
    securityParaphrase: str(get('securityParaphrase')),
  }
}

/** Procura recursivamente por uma chave "id-like" e por qualquer key terminada
 *  em "status" no payload do webhook (formato pode variar). */
export function extractWebhookInfo(payload: unknown): {
  identifier: string | null
  status: PaymentStatus
} {
  const ids: Record<string, string> = {}
  let status: PaymentStatus = 'PENDING'
  const idKeys = new Set(['paymentid', 'movid', 'id', 'identifier', 'externalid'])

  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const lk = k.toLowerCase()
      if (idKeys.has(lk) && ids[lk] == null && (typeof v === 'string' || typeof v === 'number')) {
        ids[lk] = String(v)
      }
      if (lk.endsWith('status') && typeof v === 'string') status = classifyStatus(v)
      if (v && typeof v === 'object') walk(v)
    }
  }
  walk(payload)

  const identifier =
    ids.paymentid ?? ids.identifier ?? ids.externalid ?? ids.movid ?? ids.id ?? null
  return { identifier, status }
}
