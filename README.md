# Sistema Magnus - Platforma Integral

Plataforma unificada para la gestión financiera, administrativa y operativa.

## Requisitos Previos

- Node.js v18+
- NPM v9+

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

### Scripts Disponibles

- \`npm run dev\`: Inicia el servidor de desarrollo Vite.
- \`npm run build\`: Compila la aplicación para producción.
- \`npm run preview\`: Vista previa de la build de producción.
- \`npm run lint\`: Ejecuta ESLint para analizar el código.
- \`npm run type-check\`: Verifica tipos de TypeScript.
- \`npm test\`: Ejecuta pruebas unitarias con Jest.

### Guía de Estilo

- **Linter**: Se utiliza ESLint con reglas estándar de React y TypeScript.
- **Formato**: Prettier está integrado para el formateo automático.
- **Commits**: Usar inglés o español consistente.

## Estructura del Proyecto

\`\`\`mermaid
graph TD
    src --> apps
    src --> shared
    apps --> finanza
    apps --> magnus
    shared --> components
    shared --> hooks
    shared --> utils
    shared --> context
\`\`\`

## Testing

El proyecto utiliza **Jest** y **React Testing Library**.
Para ejecutar pruebas y ver cobertura:

\`\`\`bash
npm test -- --coverage
\`\`\`

## Internacionalización (i18n)

Los textos se encuentran en \`src/shared/locales\`.
- \`es.json\`: Español (Default)
- \`en.json\`: Inglés

## Contribución

1. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
2. Commit de cambios (`git commit -m 'Add nueva funcionalidad'`)
3. Push a la rama (`git push origin feature/nueva-funcionalidad`)
4. Abrir Pull Request
