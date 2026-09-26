import { ArrowDownUp, CloudDownload, PencilLine, Rows3, ScrollText, Wand2 } from 'lucide-react'
import type { DataGridVariant } from './DataGridVariant'

export const DATA_GRID_VARIANTS: DataGridVariant[] = [
  {
    id: 'row',
    label: 'Satır düzenleme',
    description:
      "editing.mode: 'row' — düzenle / kaydet (Enter) / vazgeç (Escape), filtre satırı, arama, çoklu seçim ve silme onayı.",
    icon: <Rows3 size={16} aria-hidden />,
  },
  {
    id: 'cell',
    label: 'Hücre düzenleme',
    description:
      "editing.mode: 'cell' + showEditorAlways — düzenleyiciler hep açık, her değişiklik alandan çıkınca kaydedilir.",
    icon: <PencilLine size={16} aria-hidden />,
  },
  {
    id: 'sorting',
    label: 'Sıralama ve filtre',
    description:
      "sorting.mode: 'multiple' (Shift+tık ekler, Ctrl/⌘+tık çıkarır), applyFilter: 'onClick' (araç çubuğundaki düğmeyle), boolean ve lookup filtreleri, 'Arasında' işlemi.",
    icon: <ArrowDownUp size={16} aria-hidden />,
  },
  {
    id: 'remote',
    label: 'Uzak veri',
    description:
      'CustomStore + remoteOperations — filtre, sıralama ve sayfalama sunucuya load() seçenekleri olarak gider.',
    icon: <CloudDownload size={16} aria-hidden />,
  },
  {
    id: 'events',
    label: 'Olaylar ve API',
    description:
      "onRowUpdating ile doğrulama (boş ad reddedilir), olay günlüğü ve instance metotlarını çağıran dxButton'lar.",
    icon: <ScrollText size={16} aria-hidden />,
  },
  {
    id: 'auto',
    label: 'Otomatik kolonlar',
    description: 'columns verilmeden: kolonlar, başlıklar ve tipler ilk satırdan çıkarılır.',
    icon: <Wand2 size={16} aria-hidden />,
  },
]
