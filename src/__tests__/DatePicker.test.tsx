import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '../shared/components/ui/DatePicker';
import '@testing-library/jest-dom';

// Mock icons
jest.mock('lucide-react', () => ({
    Calendar: () => <div data-testid="icon-calendar" />,
    ChevronLeft: () => <div data-testid="icon-chevron-left" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
    X: () => <div data-testid="icon-x" />,
}));

describe('DatePicker Component', () => {
    const mockOnChange = jest.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    test('renders with label and initial value', () => {
        render(<DatePicker value="2026-01-15" onChange={mockOnChange} label="Select Date" />);
        expect(screen.getByText('Select Date')).toBeInTheDocument();
        expect(screen.getByText('15/01/2026')).toBeInTheDocument();
    });

    test('opens calendar on click', () => {
        render(<DatePicker value="" onChange={mockOnChange} />);
        const trigger = screen.getByText('Seleccionar fecha');
        fireEvent.click(trigger);

        // Check for month header (current month)
        const date = new Date();
        const monthName = date.toLocaleString('es-ES', { month: 'long' });
        // StartCase for month name match (DatePicker uses customized array: Enero, Febrero...)
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        expect(screen.getByText(`${months[date.getMonth()]} ${date.getFullYear()}`)).toBeInTheDocument();
    });

    test('selects a date correctly', () => {
        render(<DatePicker value="2026-01-01" onChange={mockOnChange} />);
        fireEvent.click(screen.getByText('01/01/2026')); // Open

        // Click on day 15
        const day15 = screen.getByText('15');
        fireEvent.click(day15);

        expect(mockOnChange).toHaveBeenCalledWith('2026-01-15');
    });

    test('navigates months', () => {
        render(<DatePicker value="2026-01-01" onChange={mockOnChange} />);
        fireEvent.click(screen.getByText('01/01/2026')); // Open

        const nextBtn = screen.getByTestId('icon-chevron-right').parentElement!;
        fireEvent.click(nextBtn);

        expect(screen.getByText('Febrero 2026')).toBeInTheDocument();
    });
});
