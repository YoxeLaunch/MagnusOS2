import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalLayoutProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ title, updated, children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neural text-gray-300 antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-theme-gold transition-colors mb-10"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver al inicio
        </button>

        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wide">
          <span className="material-symbols-outlined text-sm">warning</span>
          Borrador &mdash; pendiente de revisión legal
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: {updated}</p>

        <div className="prose-legal space-y-8 leading-relaxed text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export const LegalSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2 className="font-display text-xl font-bold text-white mb-3">{title}</h2>
    <div className="space-y-3 text-gray-400">{children}</div>
  </section>
);
