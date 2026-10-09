import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  usePresence,
  type TargetAndTransition,
  type Transition,
} from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { Button, Flex, Modal, Typography } from 'antd'
import { FLOATING_SURFACE, IC, MotionFlex, Scroll, TintIcon, Tip, cn } from '@/synergy/ant/ui'
import { useTransition } from '@/synergy/motion'
import { APP_EVENTS, AppFormBody, useAppEvent } from '@/synergy/AppForm'
import { APP_FORM_TEXT, deckFormOf, deckTitleOf } from '@/synergy/shared/appForms'
import {
  closeDeckCard,
  frontOf,
  openDeckChild,
  parkDeck,
  raiseDeckCard,
  useFormDeck,
  type DeckCard,
  type DeckPlace,
  type FormDeck as Deck,
} from '@/synergy/shared/formDeck'
import type { PanelSize } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Form destesi (`shared/formDeck.ts`): modal ya da drawer'da açılan formlar, bulunulan sayfanın
 * üstünde. Bütün deste tek bir antd `Modal`'da (perde, odak tuzağı, Esc, kaydırma kilidi, odağın
 * geri dönüşü antd'den); kartları Motion çizer. Deste, öne alma ve park açık istek üzerine:
 * - Modal: ortada; arkadaki kart yukarı kayar ve üstten küçülür, üst kenarı görünür.
 * - Drawer: sağda yüzen kutu (tüm uygulamalar paneli gibi, `FLOATING_SURFACE`); arkadaki kart sola
 *   kayar ve soldan küçülür, sol kenarı görünür. Kartlar sağdan kayarak gelir, sağa kayarak gider.
 * - Kartlar aynı boyda (menü öğesinin panel boyutu; orijinal `panelSizeToWidth`) ve aynı köşede
 *   (kart köşesi: tema paneli › Köşe yuvarlaklığı, squircle dahil).
 * - Arkadaki kartın görünen kenarı: üzerine gelince biraz daha dışarı çıkar ve adı ipucunda görünür;
 *   basınca kart öne gelir (açan / child ilişkisi değişmez). Arkadaki kartın içeriği kullanılamaz
 *   (`inert`), zemin rengine doğru soluktur; klavyede de Tab ile kenarına gelinir.
 * - Esc ve kartın kapat düğmesi öndeki kartı child'larıyla kapatır; kök kapanınca deste kapanır.
 * - Dışarı tıklamak desteyi ekranın sağ kenarına (gezinme sağdaysa, rafın üstüne düşmesin diye sol
 *   kenarına) çeker (park): perde kalkar, sayfa kullanılır, destenin yalnızca soluk bir şeridi
 *   görünür; üzerine gelince biraz çıkar, basınca geri gelir.
 * ------------------------------------------------------------------------------------------------- */

/**
 * Kartın genişliği (orijinal `panelSizeToWidth`: boyut × %33, en çok %80): okunur bir form için en
 * az genişlik, dar ekranda kenar boşluklarıyla tam genişlik.
 */
const WIDTH: Record<PanelSize, string> = {
  1: 'min(max(33vw, 30rem), 100vw - 1.5rem)',
  2: 'min(max(66vw, 44rem), 100vw - 1.5rem)',
  3: 'min(80vw, 100vw - 1.5rem)',
}

/**
 * Destenin dizilişi: arkadaki her kartın kayması (px; modalda yukarı, drawer'da sola) ve küçülmesi,
 * üzerine gelinince ek kayma, arkada görünen kart sayısı (gerisi solar).
 */
const STEP: Record<DeckPlace, { shift: number; scale: number; lift: number; shown: number }> = {
  modal: { shift: 18, scale: 0.05, lift: 20, shown: 3 },
  drawer: { shift: 28, scale: 0.04, lift: 20, shown: 3 },
}

/**
 * Park: deste küçülür (soldan, dikeyde ortada: üst çubuğa ve alt kenara binmez) ve ekranın sağ
 * kenarında yalnızca bir şeridi (px) soluk görünür; üzerine gelince biraz çıkar ve belirginleşir.
 */
