import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Alert, Button, Chip, EmptyState, Header, ListBox, Modal, SearchField, Surface, ToggleButton, Typography, cn } from '@heroui/react'
import { ArrowLeft, ChevronRight, Star } from 'lucide-react'
import { findProcess, type Process } from '@/pages/workflows/workflowData'
import { processCatalog, useFavorites } from '@/pages/workspace/home/favorites'
import { useHome, type StartState } from '@/pages/workspace/home/HomeContext'
import { Box, Text } from '@/pages/workspace/ui'
import { inline, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Yeni talep" penceresi
 *
 * Başlıktaki "Yeni talep", N tuşu ve "Yeni talep başlat" widget'ı hep bu pencereyi açar
 * (`HomeContext › openStart(processId?)`). İki adım:
 *
 * - Katalog: "Ne başlatmak istiyorsunuz?" + arama (`SearchField`; ad, birim ve gündelik eş
 *   anlamlılar: "laptop" → Satın Alma, "taksi" → Masraf). Liste bölümlü `ListBox`: önce "Sık
 *   kullandıklarınız", sonra birimler (süreç listesinde ilk göründükleri sırayla). Aramada ↓ listeye
 *   iner, listenin başında ↑ aramaya döner, Enter ilk sonucu açar.
 * - Özet: sürecin adı, "Bu talep şu adımlardan geçer" ve adımlar (ilki "Siz · …", onay verdiğiniz
 *   adım soluk), formun bu örnekte olmadığını söyleyen `Alert` ve yıldız. Başarıyı taklit eden bir
 *   düğme yok: yalnızca "Geri" ve "Kapat".
 *
 * Kapanırken son adım çizilmeye devam eder (çıkış animasyonu boş pencere göstermesin).
 * ------------------------------------------------------------------------------------------------- */

type Step = 'catalog' | 'summary'

/** Kenar halkası (`tile`) HeroUI'nin odak halkasını ezer; klavye odağında geri verilir. */
const focusRing = 'data-[focus-visible]:status-focused'

/** Yıldız: seçiliyken dolu yıldız, zemin sakin (siyah yalnızca karar düğmelerinde). */
const starToggle = cn(
  'data-[selected=true]:bg-(--default) data-[selected=true]:text-foreground data-[selected=true]:data-[hovered=true]:bg-(--default-hover)',
  focusRing,
)

/** Liste bölüm başlığı: küçük, orta kalınlık, soluk; büyük harf yok. */
const sectionHeader = 'px-2 pt-4 pb-1.5 text-[0.8125rem] leading-5 font-medium text-foreground/65'

export function StartModal() {
  const home = useHome()
  const { start, closeStart } = home

  // Pencere her açılışta (yeni `start` nesnesi) baştan kurulur: süreç verildiyse özet, yoksa katalog
  const [openedFor, setOpenedFor] = useState<StartState | null>(start)
  const [step, setStep] = useState<Step>(start?.processId && findProcess(start.processId) ? 'summary' : 'catalog')
  const [processId, setProcessId] = useState<string | undefined>(start?.processId)
  const [query, setQuery] = useState('')
  if (start !== openedFor) {
    setOpenedFor(start)
    if (start) {
      setStep(start.processId && findProcess(start.processId) ? 'summary' : 'catalog')
      setProcessId(start.processId)
      setQuery('')
    }
  }

  const process = findProcess(processId)
  const summary = step === 'summary' && !!process

  const openSummary = (id: string) => {
    if (!findProcess(id)) return
    setProcessId(id)
    setStep('summary')
  }

  return (
    <Modal.Backdrop
      isOpen={!!start}
      onOpenChange={(open) => {
        if (!open) closeStart()
      }}
      variant="blur"
      className="soft-theme bg-background/50"
    >
      <Modal.Container placement="center" size="lg" scroll="inside">
        <Modal.Dialog className={cn('w-[32rem] max-w-full rounded-panel p-6', !summary && 'h-[min(40rem,100%)]')}>
          {summary && process ? (
            <Summary process={process} onBack={() => setStep('catalog')} onClose={closeStart} />
          ) : (
            <Catalog query={query} setQuery={setQuery} onPick={openSummary} />
          )}
          <Modal.CloseTrigger aria-label="Kapat" />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

/* ---- Katalog ----------------------------------------------------------------------------------- */

function Catalog({ query, setQuery, onPick }: { query: string; setQuery: (q: string) => void; onPick: (id: string) => void }) {
  const [ids] = useFavorites()
  const { favorites, departments } = processCatalog(query, ids)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const first = favorites[0] ?? departments[0]?.processes[0]

  /** Aramada ↓: listenin ilk öğesine iner (odak koleksiyona gelince ilk öğeye geçer). */
  const onSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && first) {
      e.preventDefault()
      listRef.current?.focus()
    }
  }

  /** Listenin ilk öğesinde ↑: aramaya döner (liste kendi başında durur, olayı biz yakalarız). */
  const onListKeyDownCapture = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowUp') return
    const firstOption = listRef.current?.querySelector('[role="option"]')
    if (firstOption && e.target === firstOption) {
      e.preventDefault()
      e.stopPropagation()
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <Modal.Header className="gap-4">
        <Modal.Heading className="pe-10 text-[1.25rem] leading-7 font-semibold tracking-tight">Ne başlatmak istiyorsunuz?</Modal.Heading>
        <SearchField
          value={query}
          onChange={setQuery}
          aria-label="Süreç ara"
          autoFocus
          onKeyDown={onSearchKeyDown}
          onSubmit={() => {
            if (query.trim() && first) onPick(first.id)
          }}
        >
          <SearchField.Group className={cn('h-[44px] rounded-pill px-3', tile, 'data-[focus-within=true]:status-focused-field')}>
            <SearchField.SearchIcon />
            <SearchField.Input ref={inputRef} placeholder="Örn. izin, masraf, laptop" className="text-[0.875rem]" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Modal.Header>

      <Modal.Body className="text-foreground">
        <Box onKeyDownCapture={onListKeyDownCapture}>
          <ListBox
            ref={listRef}
            aria-label="Süreçler"
            onAction={(key) => onPick(String(key).replace(/^fav:/, ''))}
            renderEmptyState={() => (
              <EmptyState className="px-2 py-10 text-center text-[0.875rem] text-foreground/65">Bu adla bir süreç bulunamadı. Farklı bir kelime deneyin.</EmptyState>
            )}
            className="-mx-1 w-auto"
          >
            {favorites.length > 0 && (
              <ListBox.Section id="sik-kullanilanlar" className="gap-0.5">
                <Header className={cn(sectionHeader, 'pt-1')}>Sık kullandıklarınız</Header>
                {favorites.map((p) => (
                  <ProcessItem key={`fav:${p.id}`} id={`fav:${p.id}`} p={p} />
                ))}
              </ListBox.Section>
            )}
            {departments.map((d, i) => (
              <ListBox.Section key={d.department} id={`birim:${d.department}`} className="gap-0.5">
                <Header className={cn(sectionHeader, i === 0 && favorites.length === 0 && 'pt-1')}>{d.department}</Header>
                {d.processes.map((p) => (
                  <ProcessItem key={p.id} id={p.id} p={p} />
                ))}
              </ListBox.Section>
            ))}
          </ListBox>
        </Box>
      </Modal.Body>
    </>
  )
}

/** Katalog satırı: ikon dairesi, süreç adı ve soluk birim. */
function ProcessItem({ id, p }: { id: string; p: Process }) {
  const Icon = p.icon
  return (
    <ListBox.Item id={id} textValue={p.name} className="gap-3 rounded-tile px-2 py-2">
      <Surface variant="tertiary" className={cn('grid size-9 shrink-0 place-items-center rounded-pill', tile)}>
        <Icon size={18} strokeWidth={1.5} aria-hidden />
      </Surface>
      <Box className="flex min-w-0 flex-1 flex-col">
        <Typography {...inline} truncate weight="medium" className="text-[0.875rem] leading-5">
          {p.name}
        </Typography>
        <Text tone="muted" truncate className="text-[0.75rem] leading-4">
          {p.department}
        </Text>
      </Box>
    </ListBox.Item>
  )
}

/* ---- Özet -------------------------------------------------------------------------------------- */

function Summary({ process: p, onBack, onClose }: { process: Process; onBack: () => void; onClose: () => void }) {
  const [ids, toggle] = useFavorites()
  const starred = ids.includes(p.id)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const Icon = p.icon

  // Özete geçince (katalogdaki satır kalkınca) odak başlığa: ekran okuyucu yeni adımı okur
  useEffect(() => {
    headingRef.current?.focus()
  }, [p.id])

  return (
    <>
      <Modal.Header className="flex-row items-center gap-4">
        <Surface variant="tertiary" className={cn('grid size-12 shrink-0 place-items-center rounded-pill', tile)}>
          <Icon size={22} strokeWidth={1.5} aria-hidden />
        </Surface>
        <Box className="flex min-w-0 flex-col pe-10">
          <Modal.Heading ref={headingRef} tabIndex={-1} className="text-[1.25rem] leading-7 font-semibold tracking-tight outline-none">
            {p.name}
          </Modal.Heading>
          <Text className="text-[0.8125rem] leading-5">{p.department}</Text>
        </Box>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-5 text-foreground">
        <Box className="flex flex-col gap-2.5">
          <Text className="text-[0.8125rem] leading-5">Bu talep şu adımlardan geçer</Text>
          <Box role="list" aria-label="Onay yolu" className="flex flex-wrap items-center gap-1.5">
            {p.steps.map((step, i) => (
              <Fragment key={step}>
                {i > 0 && <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 text-foreground/30" aria-hidden />}
                {i === 0 ? (
                  <Chip role="listitem" color="accent" variant="primary" size="sm">
                    Siz · {step}
                  </Chip>
                ) : (
                  <Chip role="listitem" variant="secondary" size="sm" className={i === p.approverStep ? 'text-foreground/45' : 'text-foreground/65'}>
                    {step}
                  </Chip>
                )}
              </Fragment>
            ))}
          </Box>
        </Box>

        <Alert status="default" className={cn('rounded-card shadow-none', tile)}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title className="text-[0.875rem]">Talep formu bu örnekte henüz hazır değil.</Alert.Title>
          </Alert.Content>
        </Alert>

        <ToggleButton isSelected={starred} onChange={() => toggle(p.id)} className={cn('self-start text-[0.875rem]', tile, starToggle)}>
          <Star size={16} strokeWidth={1.5} fill={starred ? 'currentColor' : 'none'} aria-hidden />
          {starred ? 'Sık kullanılanlardan çıkar' : 'Sık kullanılanlara ekle'}
        </ToggleButton>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onPress={onBack}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Geri
        </Button>
        <Button variant="secondary" onPress={onClose} className={cn(tile, focusRing)}>
          Kapat
        </Button>
      </Modal.Footer>
    </>
  )
}
