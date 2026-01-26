import {
  LayoutDashboard, Book, FlaskConical, Coins, Dumbbell, User,
  TrendingUp, Gem, Wallet, Landmark, PiggyBank, Briefcase,
  Brain, Sun, Smile, Sparkles, Zap, Lightbulb,
  Heart, Activity, Dna, Stethoscope, Microscope, ShieldPlus, Quote,
  ClipboardList
} from 'lucide-react';
import { NavItem, ViewState, StrategyScenario } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: ViewState.DASHBOARD, label: 'Panel Principal', icon: LayoutDashboard },
  { id: ViewState.WAR_ROOM, label: 'Sala de Mentorías', icon: Book },
  { id: ViewState.LABORATORY, label: 'Laboratorio', icon: FlaskConical },
  { id: ViewState.MINDSET, label: 'Mentalidad Fénix', icon: User },
];

export const SCENARIOS: StrategyScenario[] = [
  {
    id: 'boss',
    title: 'Conflicto: Robo de Crédito Laboral',
    description: 'Tu superior directo ha presentado tu proyecto como propio en la reunión trimestral.',
    options: [
      {
        type: 'emotional',
        label: 'Reacción Emocional',
        description: 'Confrontación directa inmediata durante o después de la reunión.',
        outcome: {
          immediate: 'Satisfacción momentánea de ira.',
          longTerm: 'Etiquetado como conflictivo. Posible despido.',
          law: 'Ley #1: Nunca eclipses a tus superiores.'
        }
      },
      {
        type: 'passive',
        label: 'Pasividad',
        description: 'No hacer nada y esperar que "la verdad salga a la luz".',
        outcome: {
          immediate: 'Evitas el conflicto.',
          longTerm: 'Te conviertes en una herramienta desechable. Falta de respeto.',
          law: 'Ausencia de Virtù (Maquiavelo).'
        }
      },
      {
        type: 'strategic',
        label: 'Estrategia Soberana',
        description: 'Validar al jefe públicamente, pero filtrar sutilmente evidencias de tu autoría a sus superiores.',
        outcome: {
          immediate: 'Mantienes tu posición y seguridad.',
          longTerm: 'Tu jefe depende de ti, los superiores conocen tu valor real.',
          law: 'Ley #7: Logra que otros trabajen por ti, pero no dejes de llevarte los laureles.'
        }
      }
    ]
  },
  {
    id: 'negotiation',
    title: 'Negociación: Contrato Bajo',
    description: 'Un cliente potencial ofrece un 40% menos de tu tarifa estándar.',
    options: [
      {
        type: 'emotional',
        label: 'Ofensa',
        description: 'Rechazar airadamente la oferta por considerarla un insulto.',
        outcome: {
          immediate: 'Pierdes el cliente.',
          longTerm: 'Reputación de difícil trato.',
          law: 'Ley #4: Di siempre menos de lo necesario.'
        }
      },
      {
        type: 'passive',
        label: 'Aceptación',
        description: 'Aceptar por miedo a perder el ingreso.',
        outcome: {
          immediate: 'Ingreso rápido pero bajo.',
          longTerm: 'Estableces un precedente de bajo valor. Burnout.',
          law: 'Ley #19: Sepa con quién está tratando.'
        }
      },
      {
        type: 'strategic',
        label: 'Silencio Táctico',
        description: 'Pausa prolongada. Mirada estoica. "Esa cifra no hace viable el proyecto con mis estándares".',
        outcome: {
          immediate: 'Incomodidad que fuerza al otro a mejorar la oferta.',
          longTerm: 'Respeto profesional y tarifa justa.',
          law: 'El poder del silencio y la retirada.'
        }
      }
    ]
  }
];

export const DAILY_QUOTE = {
  text: "Nunca eclipses a tus superiores. Haz siempre que quienes están por encima de ti se sientan cómodamente superiores. Al intentar impresionarlos, no vayas demasiado lejos mostrando tus talentos.",
  author: "Robert Greene",
  source: "Ley #1"
};

export const PROFILE_ICONS = [
  // Economy
  { id: 'Coins', icon: Coins, label: 'Wealth' },
  { id: 'TrendingUp', icon: TrendingUp, label: 'Growth' },
  { id: 'Gem', icon: Gem, label: 'Value' },
  { id: 'Wallet', icon: Wallet, label: 'Assets' },
  { id: 'Landmark', icon: Landmark, label: 'Heritage' },
  { id: 'PiggyBank', icon: PiggyBank, label: 'Savings' },
  { id: 'Briefcase', icon: Briefcase, label: 'Business' },

  // Mental Health
  { id: 'Brain', icon: Brain, label: 'Mindset' },
  { id: 'Sun', icon: Sun, label: 'Clarity' },
  { id: 'Smile', icon: Smile, label: 'Positivity' },
  { id: 'Sparkles', icon: Sparkles, label: 'Magic' },
  { id: 'Zap', icon: Zap, label: 'Energy' },
  { id: 'Lightbulb', icon: Lightbulb, label: 'Ideas' },

  // Medicine
  { id: 'Heart', icon: Heart, label: 'Life' },
  { id: 'Activity', icon: Activity, label: 'Health' },
  { id: 'Dna', icon: Dna, label: 'Genetics' },
  { id: 'FlaskConical', icon: FlaskConical, label: 'Science' },
  { id: 'Stethoscope', icon: Stethoscope, label: 'Care' },
  { id: 'Microscope', icon: Microscope, label: 'Focus' },
  { id: 'ShieldPlus', icon: ShieldPlus, label: 'Immunity' },
];

