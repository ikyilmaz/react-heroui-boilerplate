import { useId } from 'react'
import dayjs from 'dayjs'
import { DatePicker, Form, Input, InputNumber } from 'antd'

/*
 * Form alanları (antd), salt okunur. Maket veride alanlar metin; değerin biçimine göre bileşen
 * seçilir: "₺12.900" para (InputNumber), "6" sayı, "10 Ekim 2026" / "26 Eylül 2026 13:00" tarih
 * (DatePicker), uzun metin çok satırlı alan, geri kalanı Input. Etiketler `Form.Item` ile üstte
 * (sayfadaki `Form layout="vertical"`).
 */

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]
const DATE = new RegExp(
  `^(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4})(?: (\\d{2}):(\\d{2}))?(?: [A-Za-zÇĞİÖŞÜçğıöşü]+)?$`,
)

const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})
const NUM = new Intl.NumberFormat('tr-TR')

/** "₺224.400" → 224400 (yalnızca tek tutar; "₺486.000 / yıl" gibi ekli olanlar metin kalır). */
function money(v: string) {
  const m = /^₺([\d.]+)$/.exec(v)
  return m ? Number(m[1]!.replaceAll('.', '')) : null
}

/** "10 Ekim 2026" (ardından saat ya da gün adı olabilir) → tarih ve saatli mi. */
function date(v: string) {
  const m = DATE.exec(v)
  if (!m) return null
  const [, d, mon, y, hh, mm] = m
  const value = dayjs(
    new Date(Number(y), MONTHS.indexOf(mon!), Number(d), Number(hh ?? 0), Number(mm ?? 0)),
  )
  return { value, time: hh != null }
}

export function FormField({ label, value }: { label: string; value: string }) {
  const id = useId()
  return (
    <Form.Item label={label} htmlFor={id} className="min-w-0">
      <Control id={id} value={value} label={label} />
    </Form.Item>
  )
}

function Control({ id, value, label }: { id: string; value: string; label: string }) {
  const amount = money(value)
  if (amount != null)
    return (
      <InputNumber
        id={id}
        readOnly
        controls={false}
        value={amount}
        formatter={(n) => TRY.format(Number(n))}
        className="w-full!"
      />
    )
  if (/^\d+$/.test(value))
    return (
      <InputNumber
        id={id}
        readOnly
        controls={false}
        value={Number(value)}
        formatter={(n) => NUM.format(Number(n))}
        className="w-full!"
      />
    )
  const d = date(value)
  if (d)
    return (
      // Salt okunur: takvim açılmaz, yazılamaz
      <DatePicker
        id={id}
        value={d.value}
        showTime={d.time ? { format: 'HH:mm' } : false}
        format={d.time ? 'D MMMM YYYY HH:mm' : 'D MMMM YYYY'}
        open={false}
        inputReadOnly
        allowClear={false}
        aria-label={label}
        className="w-full"
      />
    )
  if (value.length > 60)
    return <Input.TextArea id={id} readOnly value={value} autoSize={{ minRows: 2, maxRows: 6 }} />
  return <Input id={id} readOnly value={value} />
}

/** Uzun metin: salt okunur çok satırlı alan; başlığı bölümde yazıyorsa etiket yok (`hideLabel`). */
export function LongField({
  label,
  value,
  rows = 3,
  hideLabel = false,
}: {
  label: string
  value: string
  rows?: number
  hideLabel?: boolean
}) {
  const id = useId()
  const area = (
    <Input.TextArea
      id={id}
      readOnly
      value={value}
      autoSize={{ minRows: rows }}
      aria-label={hideLabel ? label : undefined}
    />
  )
  if (hideLabel) return area
  return (
    <Form.Item label={label} htmlFor={id}>
      {area}
    </Form.Item>
  )
}
