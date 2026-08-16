import {
    Plus, Trash2, TrendingUp, Calendar, Save, X, Gift, Medal, Banknote, Trophy, Pencil,
    Fuel, ShoppingCart, Wifi, Shirt, Zap, Coffee, Gamepad2, Clapperboard, Film, User, Train,
    ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, PartyPopper, Coins, Home, GraduationCap,
    HeartPulse, ShoppingBag, Plane, CreditCard, TrendingDown, Briefcase, Bitcoin, Building2,
    PieChart, Wallet, Sparkles, Smartphone, Wrench, Users, HeartHandshake, HandCoins,
    Scissors, Landmark, Undo2, PawPrint, ShieldCheck, Receipt, Pizza, Laptop, Hammer,
    Siren, Car, HandHeart, Scale, Dumbbell, BookOpen, Droplets, LifeBuoy, LineChart,
    Tag, Percent, Umbrella
} from 'lucide-react';

export const getIncomeIcon = (name?: string) => {
    if (!name || typeof name !== 'string' || name.trim() === '') return TrendingUp;
    const n = name.toLowerCase();
    if (n.includes('regalo') || n.includes('gift') || n.includes('presente')) return Gift;
    if (n.includes('incentivo')) return Medal;
    if (n.includes('bono') || n.includes('bonificación')) return Trophy;
    if (n.includes('salario') || n.includes('sueldo') || n.includes('nomina')) return Banknote;
    if (n.includes('aporte') || n.includes('aportacion') || n.includes('colaboracion') || n.includes('ayuda') || n.includes('manutencion')) return Coins;
    if (n.includes('cumple') || n.includes('boda') || n.includes('fiesta') || n.includes('party')) return PartyPopper;
    if (n.includes('beca') || n.includes('estudio')) return GraduationCap;
    if (n.includes('freelance') || n.includes('extra') || n.includes('camaroneo')) return Zap;
    return TrendingUp;
};

export const getExpenseIcon = (name?: string) => {
    if (!name || typeof name !== 'string' || name.trim() === '') return Coffee;
    const n = name.toLowerCase();
    if (n.includes('gas') || n.includes('transporte') || n.includes('uber') || n.includes('taxi') || n.includes('gasolina')) return Fuel;
    if (n.includes('metro') || n.includes('tren')) return Train;
    if (n.includes('alimento') || n.includes('comida') || n.includes('super') || n.includes('jumbo')) return ShoppingCart;
    if (n.includes('wifi') || n.includes('internet') || n.includes('claro') || n.includes('celular') || n.includes('luz') || n.includes('electricidad') || n.includes('telefono') || n.includes('google') || n.includes('icloud') || n.includes('servicio')) return Wifi;
    if (n.includes('ropa') || n.includes('zara') || n.includes('compras') || n.includes('amazon') || n.includes('tienda')) return ShoppingBag;
    if (n.includes('entretenimiento') || n.includes('juego') || n.includes('ocio')) return Gamepad2;
    if (n.includes('streaming') || n.includes('netflix') || n.includes('tv') || n.includes('spotify') || n.includes('hbo') || n.includes('disney') || n.includes('prime') || n.includes('youtube')) return Clapperboard;
    if (n.includes('cine')) return Film;
    if (n.includes('alquiler') || n.includes('renta') || n.includes('casa') || n.includes('mantenimiento') || n.includes('vivienda') || n.includes('hogar')) return Home;
    if (n.includes('universidad') || n.includes('curso') || n.includes('taller') || n.includes('libro') || n.includes('educacion') || n.includes('educación')) return GraduationCap;
    if (n.includes('salud') || n.includes('medico') || n.includes('farmacia') || n.includes('gimnasio') || n.includes('gym') || n.includes('sfs') || n.includes('seguro') || n.includes('ars')) return HeartPulse;
    if (n.includes('viaje') || n.includes('vuelo') || n.includes('hotel') || n.includes('turismo')) return Plane;
    if (n.includes('tarjeta') || n.includes('prestamo') || n.includes('deuda')) return CreditCard;
    if (n.includes('regalo') || n.includes('gift') || n.includes('presente')) return Gift;
    if (n.includes('aporte') || n.includes('aportacion') || n.includes('donacion') || n.includes('ayuda')) return Coins;
    if (n.includes('cumple') || n.includes('party') || n.includes('fiesta')) return PartyPopper;
    if (n.includes('afp') || n.includes('inversion') || n.includes('ahorro')) return TrendingUp;
    return Coffee;
};

