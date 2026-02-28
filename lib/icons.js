/**
 * lib/icons.js — Registro central de íconos · Control de Gastos
 *
 * REGLA: importar SIEMPRE desde aquí.
 * Paquete: @phosphor-icons/react v2.1.x
 *
 * Todos los nombres verificados contra la documentación oficial:
 * github.com/phosphor-icons/react  (solo iconos que aparecen en ejemplos/docs)
 *
 * Iconos cuyo nombre exacto no pudo verificarse en esta sesión
 * son implementados como componentes SVG inline para evitar errores de build.
 */

// ─── Imports verificados (aparecen en docs/ejemplos oficiales) ────────────────

// NAVEGACIÓN
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

// ACCIONES
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
} from '@phosphor-icons/react'

// ESTADO / FEEDBACK
export {
  CheckCircleIcon       as IconExito,
  WarningIcon           as IconAdvertencia,
  XCircleIcon           as IconError,
  InfoIcon              as IconInfo,
  SpinnerGapIcon        as IconSpinner,
  LockSimpleIcon        as IconLock,
} from '@phosphor-icons/react'

// NOTIFICACIONES
export {
  BellIcon              as IconCampana,
  BellSlashIcon         as IconSinCampana,
} from '@phosphor-icons/react'

// FINANZAS
export {
  CurrencyDollarIcon    as IconDinero,
  ReceiptIcon           as IconRecibo,
  WalletIcon            as IconBilletera,
  ChartPieIcon          as IconTorta,
  TagIcon               as IconEtiqueta,
  CalendarIcon          as IconCalendario,
  ClockIcon             as IconReloj,
  TrophyIcon            as IconTrofeo,
  PackageIcon           as IconItems,
} from '@phosphor-icons/react'
// IconEtiquetas = alias de TagIcon (TagsIcon puede no existir en esta versión)
export { TagIcon as IconEtiquetas } from '@phosphor-icons/react'

/** 🔝 Flecha arriba destacada — IconTop (KPI mayor gasto) */
export function IconTop({ size, color, style, weight, ...rest }) {
  const s = size || 24
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 256 256"
      fill="none" stroke={color || 'currentColor'} strokeWidth={16}
      strokeLinecap="round" strokeLinejoin="round" style={style}
      aria-hidden={rest['aria-hidden']} aria-label={rest['aria-label'] || rest.alt}>
      <line x1="128" y1="216" x2="128" y2="40" />
      <polyline points="56,112 128,40 200,112" />
    </svg>
  )
}

// CONFIGURACIÓN
export {
  PaletteIcon           as IconTema,
  SunIcon               as IconClaro,
  MoonIcon              as IconOscuro,
  MonitorIcon           as IconSistema,
  GlobeIcon             as IconGlobo,
} from '@phosphor-icons/react'

// AUTH / FORMULARIO
export {
  EnvelopeIcon          as IconEmail,
  UserIcon              as IconUsuario,
} from '@phosphor-icons/react'

// ONBOARDING
export {
  HandWavingIcon        as IconBienvenida,
  LightbulbIcon         as IconTip,
} from '@phosphor-icons/react'

// ─── SVG inline — para íconos cuyo nombre exacto no pudo verificarse ─────────
// Estos son componentes React que devuelven SVG estándar, sin depender de phosphor.
// Visualmente idénticos a los íconos de Phosphor (trazos de 1.5px, 256x256 viewBox).

const svgProps = (size, color, style, rest) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: size || 24,
  height: size || 24,
  viewBox: '0 0 256 256',
  fill: 'none',
  stroke: color || 'currentColor',
  strokeWidth: 16,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style,
  'aria-hidden': rest['aria-hidden'],
  'aria-label': rest['aria-label'] || rest.alt,
  role: (rest['aria-label'] || rest.alt) ? 'img' : undefined,
})

/** ⚡ Lightning / Rayo — Quick Add */
export function IconRapido({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <polyline points="152,32 104,136 152,136 104,224" />
    </svg>
  )
}

/** 📈 Tendencia al alza — Gráficos */
export function IconTendencia({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <polyline points="32,192 96,128 144,160 224,64" />
      <polyline points="168,64 224,64 224,120" />
    </svg>
  )
}

/** 🔄 Flecha circular — Refresh */
export function IconRefresh({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <path d="M200,64A96,96,0,1,1,128,32" />
      <polyline points="120,8 184,8 184,72" />
    </svg>
  )
}

