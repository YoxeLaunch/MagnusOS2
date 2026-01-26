import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CashFlow } from '../apps/finanza/pages/CashFlow';
import { DataProvider } from '../apps/finanza/context/DataContext';
import '@testing-library/jest-dom';

// Mock i18next
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: () => new Promise(() => { }),
        },
    }),
}));

// Mock icons
jest.mock('lucide-react', () => ({
    TrendingUp: () => <div data-testid="icon-trending-up" />,
    TrendingDown: () => <div data-testid="icon-trending-down" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Plus: () => <div data-testid="icon-plus" />,
    Pencil: () => <div data-testid="icon-pencil" />,
    Trash2: () => <div data-testid="icon-trash" />,
    X: () => <div data-testid="icon-x" />,
    Save: () => <div data-testid="icon-save" />,
    CreditCard: () => <div data-testid="icon-credit-card" />,
    Wallet: () => <div data-testid="icon-wallet" />,
    DollarSign: () => <div data-testid="icon-dollar-sign" />,
    PieChart: () => <div data-testid="icon-pie-chart" />,
    Activity: () => <div data-testid="icon-activity" />,
    Target: () => <div data-testid="icon-target" />,
    Gift: () => <div data-testid="icon-gift" />,
    Medal: () => <div data-testid="icon-medal" />,
    Banknote: () => <div data-testid="icon-banknote" />,
    Trophy: () => <div data-testid="icon-trophy" />,
    Fuel: () => <div data-testid="icon-fuel" />,
    ShoppingCart: () => <div data-testid="icon-shopping-cart" />,
    Wifi: () => <div data-testid="icon-wifi" />,
    Shirt: () => <div data-testid="icon-shirt" />,
    Zap: () => <div data-testid="icon-zap" />,
    Coffee: () => <div data-testid="icon-coffee" />,
    Gamepad2: () => <div data-testid="icon-gamepad2" />,
    Clapperboard: () => <div data-testid="icon-clapperboard" />,
    Film: () => <div data-testid="icon-film" />,
    User: () => <div data-testid="icon-user" />,
    Train: () => <div data-testid="icon-train" />,
    ArrowRightLeft: () => <div data-testid="icon-arrow-right-left" />,
    ArrowDownCircle: () => <div data-testid="icon-arrow-down-circle" />,
    ArrowUpCircle: () => <div data-testid="icon-arrow-up-circle" />,
    PartyPopper: () => <div data-testid="icon-party-popper" />,
    Coins: () => <div data-testid="icon-coins" />,
    Home: () => <div data-testid="icon-home" />,
    GraduationCap: () => <div data-testid="icon-graduation-cap" />,
    HeartPulse: () => <div data-testid="icon-heart-pulse" />,
    ShoppingBag: () => <div data-testid="icon-shopping-bag" />,
    Plane: () => <div data-testid="icon-plane" />,
    Printer: () => <div data-testid="icon-printer" />,
}));

// Mock AuthService
jest.mock('../shared/services/auth', () => ({
    authService: {
        getCurrentUser: jest.fn().mockReturnValue({ username: 'testuser', name: 'Test User' }),
    },
}));

// Smart Mock Fetch
global.fetch = jest.fn((url: string) => {
    if (url.includes('/api/rates/history')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    }
    if (url.includes('/api/rates')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ usd: 60.50, eur: 65.20 }),
        });
    }
    if (url.includes('daily-transactions')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    }
    if (url.includes('transactions')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    }
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
    });
}) as jest.Mock;

describe('CashFlow Component', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    test('renders CashFlow dashboard', async () => {
        render(
            <DataProvider>
                <CashFlow />
            </DataProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('cashflow:title')).toBeInTheDocument();
        });
        expect(screen.getByText('cashflow:incomes')).toBeInTheDocument();
        expect(screen.getByText('cashflow:expenses')).toBeInTheDocument();
    });

    test('switches tabs correctly', async () => {
        render(
            <DataProvider>
                <CashFlow />
            </DataProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('cashflow:expenses')).toBeInTheDocument();
        });

        const expensesTab = screen.getByText('cashflow:expenses');
        fireEvent.click(expensesTab);

        // Check selected state
        await waitFor(() => {
            expect(screen.getByRole('tab', { name: "cashflow:expenses" })).toHaveAttribute('aria-selected', 'true');
        });
    });
});