export const getInvestmentIcon = (name?: string) => {
    if (!name || typeof name !== 'string' || name.trim() === '') return PieChart;
    const n = name.toLowerCase();
    if (n.includes('ahorro') || n.includes('emergencia')) return Wallet;
    if (n.includes('bolsa') || n.includes('stock') || n.includes('fondo') || n.includes('sp500')) return TrendingUp;
    if (n.includes('cripto') || n.includes('btc') || n.includes('eth')) return Bitcoin;
    if (n.includes('casa') || n.includes('inmueble') || n.includes('terreno')) return Building2;
    if (n.includes('negocio') || n.includes('emprendimiento')) return Briefcase;
    return PieChart;
};


export const INCOME_CATEGORIES = [
    { id: 'Salario', icon: Banknote, label: 'Salario' },
    { id: 'Bonificación', icon: Trophy, label: 'Bono' },
    { id: 'Incentivos', icon: Medal, label: 'Incentivo' },
    { id: 'Freelance', icon: Zap, label: 'Freelance' },
    { id: 'Becas', icon: GraduationCap, label: 'Becas' },
    { id: 'Regalos', icon: Gift, label: 'Regalos' },
    { id: 'Aportaciones', icon: Coins, label: 'Aportes' },
    { id: 'Reembolsos', icon: Undo2, label: 'Reembolsos' },
    { id: 'Ajuste', icon: Pencil, label: 'Ajuste' },
    { id: 'Otro', icon: TrendingUp, label: 'Otro' },
    { id: 'Alquiler Cobrado', icon: Building2, label: 'Alquiler' },
    { id: 'Dividendos e Intereses', icon: LineChart, label: 'Dividendos' },
    { id: 'Venta de Artículos', icon: Tag, label: 'Ventas' },
    { id: 'Comisiones', icon: Percent, label: 'Comisiones' }
];

export const EXPENSE_CATEGORIES = [
    { id: 'Vivienda', icon: Home, label: 'Vivienda' },
    { id: 'Alimentos', icon: ShoppingCart, label: 'Alimentos' },
    { id: 'Transporte', icon: Fuel, label: 'Transporte' },
    { id: 'Servicios', icon: Wifi, label: 'Servicios' },
    { id: 'Educación', icon: GraduationCap, label: 'Educación' },
    { id: 'Salud', icon: HeartPulse, label: 'Salud' },
    { id: 'Compras', icon: ShoppingBag, label: 'Compras' },
    { id: 'Viajes', icon: Plane, label: 'Viajes' },
    { id: 'Entretenimiento', icon: Film, label: 'Ocio' },
    { id: 'Streaming', icon: Clapperboard, label: 'Streaming' },
    { id: 'Regalos', icon: Gift, label: 'Regalos' },
    { id: 'Aportaciones', icon: Coins, label: 'Ayudas' },
    { id: 'Deudas', icon: CreditCard, label: 'Deudas' },
    { id: 'Ajuste', icon: Pencil, label: 'Ajuste' },
    { id: 'General', icon: Coffee, label: 'General' },
    { id: 'Suscripciones IA', icon: Sparkles, label: 'Suscripciones IA' },
    { id: 'Videojuegos', icon: Gamepad2, label: 'Videojuegos' },
    { id: 'Telefonía', icon: Smartphone, label: 'Teléfono' },
    { id: 'Mantenimiento Vehicular', icon: Wrench, label: 'Vehículo' },
    { id: 'Ayuda Doméstica', icon: Users, label: 'Ayuda Doméstica' },
    { id: 'Ayuda Familiar', icon: HeartHandshake, label: 'Familia' },
    { id: 'Préstamos a Terceros', icon: HandCoins, label: 'Préstamos' },
    { id: 'Cuidado Personal', icon: Scissors, label: 'Cuidado Personal' },
    { id: 'Colecta Oficina', icon: Briefcase, label: 'Oficina' },
    { id: 'Eventos Sociales', icon: PartyPopper, label: 'Eventos' },
    { id: 'Ropa', icon: Shirt, label: 'Ropa' },
    { id: 'Comisiones Bancarias', icon: Landmark, label: 'Banco' },
    { id: 'Mascotas', icon: PawPrint, label: 'Mascotas' },
    { id: 'Seguros', icon: ShieldCheck, label: 'Seguros' },
    { id: 'Impuestos', icon: Receipt, label: 'Impuestos' },
    { id: 'Transporte Público', icon: Train, label: 'Transp. Público' },
    { id: 'Delivery', icon: Pizza, label: 'Delivery' },
    { id: 'Tecnología', icon: Laptop, label: 'Tecnología' },
    { id: 'Hogar y Reparaciones', icon: Hammer, label: 'Reparaciones' },
    { id: 'Multas y Recargos', icon: Siren, label: 'Multas' },
    { id: 'Estacionamiento y Peajes', icon: Car, label: 'Parqueo/Peajes' },
    { id: 'Donaciones', icon: HandHeart, label: 'Donaciones' },
    { id: 'Trámites Legales', icon: Scale, label: 'Trámites Legales' },
    { id: 'Gimnasio y Deporte', icon: Dumbbell, label: 'Gimnasio' },
    { id: 'Cursos y Libros', icon: BookOpen, label: 'Cursos y Libros' },
    { id: 'Lavandería', icon: Droplets, label: 'Lavandería' },
    { id: 'Imprevistos', icon: LifeBuoy, label: 'Imprevistos' }
];

