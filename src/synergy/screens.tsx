import { useEffect } from 'react'
import { Navigate, useRoutes, type Location, type RouteObject } from 'react-router'
import { AppWindow, FileText, House, Users, Workflow, type LucideIcon } from 'lucide-react'
import {
  boxProcessCaption,
  findApp,
  findBox,
  findProcess,
  findRequest,
  processCaption,
} from '@/synergy/shared/workflowData'
import { START_PATH, normalizePath } from '@/synergy/shared/workspace'
import { findModule } from '@/synergy/hr/modules'
import { useScreen } from '@/synergy/tabs/context'
import { StartPage } from '@/synergy/StartPage'
import { WorkflowPage } from '@/synergy/WorkflowPage'
import { AppPage, RequestPage } from '@/synergy/DetailPage'
import { HrPage } from '@/synergy/hr/HrPage'

/* -------------------------------------------------------------------------------------------------
 * Ekranlar: çalışma alanındaki her ekran (sekme ya da yan yana sekmenin bir yarısı) bu rotaları
 * kendi adresiyle çizer (`useRoutes(…, location)`); sayfalar `useParams` / `Link` / `useNavigate`'i
 * olduğu gibi kullanır, gezinme kendi ekranında kalır (Workspace.tsx ekrana kendi gezginini verir).
 * Sekmenin adı, ikonu ve ipucu adresten (`screenMeta`); adresten okunan ekranın geçerliliği
 * (`isValidPath`: silinmiş talep, kaldırılmış uygulama atlanır).
 * ------------------------------------------------------------------------------------------------- */

/** Bilinmeyen adres: ekran kapanır. */
function Gone() {
  const screen = useScreen()
  useEffect(() => screen?.close(), [screen])
  return null
}

const ROUTES: RouteObject[] = [
  // Başlangıç (orijinaldeki "Başlangıç" paneli)
  { path: START_PATH, element: <StartPage /> },
  // İş Akış Yönetimi: kutu → süreç → talepler; boş durum: kutu / süreç seçili değil
  { path: '/is-akislari', element: <WorkflowPage /> },
  { path: '/is-akislari/gecmis', element: <Navigate to="/is-akislari/gecmis-onaylar" replace /> },
  // Tek rota (isteğe bağlı süreç): kutuya girip ilk sürece geçerken sayfa yeniden kurulmaz
  { path: '/is-akislari/:box/:processId?', element: <WorkflowPage /> },
  // Talep ayrıntısı (Flow Viewer): listenin üstünde ya da kendi sekmesinde (ikisi aynı yerde
  // çizilir: "Ayrı sekmeye taşı"da form yeniden kurulmaz)
  { path: '/is-akislari/:box/:processId/:requestId', element: <RequestPage /> },
  { path: '/talepler/:requestId', element: <RequestPage /> },
  // Menü uygulamalarının formları
  { path: '/uygulamalar/:appId', element: <AppPage /> },
  // İnsan Kaynakları: modül listesi ve kayıt düzenleme (orijinal modules/hr)
  { path: '/insan-kaynaklari', element: <HrPage /> },
  { path: '/insan-kaynaklari/:module/:recordId?', element: <HrPage /> },
  { path: '*', element: <Gone /> },
]

/** Ekranın sayfası (kendi adresiyle). */
export function ScreenRoutes({ location }: { location: Partial<Location> }) {
  return useRoutes(ROUTES, location)
}

/** Formun sunucudan gelişini bekleyen ekran (iskelet): talep ve menü uygulaması. */
export function isFormPath(path: string) {
  const [head, , , c] = normalizePath(path).split('/').slice(1)
  return head === 'talepler' || head === 'uygulamalar' || (head === 'is-akislari' && !!c)
}

/** Adres hâlâ açılabilir mi (adresten okunurken; ör. silinmiş talep, modal'da açılan uygulama). */
export function isValidPath(path: string) {
  const [head, a, b, c, ...rest] = normalizePath(path).split('/').slice(1)
  if (rest.length) return false
  switch (head) {
    case 'calisma-alani':
      return !a
    case 'is-akislari':
      if (!a) return true
      if (a === 'gecmis') return !b
      if (!findBox(a)) return false
      if (!b) return true
      return !!findProcess(b) && (!c || !!findRequest(c))
    case 'talepler':
      return !!findRequest(a) && !b
    case 'uygulamalar': {
      const app = findApp(a)
      return !!app && !app.openOn && !b
    }
    case 'insan-kaynaklari':
      return !a || (!!findModule(a) && !c)
    default:
      return false
  }
}

export interface ScreenMeta {
  name: string
  icon: LucideIcon
  /** İpucu: yerin tam yolu (konum çubuğunun yerine). */
  tip: string
}

const SEP = ' › '

/** Sekmenin adı, ikonu ve ipucu (adresten). */
export function screenMeta(path: string): ScreenMeta {
  const [head, a, b, c] = normalizePath(path).split('/').slice(1)
  if (head === 'calisma-alani') return { name: 'Başlangıç', icon: House, tip: 'Başlangıç' }
  if (head === 'talepler' || (head === 'is-akislari' && c)) {
    const r = findRequest(head === 'talepler' ? a : c)
    const p = r && findProcess(r.processId)
    if (!r || !p) return { name: 'Talep', icon: FileText, tip: 'Talep' }
    const form = `${p.form} · ${r.no}`
    const box = head === 'is-akislari' ? findBox(a) : undefined
    return {
      name: p.form,
      icon: p.icon,
      tip: box ? [box.title, processCaption(p), form].join(SEP) : form,
    }
  }
  if (head === 'is-akislari') {
    const root = 'İş Akış Yönetimi'
    const box = findBox(a)
    if (!box) return { name: root, icon: Workflow, tip: root }
    const p = findProcess(b)
    if (!p) return { name: box.title, icon: box.icon, tip: [root, box.title].join(SEP) }
    const caption = boxProcessCaption(box, p)
    return { name: caption, icon: p.icon, tip: [root, box.title, caption].join(SEP) }
  }
  if (head === 'uygulamalar') {
    const app = findApp(a)
    const name = app?.caption ?? 'Uygulama'
    return { name, icon: app?.icon ?? AppWindow, tip: name }
  }
  if (head === 'insan-kaynaklari') {
    const root = 'İnsan Kaynakları'
    const m = findModule(a)
    return m
      ? { name: m.label, icon: m.icon, tip: [root, m.label].join(SEP) }
      : { name: root, icon: Users, tip: root }
  }
  return { name: path, icon: FileText, tip: path }
}
