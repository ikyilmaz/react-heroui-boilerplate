/* -------------------------------------------------------------------------------------------------
 * Tarih format dizgesi → React Aria segmentleri
 *
 * React Aria'nın tarih alanı locale güdümlüdür: hangi segmentler, hangi sırada ve hangi ayraçlarla
 * görüneceğini `Intl.DateTimeFormat` belirler, format dizgesi diye bir kavramı yoktur.
 *
 * Ama `DateInput` render edeceği şeyi tamamen `state.segments` dizisinden okur:
 *
 *     state.segments.map((segment, i) => cloneElement(children(segment), { key: i }))
 *
 * Yani motoru çatallamadan, üretilen segmentleri format'a göre yeniden dizip metinlerini
 * değiştirmek yetiyor. Segmentin `value` / `minValue` / `maxValue` / `isEditable` alanlarına ve
 * `state`in mutator'larına (increment, setSegment, clearSegment) dokunmuyoruz; ok tuşları, rakam
 * yazma, odak yönetimi ve ARIA olduğu gibi React Aria'dan gelmeye devam ediyor.
 * ------------------------------------------------------------------------------------------------- */

export type FormatField = 'year' | 'month' | 'day' | 'weekday' | 'hour' | 'minute' | 'second' | 'dayPeriod'

export type FormatToken =
  | { kind: 'literal'; text: string }
  | { kind: 'field'; field: FormatField; style: string; raw: string }

/** Uzun token'lar önce gelmeli: tarama sırayla `startsWith` ile yapılıyor. */
const TOKENS: readonly (readonly [string, FormatField, string])[] = [
  ['YYYY', 'year', 'numeric'],
  ['YY', 'year', '2-digit'],
  ['MMMM', 'month', 'long'],
  ['MMM', 'month', 'short'],
  ['MM', 'month', '2-digit'],
  ['M', 'month', 'numeric'],
  ['DD', 'day', '2-digit'],
  ['D', 'day', 'numeric'],
  ['dddd', 'weekday', 'long'],
  ['ddd', 'weekday', 'short'],
  ['HH', 'hour', '2-digit'],
  ['H', 'hour', 'numeric'],
  ['hh', 'hour', '2-digit'],
  ['h', 'hour', 'numeric'],
  ['mm', 'minute', '2-digit'],
  ['m', 'minute', 'numeric'],
  ['ss', 'second', '2-digit'],
  ['s', 'second', 'numeric'],
  ['A', 'dayPeriod', 'upper'],
  ['a', 'dayPeriod', 'lower'],
]

/**
 * moment/dayjs tarzı dizgeyi token'lara ayırır. `[...]` arasındaki metin düz metin sayılır.
 * Tanınmayan harfler düz metin olur ve geliştirme modunda uyarı basılır (sessizce yutmamak için).
 */
export function parseDateFormat(format: string): FormatToken[] {
  const out: FormatToken[] = []
  const unknown = new Set<string>()

  const pushLiteral = (text: string) => {
    const last = out[out.length - 1]
    if (last?.kind === 'literal') last.text += text
    else out.push({ kind: 'literal', text })
  }

  let i = 0
  while (i < format.length) {
    if (format[i] === '[') {
      const end = format.indexOf(']', i + 1)
      if (end > -1) {
        pushLiteral(format.slice(i + 1, end))
        i = end + 1
        continue
      }
    }
    const match = TOKENS.find(([token]) => format.startsWith(token, i))
    if (match) {
      out.push({ kind: 'field', field: match[1], style: match[2], raw: match[0] })
      i += match[0].length
      continue
    }
    if (/[a-zA-Z]/.test(format[i])) unknown.add(format[i])
    pushLiteral(format[i])
    i += 1
  }

  if (import.meta.env.DEV && unknown.size > 0) {
    // oxlint-disable-next-line no-console
    console.warn(
      `[DateTimePicker] Desteklenmeyen format token'ı düz metin olarak basıldı: ${[...unknown].join(', ')} (format: "${format}")`,
    )
  }
  return out
}

/* -------------------------------------------------------------------------------------------------
 * Format → React Aria alan ayarları
 * ------------------------------------------------------------------------------------------------- */

export interface FormatFieldProps {
  /** Motorun üreteceği en küçük birim. */
  granularity: 'day' | 'hour' | 'minute' | 'second'
  /** 12 ise motor ayrıca düzenlenebilir bir `dayPeriod` segmenti üretir. */
  hourCycle: 12 | 24
  hasTime: boolean
  showSecond: boolean
}

