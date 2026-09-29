import type { RequestStatus } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Flow Viewer'ın workflowData'da olmayan metinleri (tr_TR) ve durum çipinin rengi
 * ------------------------------------------------------------------------------------------------- */

export const FLOW_TEXT = {
  warning: 'Uyarı', // 100652
  yes: 'Evet', // 100587
  no: 'Hayır', // 100588
  ok: 'Tamam', // 100004
  cancel: 'İptal', // 100034
  delete: 'Sil', // 100013
  forwardTitle: 'Yönlendirme', // 100102
  showForm: 'Formu Görüntüle', // 101044
  formEmpty: 'Form Dokümanı Boş', // 101835
  detail: 'Detay', // 100763
  mainFlow: 'Ana Akış', // 102641
  processNo: 'Süreç No', // 100761
  viewOptions: 'Görünüm Seçenekleri', // 103797
  showNotify: 'Bilgilendirmeleri Göster', // 100759
  showRawDate: 'Tarih ve Saati Göster', // 102129
  /** "$0 ($1 vekaleten)" (102912). */
  delegated: (status: string, user: string) => `${status} (${user} vekaleten)`,
} as const

/** Sunucu durumunun çip rengi; `StatusChip` ile aynı: sonuçlar yeşil / kırmızı, süren durumlar amber. */
export function statusColor(s: RequestStatus): 'success' | 'danger' | 'warning' {
  return s === 'Tamamlandı' ? 'success' : s === 'Reddedildi' ? 'danger' : 'warning'
}
