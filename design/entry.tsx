/*
 * Synergy UI V2 tasarım paketi girişi: `window.SynergyUI`. Claude Design tuvali ve tasarım sistemi
 * önizlemeleri bunu takar (`npm run build:design` → design/dist). React ve ReactDOM sayfadan gelir.
 */
import './design.css'
import {
  Alert,
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Menu,
  Pagination,
  Segmented,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import { StatusTag, TintIcon as TintIconBase } from '@/synergy/ant/ui'
import { EmptyNote, GroupLabel, SearchField as SearchFieldBase } from '@/synergy/ant/parts'
import { GridCard, GridFooter, ViewSwitch as ViewSwitchBase } from '@/synergy/ant/grid'
import { FormField } from '@/synergy/FormFields'
import { ItemsTable, PropertiesList } from '@/synergy/DetailTiles'
import * as Lucide from './lucide-fluent'
import type { GridView } from '@/synergy/ant/grid'
import {
  Agenda,
  AppFrame,
  AppsWidget,
  BandTools,
  Board,
  Clock,
  DataGrid,
  DecisionDialog,
  EditCard,
  EditFab,
  FormCard,
  Greeting,
  HeaderBand,
  Icon,
  ModuleNav,
  PaneDivider,
  ProcessList,
  Root,
  SidePanel,
  StatusTabs,
  Weather,
  Widget,
} from './components'

/** Aramalı alan (değer sabit; tuvalde gösterim için). */
function SearchField({
  value = '',
  label = 'Ara',
  className,
}: {
  value?: string
  label?: string
  className?: string
}) {
  return <SearchFieldBase value={value} onChange={() => {}} label={label} className={className} />
}
/** Tablo / kart seçici. */
function ViewSwitch({ view = 'table' }: { view?: GridView }) {
  return <ViewSwitchBase view={view} onChange={() => {}} />
}
/** İkon rozeti; `icon` lucide adıyla (Fluent çizer). */
function TintIcon({ icon = 'Info', size = 40 }: { icon?: string; size?: number }) {
  const C = (Lucide as unknown as Record<string, typeof Lucide.Info>)[icon] ?? Lucide.Info
  return <TintIconBase icon={C as never} size={size} />
}

export {
  // Kök ve kabuk
  Root,
  AppFrame,
  Icon,
  // Ekran yapı taşları
  Agenda,
  PaneDivider,
  ProcessList,
  DataGrid,
  HeaderBand,
  FormCard,
  SidePanel,
  Board,
  Widget,
  Greeting,
  Clock,
  Weather,
  AppsWidget,
  EditFab,
  ModuleNav,
  BandTools,
  StatusTabs,
  EditCard,
  DecisionDialog,
  // Uygulamanın küçük parçaları
  StatusTag,
  SearchField,
  ViewSwitch,
  TintIcon,
  GroupLabel,
  EmptyNote,
  GridCard,
  GridFooter,
  FormField,
  ItemsTable,
  PropertiesList,
  // antd (Synergy temasıyla)
  Alert,
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Menu,
  Pagination,
  Segmented,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
}
