import { CalendarDateTime } from '@internationalized/date'
import { Label, TextArea, TextField } from '@heroui/react'
import { DateTimePicker } from '@/components/DateTimePicker'
import { NumberBox } from '@/components/NumberBox'
import { TextBox } from '@/components/TextBox'

/*
 * Form alanlarını boilerplate'in gerçek bileşenleriyle, salt okunur çizer. Maket veride alanlar
 * metin; değerin biçimine göre bileşen seçilir: "₺12.900" NumberBox (para), "6" NumberBox,
 * "10 Ekim 2026" / "26 Eylül 2026 13:00" DateTimePicker, uzun metin çok satırlı alan, geri kalanı
 * TextBox.
 */

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DATE = new RegExp(`^(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4})(?: (\\d{2}):(\\d{2}))?(?: [A-Za-zÇĞİÖŞÜçğıöşü]+)?$`)

const TRY: Intl.NumberFormatOptions = { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }

/** "₺224.400" → 224400 (yalnızca tek tutar; "₺486.000 / yıl" gibi ekli olanlar metin kalır). */
function money(v: string) {
  const m = /^₺([\d.]+)$/.exec(v)
  return m ? Number(m[1]!.replaceAll('.', '')) : null
}

/** "10 Ekim 2026" (ardından saat ya da gün adı olabilir) → takvim değeri ve saatli mi. */
function date(v: string): { value: CalendarDateTime; time: boolean } | null {
  const m = DATE.exec(v)
  if (!m) return null
  const [, d, mon, y, hh, mm] = m
  const value = new CalendarDateTime(Number(y), MONTHS.indexOf(mon!) + 1, Number(d), Number(hh ?? 0), Number(mm ?? 0))
  return { value, time: hh != null }
}

export function FormField({ label, value }: { label: string; value: string }) {
  const amount = money(value)
  if (amount != null) return <NumberBox label={label} value={amount} formatOptions={TRY} showControls={false} isReadOnly className="w-full" />
  if (/^\d+$/.test(value)) return <NumberBox label={label} value={Number(value)} showControls={false} isReadOnly className="w-full" />
  const d = date(value)
  if (d) return <DateTimePicker label={label} value={d.value} showTime={d.time} isClearable={false} isReadOnly className="w-full" />
  if (value.length > 60) return <LongField label={label} value={value} />
  return <TextBox label={label} value={value} isReadOnly className="w-full" />
}

/** Uzun metin: salt okunur çok satırlı alan; başlığı bölümde yazıyorsa etiket gizlenir (`hideLabel`). */
export function LongField({ label, value, rows = 3, hideLabel = false }: { label: string; value: string; rows?: number; hideLabel?: boolean }) {
  return (
    <TextField value={value} isReadOnly fullWidth aria-label={hideLabel ? label : undefined}>
      {!hideLabel && <Label>{label}</Label>}
      <TextArea rows={rows} className="w-full resize-none" />
    </TextField>
  )
}
