import {
    Plus, Trash2, TrendingUp, Calendar, Save, X, Gift, Medal, Banknote, Trophy, Pencil,
    Fuel, ShoppingCart, Wifi, Shirt, Zap, Coffee, Gamepad2, Clapperboard, Film, User, Train,
    ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, PartyPopper, Coins, Home, GraduationCap,
    HeartPulse, ShoppingBag, Plane, CreditCard, TrendingDown, Briefcase, Bitcoin, Building2,
    PieChart, Wallet
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
    { id: 'Otro', icon: TrendingUp, label: 'Otro' }
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
    { id: 'Entretenimiento', icon: Gamepad2, label: 'Ocio' },
    { id: 'Streaming', icon: Clapperboard, label: 'Streaming' },
    { id: 'Regalos', icon: Gift, label: 'Regalos' },
    { id: 'Aportaciones', icon: Coins, label: 'Ayudas' },
    { id: 'Deudas', icon: CreditCard, label: 'Deudas' },
    { id: 'General', icon: Coffee, label: 'General' }
];

export const INVESTMENT_CATEGORIES = [
    { id: 'Ahorro', icon: Wallet, label: 'Ahorro' },
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
