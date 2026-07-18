import React from 'react';
import { LegalLayout, LegalSection } from './LegalLayout';

const Terminos: React.FC = () => {
  return (
    <LegalLayout title="Términos de Servicio" updated="18 de julio, 2026 (borrador)">
      <p className="text-sm text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        Este documento es un <strong className="text-white">borrador de referencia</strong> pensado para la fase de
        Beta Cerrada actual. No ha sido revisado por un abogado y no debe usarse como términos definitivos hasta
        recibir esa revisión.
      </p>

      <LegalSection title="1. Aceptación">
        <p>
          Al crear una cuenta en Magnus Services usted acepta estos términos. Si no está de acuerdo, no debe
          registrarse ni utilizar la plataforma.
        </p>
      </LegalSection>

      <LegalSection title="2. Naturaleza Beta del servicio">
        <p>
          La plataforma se encuentra en fase de Beta Cerrada. Esto significa que puede haber interrupciones,
          cambios de funcionalidad sin previo aviso, y que los datos podrían reiniciarse durante el desarrollo.
          No se garantiza disponibilidad continua del servicio.
        </p>
      </LegalSection>

      <LegalSection title="3. Simulaciones y proyecciones no son asesoría financiera">
        <p>
          Las proyecciones, simulaciones (incluyendo la Simulación Monte Carlo) y métricas mostradas en el
          dashboard son herramientas informativas e ilustrativas basadas en los datos que usted ingresa. No
          constituyen asesoría financiera, de inversión, fiscal o legal. Cualquier decisión financiera es
          responsabilidad exclusiva del usuario.
        </p>
      </LegalSection>

      <LegalSection title="4. Responsabilidad de la cuenta">
        <p>
          Usted es responsable de mantener la confidencialidad de su contraseña y de toda actividad realizada
          desde su cuenta.
        </p>
      </LegalSection>

      <LegalSection title="5. Uso indebido">
        <p>
          No está permitido usar la plataforma para actividades ilegales, intentar vulnerar su seguridad, o
          acceder a datos de otros usuarios sin autorización.
        </p>
      </LegalSection>

      <LegalSection title="6. Terminación">
        <p>
          Nos reservamos el derecho de suspender o cerrar cuentas durante la fase Beta, especialmente en caso de
          uso indebido o como parte del cierre natural del programa de pruebas.
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default Terminos;
