import React from 'react';
import { LegalLayout, LegalSection } from './LegalLayout';

const Privacidad: React.FC = () => {
  return (
    <LegalLayout title="Política de Privacidad" updated="18 de julio, 2026 (borrador)">
      <p className="text-sm text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        Este documento es un <strong className="text-white">borrador de referencia</strong> escrito a partir de cómo
        funciona hoy el sistema (autenticación, base de datos, dependencias). No ha sido revisado por un abogado y no
        debe considerarse una política de privacidad definitiva ni vinculante hasta que reciba esa revisión, sobre
        todo por tratarse de una plataforma que maneja datos financieros.
      </p>

      <LegalSection title="1. Qué datos recopilamos">
        <p>Durante el registro y uso de la plataforma en fase Beta Cerrada, recopilamos:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Datos de cuenta: nombre de usuario, nombre real y contraseña (almacenada con hash, nunca en texto plano).</li>
          <li>Datos financieros que usted ingresa manualmente: cuentas, transacciones, inversiones y metas.</li>
          <li>Datos técnicos básicos de sesión (token de acceso) necesarios para mantenerlo autenticado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Cómo protegemos sus datos">
        <p>
          Las contraseñas se almacenan usando hashing (bcrypt), nunca en texto plano. El acceso a su cuenta se
          gestiona mediante tokens firmados (JWT). La base de datos no está expuesta directamente a internet.
          Más detalle técnico en nuestra página de <a className="text-theme-gold hover:underline" href="/seguridad">Seguridad</a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Con quién compartimos sus datos">
        <p>
          No vendemos ni compartimos sus datos financieros con terceros con fines comerciales o publicitarios.
          Al estar en fase Beta Cerrada, el acceso a los datos está limitado al equipo operador de la plataforma
          para fines de soporte y mantenimiento.
        </p>
      </LegalSection>

      <LegalSection title="4. Sus derechos">
        <p>
          Puede solicitar la exportación o eliminación de sus datos y de su cuenta en cualquier momento contactando
          al administrador de la plataforma. Al ser una Beta, algunos procesos de solicitud aún son manuales.
        </p>
      </LegalSection>

      <LegalSection title="5. Cambios a esta política">
        <p>
          Esta plataforma está en desarrollo activo. Esta política puede actualizarse a medida que se agreguen
          funcionalidades o se formalice la revisión legal. Recomendamos revisarla periódicamente.
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default Privacidad;