const PARK = { scale: 0.7, sliver: 48, opacity: 0.35, peek: 24, hoverOpacity: 0.8 }

/** Kartların ve destenin hareketi: modal penceresinin açılış yayı (`SoftModal`). */
const MOVE: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 }
/** Kapanış: kısa ve hızlanan. */
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] }
/** Drawer kartının sağa kayarak çıkışı. */
const SLIDE_OUT: Transition = { duration: 0.24, ease: [0.4, 0, 1, 1] }

export const FormDeck = memo(function FormDeck() {
  const deck = useFormDeck()
  return (
    // Kapanan deste (ya da yerini yenisine bırakan) çıkışını oynayıp öyle kalkar
    <AnimatePresence>{deck && <DeckHost key={deck.key} deck={deck} />}</AnimatePresence>
  )
})

function DeckHost({ deck }: { deck: Deck }) {
  const move = useTransition(MOVE)
  const leave = useTransition(LEAVE)
  const slideOut = useTransition(SLIDE_OUT)
  const [isPresent, safeToRemove] = usePresence()
  // antd'ye "açık" bilgisi çıkış bitene kadar sürer
  const [shown, setShown] = useState(true)
  // Desteyi açan öğe (açılırken odaktaki): deste kapanınca odak ona döner
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const drawer = deck.place === 'drawer'
  const step = STEP[deck.place]
  const parked = deck.parked
  // Etkin deste: perde, odak tuzağı, Esc ve kaydırma kilidi; parkta ve kapanırken yok
  const live = isPresent && !parked
  const front = frontOf(deck)
  // Arkadaki kartların taşması (modalda üstte, drawer'da solda)
  const overhang = Math.min(deck.order.length - 1, step.shown) * step.shift

  // Park yeri: küçülmüş destenin sol kenarı (drawer'da en arkadaki kartın görünen kenarı) ekranın
  // sağ kenarından şerit kadar içeride. Ölçü antd kutusundan (dönüşümsüz), pencereyle güncellenir
  const box = useRef<HTMLDivElement>(null)
  const [parkX, setParkX] = useState(0)
  useLayoutEffect(() => {
    if (!parked) return
    const measure = () => {
      const host = box.current?.parentElement
      if (!host) return
      const rect = host.getBoundingClientRect()
      const left = rect.left - (drawer ? overhang * PARK.scale : 0)
      setParkX(window.innerWidth - PARK.sliver - left)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [parked, drawer, overhang])

  const hidden: TargetAndTransition = drawer ? { x: '110%' } : { opacity: 0, scale: 0.98, y: 12 }
  const target: TargetAndTransition = !isPresent
    ? drawer
      ? { x: '110%', transition: slideOut }
      : { opacity: 0, scale: 0.98, y: 6, transition: leave }
    : parked
      ? { x: parkX, y: 0, scale: PARK.scale, opacity: PARK.opacity, transition: move }
      : { x: 0, y: 0, scale: 1, opacity: 1, transition: move }

  const frontTitle = deckTitleOf(deck.cards.find((c) => c.key === front)?.form ?? '')

  return (
    <Modal
      open={shown}
      width={WIDTH[deck.size]}
      title={null}
      footer={null}
      closable={false}
      // Açılış / kapanış Motion'da (antd'ninki kapalı); perde solarak gelir, parkta ve kapanırken solar
      transitionName=""
      maskTransitionName=""
      keyboard={live}
      scrollLock={live}
      focusable={{ trap: live }}
      // Esc öndeki kartı kapatır; dışarı tıklamak desteyi kenara çeker
      onCancel={(e) => {
        if (e.type === 'keydown') {
          if (front) closeDeckCard(front)
          return
        }
        ;(document.activeElement as HTMLElement | null)?.blur()
        parkDeck(true)
      }}
      className={cn(
        'max-w-[calc(100vw-1.5rem)] pb-0',
        drawer ? 'top-3 me-3 ms-auto' : 'top-[5rem]',
      )}
      classNames={{
        // Parkta sayfa kullanılır (yalnızca deste dokunulur); kayan deste kaydırma çubuğu açmasın
        wrapper: cn('overflow-hidden', !live && 'pointer-events-none'),
        mask: cn(
          drawer && 'bg-foreground/10',
          'transition-opacity duration-[calc(240ms*var(--motion-time,1))] ease-out starting:opacity-0',
          !live &&
            'pointer-events-none opacity-0 duration-[calc(160ms*var(--motion-time,1))] ease-in',
        ),
      }}
      modalRender={() => (
        <MotionFlex
          ref={box}
          initial={hidden}
          animate={target}
          whileHover={
            parked && isPresent
              ? {
                  x: parkX - PARK.peek,
                  opacity: PARK.hoverOpacity,
                  transition: move,
                }
              : undefined
          }
          onAnimationComplete={() => {
            if (isPresent) return
            // Odak destedeyse ya da hiçbir yerde değilse açan öğeye döner (yenisi açıldıysa orada kalır)
            const active = document.activeElement
            if (
              opener?.isConnected &&
              (!active || active === document.body || box.current?.contains(active))
            )
              opener.focus({ preventScroll: true })
            setShown(false)
            safeToRemove?.()
          }}
          // Soldan küçülür (park); açılıştaki hafif büyüme de soldan
          className={cn(
            'pointer-events-auto relative block origin-left',
            drawer ? 'h-[calc(100dvh-1.5rem)]' : 'h-[min(calc(100dvh-6.5rem),56rem)]',
          )}
        >
          <AnimatePresence initial={false}>
            {deck.cards.map((c) => (
              <DeckCardView
                key={c.key}
                card={c}
                place={deck.place}
                order={deck.order.indexOf(c.key)}
                depth={deck.order.length - 1 - deck.order.indexOf(c.key)}
                parked={parked}
              />
            ))}
          </AnimatePresence>
          {/* Parkta destenin tamamı (arkadaki kartların taşan kenarları dahil) geri getirme düğmesi */}
          {parked && isPresent && frontTitle && (
            <Tip label={frontTitle.caption} placement="left">
              <Button
                type="text"
                aria-label={`Formu göster: ${frontTitle.caption}`}
                onClick={() => parkDeck(false)}
                style={drawer ? { insetInlineStart: -overhang } : { top: -overhang }}
                className={cn(
                  'absolute! z-[200] h-auto! w-auto! min-w-0 rounded-none bg-transparent p-0 hover:bg-transparent!',
                  drawer ? 'inset-y-0 end-0' : 'inset-x-0 bottom-0',
                )}
              />
            </Tip>
          )}
        </MotionFlex>
      )}
    />
  )
}

/**
 * Destedeki kart: başlık (ikon, ad, kapat), kayan form gövdesi, olaylar. Öndeyken kullanılır ve
 * odak ona gelir; arkadayken kayar, küçülür, solar ve kenarı öne alma düğmesidir.
 */
function DeckCardView({
  card,
  place,
  order,
  depth,
  parked,
}: {
  card: DeckCard
  place: DeckPlace
  /** Arkadan sırası (üst üste binme). */
  order: number
  /** Önden uzaklığı: 0 önde. */
  depth: number
  parked: boolean
}) {
  const move = useTransition(MOVE)
  const leave = useTransition(LEAVE)
  const slideOut = useTransition(SLIDE_OUT)
  const titleId = useId()
  const content = useRef<HTMLDivElement>(null)
  // Maket içerik (bugüne göre tarihler) kart kurulurken bir kez
  const [info] = useState(() => deckFormOf(card.form))
  const close = () => closeDeckCard(card.key)
  const run = useAppEvent(info?.caption ?? '', close)
  const drawer = place === 'drawer'
  const step = STEP[place]
  const behind = depth > 0
  // Öne gelince (açılınca, öne alınınca, parktan dönünce) odak kartın içine
  useEffect(() => {
    if (!behind && !parked) content.current?.focus({ preventScroll: true })
  }, [behind, parked])
  useEffect(() => {
    if (!info) closeDeckCard(card.key)
    // Yalnızca form yoksa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!info) return null

  const shift = depth * step.shift
  const at: TargetAndTransition = {
    x: drawer ? -shift : 0,
    y: drawer ? 0 : -shift,
    scale: 1 - depth * step.scale,
    opacity: depth > step.shown ? 0 : 1,
    transition: move,
  }
  const lift: TargetAndTransition = drawer
    ? { x: -(shift + step.lift), transition: move }
    : { y: -(shift + step.lift), transition: move }
  const Icon = info.icon ?? FileText
  const raise = (
    <Button
      type="text"
      aria-label={`Öne getir: ${info.caption}`}
      onClick={() => raiseDeckCard(card.key)}
      className="absolute! inset-0 z-10 h-auto! w-auto! min-w-0 rounded-none bg-background/55 p-0 transition-colors duration-[calc(200ms*var(--motion-time,1))] starting:bg-transparent hover:bg-background/20!"
    />
  )

  return (
    <MotionFlex
      vertical
      role="group"
      aria-labelledby={titleId}
      initial={drawer ? { x: '110%' } : { opacity: 0, scale: 0.97, y: 24 }}
      animate={at}
      exit={
        drawer
          ? { x: '110%', transition: slideOut }
          : { opacity: 0, scale: 0.98, y: 12, transition: leave }
      }
      whileHover={behind && !parked ? lift : undefined}
      style={{ zIndex: order }}
      className={cn(
        'absolute inset-0 flex overflow-hidden',
        FLOATING_SURFACE,
        drawer ? 'origin-left' : 'origin-top',
        depth > step.shown && 'pointer-events-none',
      )}
    >
      <Flex
        vertical
        ref={content}
        tabIndex={-1}
        {...({ inert: behind || parked } as Record<string, unknown>)}
        className="min-h-0 flex-1 outline-none"
      >
        <Flex align="center" gap={12} className="shrink-0 px-6 pt-5 pb-4">
          <TintIcon icon={Icon} />
          <Typography.Title
            level={2}
            id={titleId}
            title={info.caption}
            className="m-0 min-w-0 flex-1 truncate font-display text-lg font-semibold"
          >
            {info.caption}
          </Typography.Title>
          <Tip label={APP_FORM_TEXT.close}>
            <Button
              type="text"
              aria-label={APP_FORM_TEXT.close}
              icon={<X {...IC} size={18} />}
              onClick={close}
              className="size-9 shrink-0 text-muted"
            />
          </Tip>
        </Flex>
        {/* Gövde kartın içinde kayar; sütun sayısı kartın genişliğine göre */}
        <Scroll className="@container min-h-0 flex-1 px-6 pb-6">
          <AppFormBody form={info.form} onOpen={(id) => openDeckChild(card.key, id)} />
        </Scroll>
        {/* Olaylar talep formundaki sırayla (birincil önce) */}
        <Flex
          role="group"
          aria-label="Olaylar"
          className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-4"
        >
          {APP_EVENTS[info.form.kind].map(({ id, label, icon: EventIcon, primary }) => (
            <Button
              key={id}
              type={primary ? 'primary' : 'default'}
              icon={<EventIcon {...IC} />}
              onClick={() => run(id)}
            >
              {label}
            </Button>
          ))}
        </Flex>
      </Flex>
      {/* Arkadaki kart: zemin rengine doğru soluk örtü; görünen kenarına basınca öne gelir. Modalda
          kenar çıkınca başlık satırı görünür; drawer'da ad solda ipucunda (başlık kenarda kalmaz) */}
      {behind &&
        !parked &&
        (drawer ? (
          <Tip label={info.caption} placement="left">
            {raise}
          </Tip>
        ) : (
          raise
        ))}
    </MotionFlex>
  )
}
