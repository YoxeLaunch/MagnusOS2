import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  section?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string;
  showDetails: boolean;
}

export class ProvidenceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    correlationId: '',
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const correlationId = `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      hasError: true,
      error,
      correlationId
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PROVIDENCE_FX_INTELLIGENCE_SHIELD] Exception caught in section "${this.props.section || 'General'}":`, {
      correlationId: this.state.correlationId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: '',
      showDetails: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const sectionName = this.props.section || 'Módulo Cuantitativo';
      const errorMessage = this.state.error?.message || 'Error inesperado de renderizado';

      return (
        <div className="w-full my-4 p-6 bg-neutral-950/90 border border-rose-900/40 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    Fallo Aislado en {sectionName}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-semibold">
                    AISLAMIENTO ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  El escudo de resiliencia de Providence FX contuvo este fallo local para impedir la caída del HUD y del resto del ecosistema financiero.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border border-neutral-700 shadow-sm"
            >
              <RotateCcw size={14} />
              <span>Reintentar Módulo</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">CORRELACIÓN: {this.state.correlationId}</span>
              <span className="text-rose-400 font-semibold truncate max-w-md">{errorMessage}</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
            >
              {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{this.state.showDetails ? 'Ocultar diagnóstico técnico' : 'Ver diagnóstico técnico del fallo'}</span>
            </button>

            {this.state.showDetails && (
              <div className="mt-2 p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 space-y-2">
                <div>
                  <strong className="text-slate-300 block">Stack trace:</strong>
                  <pre className="text-rose-300/90 whitespace-pre-wrap">{this.state.error?.stack || 'No disponible'}</pre>
                </div>
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong className="text-slate-300 block">Component tree:</strong>
                    <pre className="text-slate-500 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
