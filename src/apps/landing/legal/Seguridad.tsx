import React from 'react';
import { LegalLayout, LegalSection } from './LegalLayout';

const Seguridad: React.FC = () => {
  return (
    <LegalLayout title="Seguridad" updated="18 de julio, 2026 (borrador)">
      <p className="text-sm text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        Este resumen describe las medidas de seguridad efectivamente implementadas hoy en la plataforma. Se
        actualizará conforme evolucione el sistema.
      </p>

      <LegalSection title="Contraseñas">
        <p>
          Las contraseñas nunca se almacenan en texto plano: se procesan con hashing (bcrypt) antes de guardarse
          en la base de datos.
        </p>
      </LegalSection>

      <LegalSection title="Autenticación de sesión">
        <p>
          El acceso a la plataforma se controla con tokens firmados (JWT), en lugar de cookies de sesión sin
          verificar.
        </p>
      </LegalSection>

      <LegalSection title="Protección de la API">
        <p>
          Las peticiones al servidor pasan por límites de frecuencia (rate limiting) para mitigar abuso o
          intentos de fuerza bruta, y por cabeceras HTTP de seguridad estándar.
        </p>
      </LegalSection>

      <LegalSection title="Base de datos">
        <p>
          La base de datos PostgreSQL no está expuesta directamente a internet: solo es accesible desde la red
          interna donde corre la aplicación.
        </p>
      </LegalSection>

      <LegalSection title="Alcance de esta página">
        <p>
          Esta página describe controles técnicos existentes, no es una certificación de cumplimiento (por
          ejemplo, no implica certificación SOC 2 ni ISO 27001). Si maneja información sensible, le recomendamos
          esperar confirmación de una revisión de seguridad formal antes de depender de la plataforma en
          producción con datos reales.
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default Seguridad;