export function fieldPropsFromFormat(tokens: FormatToken[]): FormatFieldProps {
  const fields = new Set(tokens.filter((t) => t.kind === 'field').map((t) => t.field))
  const twelveHour = tokens.some(
    (t) => t.kind === 'field' && ((t.field === 'hour' && /h/.test(t.raw)) || t.field === 'dayPeriod'),
  )

  const granularity = fields.has('second')
    ? 'second'
    : fields.has('minute')
      ? 'minute'
      : fields.has('hour')
        ? 'hour'
        : 'day'

  return {
    granularity,
    hourCycle: twelveHour ? 12 : 24,
    hasTime: granularity !== 'day',
    showSecond: fields.has('second'),
  }
}

/* -------------------------------------------------------------------------------------------------
 * Segment üretimi
 * ------------------------------------------------------------------------------------------------- */

/** React Aria `DateSegment`'inin bizim dokunduğumuz alanları. */
export interface EngineSegment {
  type: string
  text: string
  value?: number | null
  minValue?: number | null
  maxValue?: number | null
  isPlaceholder: boolean
  placeholder?: string
  isEditable: boolean
}

/** `buildSegments`in ihtiyaç duyduğu state yüzeyi (DateFieldState / TimeFieldState). */
export interface SegmentSource {
  segments: EngineSegment[]
  dateValue: Date
  value: unknown
}

const nameCache = new Map<string, Intl.DateTimeFormat>()
function namer(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options)
  let f = nameCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
    nameCache.set(key, f)
  }
  return f
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

function literal(text: string, isPlaceholder = false): EngineSegment {
  return { type: 'literal', text, isPlaceholder, isEditable: false }
}

function fieldText(base: EngineSegment, token: Extract<FormatToken, { kind: 'field' }>, locale: string) {
  // Değer yokken motorun yerelleştirilmiş yer tutucusunu ("gg", "aa", "yyyy") koru
  if (base.isPlaceholder || base.value == null) return base.text

  switch (token.field) {
    case 'year':
      return token.style === '2-digit' ? pad(base.value % 100) : String(base.value)
    case 'month':
      if (token.style === 'long' || token.style === 'short') {
        return namer(locale, { month: token.style }).format(Date.UTC(2001, base.value - 1, 1))
      }
      return token.style === '2-digit' ? pad(base.value) : String(base.value)
    case 'day':
    case 'hour':
    case 'minute':
    case 'second':
      return token.style === '2-digit' ? pad(base.value) : String(base.value)
    case 'dayPeriod':
      return token.style === 'lower' ? base.text.toLocaleLowerCase(locale) : base.text.toLocaleUpperCase(locale)
    default:
      return base.text
  }
}

function weekdaySegment(state: SegmentSource, style: string, locale: string): EngineSegment {
  const name = namer(locale, { weekday: style as 'long' | 'short' }).format(state.dateValue)
  // Değer yokken gerçek bir gün adı basmak "seçilmiş" izlenimi verir; motorun boş saat
  // segmentlerinde kullandığı tire dilini kullanıyoruz, uzunluğu da değerin şeklini korusun.
  const isEmpty = state.value == null
  // Gün adı tarihten türer, düzenlenemez. `literal` tipi React Aria'da aria-hidden'dır;
  // doğrusu da bu: ekran okuyucu zaten gün/ay/yıl segmentlerini tek tek okuyor.
  return literal(isEmpty ? '–'.repeat(name.length) : name, isEmpty)
}

/**
 * Motorun ürettiği segmentleri format sırasına dizer ve metinlerini token'a göre yazar.
 * `value`/`minValue`/`maxValue`/`isEditable` motordan geldiği gibi taşınır.
 */
export function buildSegments(state: SegmentSource, tokens: FormatToken[], locale: string): EngineSegment[] {
  const byField = new Map<string, EngineSegment>()
  for (const s of state.segments) {
    if (s.type !== 'literal' && !byField.has(s.type)) byField.set(s.type, s)
  }

  return tokens.map((token) => {
    if (token.kind === 'literal') return literal(token.text)
    if (token.field === 'weekday') return weekdaySegment(state, token.style, locale)

    const base = byField.get(token.field)
    // Format, granularity'nin üretmediği bir alan isterse sessizce atla
    if (!base) return literal('')
    return { ...base, text: fieldText(base, token, locale) }
  })
}