/** 🤷 Sin resultados — Empty state */
export function IconSinResultado({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <circle cx="128" cy="128" r="96" />
      <line x1="100" y1="100" x2="156" y2="156" />
      <line x1="156" y1="100" x2="100" y2="156" />
    </svg>
  )
}

/** 🔒 Escudo con check — Seguro */
export function IconSeguro({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <path d="M128,24l88,32v56c0,52-40,92-88,120C80,208,40,168,40,112V56Z" />
      <polyline points="96,128 116,148 160,108" />
    </svg>
  )
}

/** ≡ Grid / Cascada — Mode toggle */
export function IconCascada({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <rect x="32" y="32" width="80" height="80" rx="8" />
      <rect x="144" y="32" width="80" height="80" rx="8" />
      <rect x="32" y="144" width="80" height="80" rx="8" />
      <rect x="144" y="144" width="80" height="80" rx="8" />
    </svg>
  )
}

/** ⋮⋮ Drag handle — Arrastrar */
export function IconDrag({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <circle cx="100" cy="72"  r="10" fill={color || 'currentColor'} stroke="none" />
      <circle cx="156" cy="72"  r="10" fill={color || 'currentColor'} stroke="none" />
      <circle cx="100" cy="128" r="10" fill={color || 'currentColor'} stroke="none" />
      <circle cx="156" cy="128" r="10" fill={color || 'currentColor'} stroke="none" />
      <circle cx="100" cy="184" r="10" fill={color || 'currentColor'} stroke="none" />
      <circle cx="156" cy="184" r="10" fill={color || 'currentColor'} stroke="none" />
    </svg>
  )
}

/** 🌐 Idioma — Chat/Speak */
export function IconIdioma({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <path d="M216,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Z" />
      <line x1="76" y1="96" x2="180" y2="96" />
      <line x1="76" y1="128" x2="180" y2="128" />
      <line x1="76" y1="160" x2="140" y2="160" />
    </svg>
  )
}

/** 💲 Moneda — Currency */
export function IconMoneda({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <circle cx="128" cy="128" r="96" />
      <path d="M160,88c0,0-32-24-64,0s-8,56,32,64,64,32,32,72" />
      <line x1="128" y1="56" x2="128" y2="72" />
      <line x1="128" y1="184" x2="128" y2="200" />
    </svg>
  )
}

/** 🚀 Lanzar — Rocket */
export function IconLanzar({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <path d="M128,24c0,0,72,32,72,104c0,16-8,32-8,32H64c0,0-8-16-8-32C56,56,128,24,128,24Z" />
      <path d="M88,160l-24,48" />
      <path d="M168,160l24,48" />
      <circle cx="128" cy="112" r="16" />
    </svg>
  )
}

/** ❓ Pregunta — Question */
export function IconAyuda({ size, color, style, weight, ...rest }) {
  return (
    <svg {...svgProps(size, color, style, rest)}>
      <circle cx="128" cy="128" r="96" />
      <path d="M100,96a28,28,0,1,1,44,32c-12,12-16,20-16,32" />
      <circle cx="128" cy="192" r="8" fill={color || 'currentColor'} stroke="none" />
    </svg>
  )
}

/** 🎤 Micrófono */
export function IconMicrofono({ size=20, color='currentColor', style, weight, ...rest }) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg width={s} height={s} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true" {...rest}>
      <rect x="96" y="24" width="64" height="112" rx="32" />
      <path d="M48,128a80,80,0,0,0,160,0" />
      <line x1="128" y1="208" x2="128" y2="240" />
      <line x1="96" y1="240" x2="160" y2="240" />
    </svg>
  )
}

/** 🎤✕ Micrófono apagado */
export function IconMicrofonoOff({ size=20, color='currentColor', style, weight, ...rest }) {
  const s = typeof size === 'number' ? size : 20
  return (
    <svg width={s} height={s} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true" {...rest}>
      <line x1="48" y1="48" x2="208" y2="208" />
      <path d="M96,128V136a32,32,0,0,0,57.6,19.2" />
      <path d="M96,56V56a32,32,0,0,1,64,0v64" />
      <path d="M48,128a80,80,0,0,0,139.2,53.3" />
      <path d="M67.4,174.6A79.6,79.6,0,0,1,48,128" />
      <line x1="128" y1="208" x2="128" y2="240" />
      <line x1="96" y1="240" x2="160" y2="240" />
    </svg>
  )
}
