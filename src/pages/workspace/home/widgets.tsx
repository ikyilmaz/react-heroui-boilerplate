import type { ComponentType } from 'react'
import type { WidgetId } from '@/pages/workspace/home/registry'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { DecidedWidget } from '@/pages/workspace/home/widgets/DecidedWidget'
import { DraftsWidget } from '@/pages/workspace/home/widgets/DraftsWidget'
import { FollowingWidget } from '@/pages/workspace/home/widgets/FollowingWidget'
import { FyiWidget } from '@/pages/workspace/home/widgets/FyiWidget'
import { NextWidget } from '@/pages/workspace/home/widgets/NextWidget'
import { QueueWidget } from '@/pages/workspace/home/widgets/QueueWidget'
import { StartWidget } from '@/pages/workspace/home/widgets/StartWidget'

/* -------------------------------------------------------------------------------------------------
 * Widget gövdeleri
 *
 * Katalogdaki (`registry.ts`) her widget'ın gövde bileşeni. Pano (`HomeBoard`) gövdeyi çerçevenin
 * (`WidgetFrame`) içine koyar ve `WidgetBodyProps`'u (kip, yoğunluk, satır bütçesi, genişlik) verir.
 * Gövdeler başlık içeriği çizmez; başlık, "Tümünü gör" ve "…" menüsü çerçevenin işi.
 * ------------------------------------------------------------------------------------------------- */

export const widgetBodies: Record<WidgetId, ComponentType<WidgetBodyProps>> = {
  next: NextWidget,
  queue: QueueWidget,
  following: FollowingWidget,
  drafts: DraftsWidget,
  start: StartWidget,
  fyi: FyiWidget,
  decided: DecidedWidget,
}
