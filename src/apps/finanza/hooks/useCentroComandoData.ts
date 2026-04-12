import { useState, useEffect } from 'react';
import { apiFetch } from '../../../shared/utils/apiFetch';

export type CentroComandoMode = 'anual' | 'mensual';

export interface CicloSummary {
  cicloId: string;
  label: string;
  entradas: number;
  gastos: number;
  invertido: number;
  ahorroNeto: number;
  tasaAhorro: number;
}

export interface InvCategoria {
  name: string;
  value: number;
}

export interface TasaItem {
  cicloId: string;
  label: string;
  tasaAhorro: number;
}

export interface AnualData {
  patrimonioNeto: number;
  totalEntradas: number;
  totalGastos: number;
  totalInvertido: number;
  liquidezActual: number;
  tasaAhorroPromedio: number;
  burnRateDiario: number;
  runwayDias: number;
  ciclosPorMes: CicloSummary[];
  inversionPorCategoria: InvCategoria[];
  tasaAhorroPorCiclo: TasaItem[];
}

export interface GastoCategoria {
  category: string;
  total: number;
}

export interface MensualData {
  cicloId: string;
  cicloLabel: string;
  entradas: number;
  gastos: number;
  invertido: number;
  ahorroNeto: number;
  tasaAhorro: number;
  burnRateDiario: number;
  runwayDias: number;
  cashGlobal: number;
  inversionAcumulada: number;
  gastosPorCategoria: GastoCategoria[];
  comparativoCicloAnterior: {
    deltaEntradas: number;
    deltaGastos: number;
    deltaAhorro: number;
  };
}

export interface CicloOption {
  id: string;
  label: string;
  start: string;
  end: string;
}

export const useCentroComandoData = (mode: CentroComandoMode, cicloId?: string, year: number = new Date().getFullYear()) => {
  const [ciclosDisponibles, setCiclosDisponibles] = useState<CicloOption[]>([]);
  const [anualData, setAnualData] = useState<AnualData | undefined>(undefined);
  const [mensualData, setMensualData] = useState<MensualData | undefined>(undefined);
  const [loadingCiclos, setLoadingCiclos] = useState<boolean>(true);
  const [loadingAnual, setLoadingAnual] = useState<boolean>(false);
  const [loadingMensual, setLoadingMensual] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoadingCiclos(true);
    apiFetch(`/api/centro-comando/ciclos?year=${year}`).then(r => r.json()).then(data => {
      if (mounted) {
        setCiclosDisponibles(data);
        setLoadingCiclos(false);
      }
    }).catch(console.error);
    return () => { mounted = false; };
  }, [year]);

  useEffect(() => {
    let mounted = true;
    if (mode === 'anual') {
      setLoadingAnual(true);
      apiFetch(`/api/centro-comando/anual?year=${year}`).then(r => r.json()).then(data => {
        if (mounted) {
          setAnualData(data);
          setLoadingAnual(false);
        }
      }).catch(console.error);
    }
    return () => { mounted = false; };
  }, [mode, year]);

  useEffect(() => {
    let mounted = true;
    if (mode === 'mensual' && cicloId) {
      setLoadingMensual(true);
      apiFetch(`/api/centro-comando/mensual?cicloId=${cicloId}`).then(r => r.json()).then(data => {
        if (mounted) {
          setMensualData(data);
          setLoadingMensual(false);
        }
      }).catch(console.error);
    }
    return () => { mounted = false; };
  }, [mode, cicloId]);

  return {
    ciclosDisponibles,
    anualData,
    mensualData,
    isLoading: loadingCiclos || (mode === 'anual' ? loadingAnual : loadingMensual),
  };
};