// Agrupación temática de EXPENSE_CATEGORIES para el selector con buscador/grupos colapsables.
export const EXPENSE_CATEGORY_GROUPS: Record<string, string[]> = {
    'Esenciales': ['Vivienda', 'Alimentos', 'Transporte', 'Servicios', 'Salud', 'Educación'],
    'Estilo de vida': ['Compras', 'Viajes', 'Entretenimiento', 'Streaming', 'Videojuegos', 'Gimnasio y Deporte', 'Cursos y Libros'],
    'Vehículo y movilidad': ['Transporte Público', 'Mantenimiento Vehicular', 'Estacionamiento y Peajes'],
    'Suscripciones y cuentas': ['Suscripciones IA', 'Telefonía', 'Comisiones Bancarias'],
    'Familia y social': ['Ayuda Doméstica', 'Ayuda Familiar', 'Regalos', 'Eventos Sociales', 'Donaciones', 'Aportaciones'],
    'Finanzas': ['Préstamos a Terceros', 'Deudas', 'Ajuste', 'Impuestos', 'Seguros', 'Imprevistos'],
    'Otros': ['Mascotas', 'Cuidado Personal', 'Ropa', 'Lavandería', 'Colecta Oficina', 'Hogar y Reparaciones', 'Delivery', 'Tecnología', 'Multas y Recargos', 'General']
};

export const INVESTMENT_CATEGORIES = [
    { id: 'Ahorro', icon: Wallet, label: 'Ahorro' },
    { id: 'Fondo de Emergencia', icon: Umbrella, label: 'Fondo Emergencia' },
    { id: 'Bolsa', icon: TrendingUp, label: 'Bolsa / Fondos' },
    { id: 'Cripto', icon: Bitcoin, label: 'Criptomonedas' },
    { id: 'Bienes Raíces', icon: Building2, label: 'Inmuebles' },
    { id: 'Negocio', icon: Briefcase, label: 'Negocios' },
    { id: 'Otro', icon: PieChart, label: 'Otro' }
];

// Unified Metadata for UI Consumption
export const TRANSACTION_META = {
    income: {
        label: 'Ingreso',
        color: 'text-green-600',
        bg: 'bg-green-100',
        darkBg: 'dark:bg-green-900/20',
        darkColor: 'dark:text-green-400',
        icon: TrendingUp,
        categories: INCOME_CATEGORIES
    },
    expense: {
        label: 'Gasto',
        color: 'text-red-600',
        bg: 'bg-red-100',
        darkBg: 'dark:bg-red-900/20',
        darkColor: 'dark:text-red-400',
        icon: ShoppingCart,
        categories: EXPENSE_CATEGORIES
    },
    investment: {
        label: 'Inversión',
        color: 'text-blue-600',
        bg: 'bg-blue-100', // Or Purple if preferred: bg-purple-100
        darkBg: 'dark:bg-blue-900/20',
        darkColor: 'dark:text-blue-400',
        icon: PieChart,
        categories: INVESTMENT_CATEGORIES
    }
};

// Resuelve el ícono real de una transacción por id de categoría (fuente de verdad:
// el mismo array que alimenta el selector del modal). Si la categoría es texto libre
// histórico que no está en el array, cae al keyword-matching legacy; si tampoco matchea
// nada, usa un ícono neutro en vez de uno engañoso.
export const getCategoryIcon = (categoryId?: string, type?: 'income' | 'expense' | 'investment') => {
    const categories = type === 'income' ? INCOME_CATEGORIES
        : type === 'investment' ? INVESTMENT_CATEGORIES
        : EXPENSE_CATEGORIES;
    const match = categories.find(c => c.id === categoryId);
    if (match) return match.icon;

    if (type === 'income') return getIncomeIcon(categoryId);
    if (type === 'investment') return getInvestmentIcon(categoryId);
    if (type === 'expense') return getExpenseIcon(categoryId);
    return Tag;
};
