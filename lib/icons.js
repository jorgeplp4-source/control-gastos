/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  lib/icons.js  —  Registro central de íconos · Control de Gastos           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  REGLA: importar SIEMPRE desde aquí, nunca directamente de phosphor.       ║
 * ║  Así cualquier cambio de ícono se hace en un único lugar.                  ║
 * ║                                                                              ║
 * ║  Stack: Next.js 15 + React 19 — componentes 'use client'                   ║
 * ║  Paquete: @phosphor-icons/react v2.1.10                                     ║
 * ║  Tree-shaking: automático con optimizePackageImports en next.config.js      ║
 * ║                                                                              ║
 * ║  Uso básico:                                                                 ║
 * ║    import { IconDashboard, IconEditar } from '../lib/icons'                 ║
 * ║    <IconDashboard size={20} weight="fill" color="var(--accent)" />          ║
 * ║                                                                              ║
 * ║  Uso en Server Components:                                                   ║
 * ║    import { FishIcon } from '@phosphor-icons/react/ssr'                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  TABLA DE MIGRACIÓN — Emoji anterior → Ícono Phosphor                      │
 * ├──────────┬────────────────────────────┬──────────────────┬─────────────────┤
 * │  EMOJI   │  NOMBRE PHOSPHOR           │  ALIAS LOCAL     │  DÓNDE SE USA   │
 * ├──────────┼────────────────────────────┼──────────────────┼─────────────────┤
 * │  📊      │  ChartBarIcon              │  IconDashboard   │  Nav, KPIs      │
 * │  ➕      │  PlusCircleIcon            │  IconRegistrar   │  Nav            │
 * │  📋      │  ListIcon                  │  IconListado     │  Nav, Rec.      │
 * │  ⚙️      │  GearIcon                  │  IconConfig      │  Nav, form      │
 * │  🔁      │  RepeatIcon                │  IconRecurrentes │  Nav, form      │
 * │  💰/👛   │  WalletIcon                │  IconBilletera   │  Header logo    │
 * │  ✕       │  XIcon                     │  IconCerrar      │  Modales        │
 * │  ⟳      │  SpinnerGapIcon            │  IconSpinner     │  Loading        │
 * │  🔍      │  MagnifyingGlassIcon       │  IconBuscar      │  Búsqueda       │
 * │  ✏️      │  PencilSimpleIcon          │  IconEditar      │  Tablas         │
 * │  🗑️      │  TrashIcon                 │  IconEliminar    │  Tablas         │
 * │  💾      │  FloppyDiskIcon            │  IconGuardar     │  Botones        │
 * │  ✅      │  CheckCircleIcon           │  IconExito       │  Confirmación   │
 * │  ✓       │  CheckIcon                 │  IconCheck       │  Checks inline  │
 * │  🔔      │  BellIcon                  │  IconCampana     │  Notif.         │
 * │  🔕      │  BellSlashIcon             │  IconSinCampana  │  Sin notif.     │
 * │  💡      │  LightbulbIcon             │  IconTip         │  Tips           │
 * │  ℹ️      │  InfoIcon                  │  IconInfo        │  Tooltips       │
 * │  ⚠️      │  WarningIcon               │  IconAdvertencia │  Alertas        │
 * │  →       │  ArrowRightIcon            │  IconArrowRight  │  Navegación     │
 * │  ←       │  ArrowLeftIcon             │  IconArrowLeft   │  Navegación     │
 * │  📅 🗓️   │  CalendarIcon              │  IconCalendario  │  Fechas         │
 * │  🏷️      │  TagsIcon                  │  IconEtiquetas   │  Categorías     │
 * │  🌍      │  GlobeIcon                 │  IconGlobo       │  Config región  │
 * │  🗣️      │  ChatIcon                  │  IconIdioma      │  Config idioma  │
 * │  🎨      │  PaletteIcon               │  IconTema        │  Apariencia     │
 * │  ☀️      │  SunIcon                   │  IconClaro       │  Tema claro     │
 * │  🌙      │  MoonIcon                  │  IconOscuro      │  Tema oscuro    │
 * │  💻      │  MonitorIcon               │  IconSistema     │  Tema sistema   │
 * │  👋      │  HandWavingIcon            │  IconBienvenida  │  Onboarding     │
 * │  🚀      │  RocketLaunchIcon          │  IconLanzar      │  CTA            │
 * │  ⚡      │  BoltIcon                  │  IconRapido      │  Quick-add      │
 * │  🏆      │  TrophyIcon                │  IconTrofeo      │  Rankings       │
 * │  💸      │  CurrencyDollarIcon        │  IconDinero      │  KPI total      │
 * │  📝      │  ReceiptIcon               │  IconRecibo      │  KPI registros  │
 * │  🔝      │  ArrowFatUpIcon            │  IconTop         │  KPI mayor      │
 * │  📈      │  TrendUpIcon               │  IconTendencia   │  Gráficos       │
 * │  👁️      │  EyeIcon                   │  IconVer         │  Password       │
 * │  🙈      │  EyeSlashIcon              │  IconOcultar     │  Password off   │
 * │  🔒      │  LockSimpleIcon            │  IconLock        │  Seguridad      │
 * │  ▾ ▸    │  CaretDownIcon/RightIcon   │  IconCaret*      │  Árbol categ.   │
 * │  ⇅       │  ArrowsDownUpIcon          │  IconOrdenar     │  Tabla orden    │
 * │  🤷      │  SmileyXEyesIcon           │  IconSinResultado│  Empty states   │
 * │  ≡       │  SquaresFourIcon           │  IconCascada     │  Mode toggle    │
 * └──────────┴────────────────────────────┴──────────────────┴─────────────────┘
 */

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
export {
  ChartBarIcon          as IconDashboard,
  PlusCircleIcon        as IconRegistrar,
  ListIcon              as IconListado,
  GearIcon              as IconConfig,
  RepeatIcon            as IconRecurrentes,
  SignOutIcon           as IconSalir,
  HouseIcon             as IconHome,
  ArrowLeftIcon         as IconArrowLeft,
  ArrowRightIcon        as IconArrowRight,
  ArrowUpIcon           as IconArriba,
  ArrowDownIcon         as IconAbajo,
  ArrowsDownUpIcon      as IconOrdenar,
  CaretDownIcon         as IconCaretDown,
  CaretRightIcon        as IconCaretRight,
} from '@phosphor-icons/react'

