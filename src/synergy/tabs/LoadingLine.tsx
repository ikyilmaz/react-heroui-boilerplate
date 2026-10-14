import { Flex } from 'antd'

/*
 * Yükleme çizgisi (açık istek üzerine): çalışma alanının ekranlarında, sekme şeridinin hemen
 * altında, bölmenin üst kenarında ince bir çizgi. Yanıtın ne zaman geleceği belli değil (süresi
 * belirsiz): çizginin içinde birincil renkte bir parıltı soldan sağa sürekli kayar
 * (`animate-shimmer`, `--motion-time` ile; animasyon kapalıyken yalnızca soluk çizgi). Formlar bu
 * çizgiyle gelir (`Pane` › `placeholder`: süre dolunca söner, form belirir).
 */
export function LoadingLine({ label }: { label: string }) {
  return (
    <Flex
      role="progressbar"
      aria-label={label}
      aria-busy
      // Bölmenin üst kenarında, kartlarla aynı hizada (bölmenin iç payı); yer kaplamaz
      className="pointer-events-none absolute inset-x-3 top-0 z-10 block h-[3px] overflow-hidden rounded-full bg-accent/15"
    >
      <Flex className="block h-full w-2/5 animate-shimmer rounded-full bg-linear-to-r from-transparent via-accent to-transparent" />
    </Flex>
  )
}
