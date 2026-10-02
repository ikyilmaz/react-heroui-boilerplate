/* Tasarım paketinde lucide-react yerine: aynı adlar Fluent ikonlarını çizer (design/vite.config.ts alias). */
import { forwardRef, type SVGProps } from 'react'
import { FLUENT } from './fluent-paths'

export type LucideIcon = ReturnType<typeof make>
export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
}

function make(name: string) {
  const C = forwardRef<SVGSVGElement, LucideProps>(function FluentIcon(
    { size = 16, strokeWidth: _sw, absoluteStrokeWidth: _a, ...rest },
    ref,
  ) {
    const p = FLUENT[name]
    return (
      <svg ref={ref} width={size} height={size} viewBox="0 0 20 20" fill="currentColor" {...rest}>
        {p?.r.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    )
  })
  C.displayName = name
  return C
}

export const AppWindow = make('AppWindow')
export const ArrowDownAZ = make('ArrowDownAZ')
export const ArrowDownUp = make('ArrowDownUp')
export const ArrowLeft = make('ArrowLeft')
export const ArrowLeftRight = make('ArrowLeftRight')
export const ArrowRight = make('ArrowRight')
export const ArrowUpRight = make('ArrowUpRight')
export const Bell = make('Bell')
export const Blocks = make('Blocks')
export const Boxes = make('Boxes')
export const Building2 = make('Building2')
export const Calendar = make('Calendar')
export const Check = make('Check')
export const CheckCheck = make('CheckCheck')
export const ChevronDown = make('ChevronDown')
export const ChevronLeft = make('ChevronLeft')
export const ChevronRight = make('ChevronRight')
export const CircleDot = make('CircleDot')
export const CirclePlay = make('CirclePlay')
export const Cloud = make('Cloud')
export const CloudDrizzle = make('CloudDrizzle')
export const CloudFog = make('CloudFog')
export const CloudLightning = make('CloudLightning')
export const CloudRain = make('CloudRain')
export const CloudSnow = make('CloudSnow')
export const CloudSun = make('CloudSun')
export const Columns2 = make('Columns2')
export const CornerUpLeft = make('CornerUpLeft')
export const Droplets = make('Droplets')
export const Ellipsis = make('Ellipsis')
export const ExternalLink = make('ExternalLink')
export const FilePlus2 = make('FilePlus2')
export const FileText = make('FileText')
export const Files = make('Files')
export const FilterX = make('FilterX')
export const Flag = make('Flag')
export const FolderOpen = make('FolderOpen')
export const Forward = make('Forward')
export const Gauge = make('Gauge')
export const GraduationCap = make('GraduationCap')
export const GripVertical = make('GripVertical')
export const History = make('History')
export const Hourglass = make('Hourglass')
export const House = make('House')
export const Inbox = make('Inbox')
export const Info = make('Info')
export const Landmark = make('Landmark')
export const Layers = make('Layers')
export const LayoutDashboard = make('LayoutDashboard')
export const LayoutGrid = make('LayoutGrid')
export const LayoutTemplate = make('LayoutTemplate')
export const ListOrdered = make('ListOrdered')
export const Maximize2 = make('Maximize2')
export const Megaphone = make('Megaphone')
export const Menu = make('Menu')
export const MessageCircle = make('MessageCircle')
export const Moon = make('Moon')
export const MousePointerClick = make('MousePointerClick')
export const Palette = make('Palette')
export const PanelRightClose = make('PanelRightClose')
export const PanelRightOpen = make('PanelRightOpen')
export const Paperclip = make('Paperclip')
export const PenLine = make('PenLine')
export const Pencil = make('Pencil')
export const Plus = make('Plus')
export const RefreshCw = make('RefreshCw')
export const RotateCcw = make('RotateCcw')
export const Rows3 = make('Rows3')
export const Save = make('Save')
export const Search = make('Search')
export const SendHorizontal = make('SendHorizontal')
export const Settings2 = make('Settings2')
export const ShieldCheck = make('ShieldCheck')
export const ShoppingBag = make('ShoppingBag')
export const ShoppingCart = make('ShoppingCart')
export const Sparkles = make('Sparkles')
export const SquareArrowOutUpRight = make('SquareArrowOutUpRight')
export const Star = make('Star')
export const Sun = make('Sun')
export const Timer = make('Timer')
export const Trash2 = make('Trash2')
export const User = make('User')
export const Users = make('Users')
export const UsersRound = make('UsersRound')
export const Wand2 = make('Wand2')
export const Wind = make('Wind')
export const Workflow = make('Workflow')
export const X = make('X')
export const Award = make('Award')
export const BarChart3 = make('BarChart3')
export const BellRing = make('BellRing')
export const BookOpen = make('BookOpen')
export const Briefcase = make('Briefcase')
export const CalendarDays = make('CalendarDays')
export const Car = make('Car')
export const ClipboardCheck = make('ClipboardCheck')
export const Clock = make('Clock')
export const Clock3 = make('Clock3')
export const FileCog = make('FileCog')
export const FileSignature = make('FileSignature')
export const Hand = make('Hand')
export const KeyRound = make('KeyRound')
export const Receipt = make('Receipt')
export const SlidersHorizontal = make('SlidersHorizontal')
export const StickyNote = make('StickyNote')
export const TreePalm = make('TreePalm')
export const UserCog = make('UserCog')
export const Wallet = make('Wallet')
export const Wrench = make('Wrench')