// ── ACCIONES ──────────────────────────────────────────────────────────────────
export {
  PencilSimpleIcon      as IconEditar,
  TrashIcon             as IconEliminar,
  FloppyDiskIcon        as IconGuardar,
  PlusIcon              as IconPlus,
  XIcon                 as IconCerrar,
  CheckIcon             as IconCheck,
  MagnifyingGlassIcon   as IconBuscar,
  CopyIcon              as IconCopiar,
  EyeIcon               as IconVer,
  EyeSlashIcon          as IconOcultar,
  DotsThreeIcon         as IconMas,
  FunnelIcon            as IconFiltros,
  SquaresFourIcon       as IconCascada,
} from '@phosphor-icons/react'

// ── ESTADO / FEEDBACK ─────────────────────────────────────────────────────────
export {
  CheckCircleIcon       as IconExito,
  WarningIcon           as IconAdvertencia,
  XCircleIcon           as IconError,
  InfoIcon              as IconInfo,
  SpinnerGapIcon        as IconSpinner,
  LockSimpleIcon        as IconLock,
  ShieldCheckIcon       as IconSeguro,
  SmileyXEyesIcon       as IconSinResultado,
} from '@phosphor-icons/react'

// ── NOTIFICACIONES ────────────────────────────────────────────────────────────
export {
  BellIcon              as IconCampana,
  BellSlashIcon         as IconSinCampana,
} from '@phosphor-icons/react'

// ── FINANZAS / GASTOS ─────────────────────────────────────────────────────────
export {
  CurrencyDollarIcon    as IconDinero,
  ReceiptIcon           as IconRecibo,
  WalletIcon            as IconBilletera,
  ChartPieIcon          as IconTorta,
  TrendUpIcon           as IconTendencia,
  TagIcon               as IconEtiqueta,
  TagsIcon              as IconEtiquetas,
  CalendarIcon          as IconCalendario,
  ClockIcon             as IconReloj,
  ArrowsClockwiseIcon   as IconRefresh,
  TrophyIcon            as IconTrofeo,
  ArrowFatUpIcon        as IconTop,
} from '@phosphor-icons/react'

// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
export {
  PaletteIcon              as IconTema,
  SunIcon                  as IconClaro,
  MoonIcon                 as IconOscuro,
  MonitorIcon              as IconSistema,
  GlobeIcon                as IconGlobo,
  ChatIcon                 as IconIdioma,
  CurrencyCircleDollarIcon as IconMoneda,
  DotsSixVerticalIcon      as IconDrag,
} from '@phosphor-icons/react'

// ── FORMULARIO / AUTH ─────────────────────────────────────────────────────────
export {
  EnvelopeIcon          as IconEmail,
  UserIcon              as IconUsuario,
} from '@phosphor-icons/react'

// ── ONBOARDING / MISC ─────────────────────────────────────────────────────────
export {
  HandWavingIcon        as IconBienvenida,
  LightbulbIcon         as IconTip,
  RocketLaunchIcon      as IconLanzar,
  BoltIcon              as IconRapido,
  QuestionIcon          as IconAyuda,
} from '@phosphor-icons/react'
