/**
 * 백엔드 API 호출 공통 함수
 *
 * - 모든 응답은 RsData 형태({ resultCode, msg, data })라서 성공하면 data만 돌려줘요.
 * - 실패하면 ApiError를 던져요. msg에 백엔드가 준 한국어 안내 문구가 담겨 있어요.
 * - Access Token은 메모리에만 두고, 401이 오면 Refresh Token 쿠키로 한 번 재발급한 뒤 다시 요청해요.
 */

/** 개발 중에는 비워 두고 Vite 프록시(/api → 백엔드)를 써요. 배포 시 .env에 VITE_API_URL을 넣어요. */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

type RsData<T> = { resultCode: string; msg: string; data: T }

export class ApiError extends Error {
  readonly status: number
  readonly resultCode: string
  readonly data: unknown

  constructor(status: number, resultCode: string, msg: string, data: unknown) {
    super(msg)
    this.name = 'ApiError'
    this.status = status
    this.resultCode = resultCode
    this.data = data
  }
}

/** 화면에 보여줄 에러 문구를 뽑아요. */
export function errorMessage(e: unknown, fallback = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.') {
  if (e instanceof ApiError) {
    const fieldErrors = (e.data as { fieldErrors?: Array<{ reason: string }> } | null)?.fieldErrors
    if (fieldErrors?.length) return fieldErrors[0].reason
    return e.message || fallback
  }
  return fallback
}

// ── Access Token ─────────────────────────────────────────
let accessToken: string | null = null
const tokenListeners = new Set<() => void>()

export function getAccessToken() {
  return accessToken
}
export function setAccessToken(token: string | null) {
  accessToken = token
  tokenListeners.forEach((fn) => fn())
}
export function onAccessTokenChange(fn: () => void) {
  tokenListeners.add(fn)
  return () => tokenListeners.delete(fn)
}

// ── 요청 ────────────────────────────────────────────────
type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 쿼리스트링 */
  query?: Record<string, string | number | boolean | undefined | null>
  /** 추가 요청 헤더 (예: Idempotency-Key) */
  headers?: Record<string, string>
  /** 401일 때 토큰 재발급 후 다시 시도할지 (기본 true) */
  retry?: boolean
}

/** 주소 + 쿼리스트링 (값이 비어 있는 키는 빼요) */
function buildUrl(path: string, query?: Options['query']) {
  let url = `${BASE_URL}${path}`
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  return url
}

async function send<T>(path: string, { method = 'GET', body, query, headers: extraHeaders }: Options): Promise<T> {
  const url = buildUrl(path, query)

  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders }
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: 'include', // Refresh Token 쿠키 주고받기
    })
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.', null)
  }

  const json = (await res.json().catch(() => null)) as RsData<T> | null
  if (!res.ok) {
    throw new ApiError(res.status, json?.resultCode ?? String(res.status), json?.msg ?? '', json?.data ?? null)
  }
  return (json?.data ?? null) as T
}

/** Refresh Token 쿠키로 Access Token을 다시 받아요. 동시에 여러 번 불려도 한 번만 요청해요. */
let refreshing: Promise<boolean> | null = null
export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= send<{ accessToken: string }>('/api/v1/auth/refresh', { method: 'POST' })
    .then((d) => {
      setAccessToken(d.accessToken)
      return true
    })
    .catch(() => {
      setAccessToken(null)
      return false
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

// ── 파일 받기 (엑셀 등) ─────────────────────────────────

/** 파일 응답. fileName은 응답의 Content-Disposition에서 꺼낸 이름이에요(없으면 null). */
export type DownloadedFile = { blob: Blob; fileName: string | null }

/**
 * Content-Disposition에서 파일 이름을 꺼내요.
 * 한글 이름은 filename*=UTF-8''... 쪽에 들어 있어서 그쪽을 먼저 봐요.
 */
export function fileNameOf(disposition: string | null): string | null {
  if (!disposition) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // 잘못 인코딩된 이름이면 아래 일반 이름을 써요
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1].trim() : null
}

async function sendFile(path: string, query?: Options['query']): Promise<DownloadedFile> {
  const headers: Record<string, string> = { Accept: '*/*' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  let res: Response
  try {
    res = await fetch(buildUrl(path, query), { headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.', null)
  }
  if (!res.ok) {
    // 실패하면 다른 API처럼 JSON(RsData)으로 와요
    const json = (await res.json().catch(() => null)) as RsData<unknown> | null
    throw new ApiError(res.status, json?.resultCode ?? String(res.status), json?.msg ?? '', json?.data ?? null)
  }
  return { blob: await res.blob(), fileName: fileNameOf(res.headers.get('Content-Disposition')) }
}

/**
 * 파일을 내려받아요. Authorization 헤더가 필요해서 <a href> 대신 fetch로 받아요.
 * 401이면 api()처럼 토큰을 한 번 재발급한 뒤 다시 시도해요.
 */
export async function download(path: string, query?: Options['query']): Promise<DownloadedFile> {
  try {
    return await sendFile(path, query)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await refreshAccessToken())) return sendFile(path, query)
    throw e
  }
}

/** 받은 파일을 브라우저 다운로드로 저장해요. */
export function saveFile({ blob, fileName }: DownloadedFile, fallbackName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 클릭 처리가 끝난 다음에 주소를 풀어요(바로 풀면 일부 브라우저에서 다운로드가 취소돼요)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  try {
    return await send<T>(path, options)
  } catch (e) {
    const canRetry =
      options.retry !== false && e instanceof ApiError && e.status === 401 && !path.startsWith('/api/v1/auth/')
    if (canRetry && (await refreshAccessToken())) return send<T>(path, options)
    throw e
  }
}
