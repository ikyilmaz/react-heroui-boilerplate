import type { LucideIcon } from 'lucide-react'
import { Save, Send, X } from 'lucide-react'
import { Flex, Form, Table, type TableColumnsType } from 'antd'
import {
  APP_FORM_TEXT,
  type AppForm,
  type AppFormKind,
  type AppFormTable,
} from '@/synergy/shared/appForms'
import { cn } from '@/synergy/ant/ui'
import { useNotify } from '@/synergy/ant/hr'
import { FormField, LongField } from '@/synergy/FormFields'
import { ChildButton, ItemsTable, Section } from '@/synergy/DetailTiles'

/*
 * Menü uygulamasının form gövdesi (maket, `shared/appForms.ts`): bölümler (düzenlenebilir alanlar,
 * kaydedilmez), kalemler, liste ve açıklama. Talep formuyla aynı dil (`FormBody`): bölüm başlığı,
 * bölmenin genişliğine göre bir ya da iki sütun. Formun olayları da burada (panelde `AppViewer`,
 * modal / drawer'da `FormDeck`).
 */

/** Menü formunun olayları (orijinal: akışın başlangıç olayları ya da uygulama formunun araç çubuğu). */
export type AppEvent = 'send' | 'draft' | 'cancel' | 'save' | 'close'

export const APP_EVENTS: Record<
  AppFormKind,
  { id: AppEvent; label: string; icon: LucideIcon; primary?: boolean }[]
> = {
  start: [
    { id: 'send', label: APP_FORM_TEXT.send, icon: Send, primary: true },
    { id: 'draft', label: APP_FORM_TEXT.saveDraft, icon: Save },
    { id: 'cancel', label: APP_FORM_TEXT.cancel, icon: X },
  ],
  form: [
    { id: 'save', label: APP_FORM_TEXT.save, icon: Save, primary: true },
    { id: 'close', label: APP_FORM_TEXT.close, icon: X },
  ],
}

/**
 * Olayın işi: "Gönder" bildirip formu kapatır, "Taslak Olarak Kaydet" / "Kaydet" yalnızca bildirir
 * (hiçbir şey kaydedilmez), "İptal" / "Kapat" formu kapatır.
 */
export function useAppEvent(caption: string, onClose: () => void) {
  const notify = useNotify()
  return (id: AppEvent) => {
    if (id === 'send') {
      notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.sent(caption))
      onClose()
    } else if (id === 'draft') notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.draftSaved)
    else if (id === 'save') notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.saved)
    else onClose()
  }
}

const NUM = 'whitespace-nowrap tabular-nums'

type Row = Record<string, string> & { key: string }

/** Uygulama formundaki liste: çizgisiz, düz başlık şeridi (kalem tablosu gibi). */
function ListTable({ table }: { table: AppFormTable }) {
  const columns: TableColumnsType<Row> = table.columns.map((c, i) => ({
    key: `c${i}`,
    dataIndex: `c${i}`,
    title: c.title,
    ...(c.num && { align: 'end' as const, className: NUM }),
  }))
  const data = table.rows.map((cells, r) => {
    const row: Row = { key: `r${r}` }
    cells.forEach((v, i) => (row[`c${i}`] = v))
    return row
  })
  return (
    // Dar bölmede yana kayar (antd `scroll.x` sütunları her görünüşte tek tek ölçerdi)
    <Flex className="block min-w-0 overflow-x-auto">
      <Table<Row>
        aria-label={table.title}
        size="middle"
        pagination={false}
        className="[&_table]:w-max [&_table]:min-w-full"
        columns={columns}
        dataSource={data}
      />
    </Flex>
  )
}

/**
 * `onOpen`: child form düğmeleri (formun `children`'ı, alanın hemen altında); yalnızca açacak yer
 * varsa (modal / drawer destesi), yoksa düğme yok.
 */
export function AppFormBody({ form, onOpen }: { form: AppForm; onOpen?: (id: string) => void }) {
  return (
    <Form layout="vertical" component={false}>
      <Flex vertical gap={32}>
        {form.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            {/* Sütun sayısı bölmenin genişliğine göre (bölme `@container`) */}
            <Flex
              className={cn(
                'grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-2',
                // Kısa süzgeçler geniş bölmede tek satırda
                form.kind === 'form' && '@4xl:grid-cols-3',
              )}
            >
              {Object.entries(s.fields).map(([label, value]) => {
                const links = onOpen ? (form.children ?? []).filter((c) => c.after === label) : []
                if (!links.length) return <FormField key={label} label={label} value={value} />
                return (
                  <Flex key={label} vertical gap={8} className="min-w-0">
                    <FormField label={label} value={value} />
                    {links.map((l) => (
                      <ChildButton key={l.id} link={l} onOpen={onOpen!} />
                    ))}
                  </Flex>
                )
              })}
            </Flex>
          </Section>
        ))}
        {form.items && (
          <Section title="Kalemler">
            <ItemsTable items={form.items} />
          </Section>
        )}
        {form.table && (
          <Section title={form.table.title}>
            <ListTable table={form.table} />
          </Section>
        )}
        {form.note && (
          <Section title="Açıklama">
            <LongField label="Açıklama" value={form.note} rows={4} hideLabel />
          </Section>
        )}
      </Flex>
    </Form>
  )
}
