import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoxId, SortDirection, SortField } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Başlangıç sayfasının metinleri ve küçük yardımcıları
 *
 * Metinler orijinalin tr_TR yerelleştirmesinden (numaralar yanlarında). `workflowData.ts`'te
 * olmayanlar burada; ortak veri dosyasına dokunulmaz.
 * ------------------------------------------------------------------------------------------------- */

export const START_LABELS = {
  refresh: 'Yenile', // 102660
  showAll: 'Tümünü Göster', // 102977
  search: 'Ara', // 100002
  detail: 'Detay', // 100763
  requests: 'Süreç Talepleri', // 104055
  drafts: 'Taslaklar', // 100830
  pickProcess: 'Süreç taleplerini görmek için bir proje/süreç seçin', // 104054
  pickDraft: 'Taslakları görmek için bir proje/süreç/form seçin', // 104146
  noData: 'Gösterilecek veri yok.', // 100705
  project: 'Proje', // 100407
  flow: 'Süreç', // 100177
  form: 'Form', // 100178
  requestCount: 'Talep Sayısı', // 104086
  draftCount: 'Taslak Sayısı', // 104145
  categories: 'Kategoriler',
} as const

/** Grup listesinin sütun başlığı: "Proje / Süreç" (taslaklarda "/ Form" eklenir). */
export function groupCaption(box: BoxId) {
  const base = `${START_LABELS.project} / ${START_LABELS.flow}`
  return box === 'taslaklar' ? `${base} / ${START_LABELS.form}` : base
}

export interface GroupSort {
  field: SortField
  direction: SortDirection
}

/**
 * Orijinalin varsayılan sıralaması (ProjectFlowGrid › getDefaultSort): taslaklar oluşturma
 * tarihine, diğerleri talep sayısına göre azalan.
 */
export function defaultSortOf(box: BoxId): GroupSort {
  return box === 'taslaklar' ? { field: 'date', direction: 'descending' } : { field: 'count', direction: 'descending' }
}

/** Kısa süreli "yükleniyor" durumu (maket yenileme; gerçek istek yok). */
export function useBriefPending(ms = 600): [boolean, () => void] {
  const [pending, setPending] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const trigger = useCallback(() => {
    window.clearTimeout(timer.current)
    setPending(true)
    timer.current = window.setTimeout(() => setPending(false), ms)
  }, [ms])
  return [pending, trigger]
}
