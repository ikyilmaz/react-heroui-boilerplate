import { Flex, Form, Table, type TableColumnsType } from 'antd'
import type { AppForm, AppFormTable } from '@/synergy/shared/appForms'
import { cn } from '@/synergy/ant/ui'
import { FormField, LongField } from '@/synergy/FormFields'
import { ItemsTable, Section } from '@/synergy/DetailTiles'

/*
 * Menü uygulamasının form gövdesi (maket, `shared/appForms.ts`): bölümler (düzenlenebilir alanlar,
 * kaydedilmez), kalemler, liste ve açıklama. Talep formuyla aynı dil (`FormBody`): bölüm başlığı,
 * bölmenin genişliğine göre bir ya da iki sütun.
 */

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
    <Table<Row>
      aria-label={table.title}
      size="middle"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={columns}
      dataSource={data}
    />
  )
}

export function AppFormBody({ form }: { form: AppForm }) {
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
              {Object.entries(s.fields).map(([label, value]) => (
                <FormField key={label} label={label} value={value} />
              ))}
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