import { CurriculumModule } from './types';

export const CURRICULUM_2026: CurriculumModule[] = [
  {
    id: 'm1',
    month: 'ENERO',
    title: 'Psicología del Logro',
    mentor: 'Brian Tracy',
    description: 'Establece los cimientos mentales para el éxito absoluto.',
    checklist: {
      reading: 'Maximum Achievement - Brian Tracy',
      habit: 'Dieta Mental: 0 Quejas por 21 días',
      mission: 'Definir por escrito tus 10 metas anuales'
    },
    locked: false,
    status: 'active'
  },
  {
    id: 'm2',
    month: 'FEBRERO',
    title: 'Gestión del Tiempo',
    mentor: 'Irene Albacete',
    description: 'Domina el recurso más escaso: tu tiempo.',
    checklist: {
      reading: 'Tráguese ese Sapo - Brian Tracy',
      habit: 'Planificación nocturna del día siguiente',
      mission: 'Aplicar Ley de Pareto (80/20) a tu agenda'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm3',
    month: 'MARZO',
    title: '48 Leyes del Poder',
    mentor: 'Robert Greene',
    description: 'Navega las dinámicas de poder en cualquier entorno.',
    checklist: {
      reading: 'Las 48 Leyes del Poder (Leyes 1-16)',
      habit: 'Ocultar tus intenciones (Poker Face)',
      mission: 'Identificar el juego de poder en tu entorno'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm4',
    month: 'ABRIL',
    title: 'Maestría',
    mentor: 'Robert Greene',
    description: 'Descubre tu tarea de vida y alcanza la excelencia.',
    checklist: {
      reading: 'Maestría - Robert Greene',
      habit: 'Práctica Deliberada (1hr/día de Deep Work)',
      mission: 'Mapa de tu "Life Task" personal'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm5',
    month: 'MAYO',
    title: 'Liderazgo Femenino',
    mentor: 'Pilar Sousa', // Was Melinka, check schedule. May = Pilar.
    description: 'Liderazgo desde la esencia y la autenticidad.',
    checklist: {
      reading: 'Recurso Privado - Pilar',
      habit: 'Networking Estratégico Semanal',
      mission: 'Mentorear a alguien de tu equipo'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm6',
    month: 'JUNIO',
    title: 'Inteligencia Emocional',
    mentor: 'Irene Albacete',
    description: 'Control y canalización de emociones para el liderazgo.',
    checklist: {
      reading: 'Inteligencia Emocional - Daniel Goleman',
      habit: 'Journaling Emocional Diario',
      mission: 'Resolución asertiva de 3 conflictos'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm7',
    month: 'JULIO',
    title: 'Estrategia de Guerra',
    mentor: 'Robert Greene',
    description: 'Aplica tácticas militares a la vida civil y negocios.',
    checklist: {
      reading: '33 Estrategias de Guerra',
      habit: 'Análisis de Enemigos (Competencia)',
      mission: 'Crear Plan de Guerra para Q3'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm8',
    month: 'AGOSTO',
    title: 'Ventas de Alto Nivel',
    mentor: 'Brian Tracy',
    description: 'El arte de persuadir y cerrar tratos.',
    checklist: {
      reading: 'Psicología de Ventas',
      habit: '10 Prospectos Diarios',
      mission: 'Cerrar venta High-Ticket'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm9',
    month: 'SEPTIEMBRE',
    title: 'Seducción',
    mentor: 'Robert Greene',
    description: 'Influencia sutil y encanto personal.',
    checklist: {
      reading: 'El Arte de la Seducción',
      habit: 'Mejora de Imagen Personal',
      mission: 'Auditoría de Carisma'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm10',
    month: 'OCTUBRE',
    title: 'Naturaleza Humana',
    mentor: 'Robert Greene',
    description: 'Decodifica por qué la gente hace lo que hace.',
    checklist: {
      reading: 'Leyes de la Naturaleza Humana',
      habit: 'Observación sin Juicio',
      mission: 'Análisis de Sombras Personales'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm11',
    month: 'NOVIEMBRE',
    title: 'Finanzas Imperiales',
    mentor: 'Pilar Sousa',
    description: 'Estructuración y protección de patrimonio.',
    checklist: {
      reading: 'El Inversor Inteligente',
      habit: 'Revisión Diaria de Finanza App',
      mission: 'Reestructuración de Portafolio'
    },
    locked: true,
    status: 'locked'
  },
  {
    id: 'm12',
    month: 'DICIEMBRE',
    title: 'Legado',
    mentor: 'Victoria Shapar',
    description: 'Consolidación del año y planificación del siguiente.',
    checklist: {
      reading: 'El Hombre en Busca de Sentido',
      habit: 'Gratitud Radical',
      mission: 'Plan Maestro 2027'
    },
    locked: true,
    status: 'locked'
  }
];