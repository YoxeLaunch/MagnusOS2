<div align="center">
  <h1>🌌 MagnusOS2</h1>
  <p><strong>Plataforma Integral de Gestión Empresarial, Financiera y Operativa</strong></p>

  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</div>

<hr />

## 📖 Sobre el Proyecto

**MagnusOS2** es un entorno operativo unificado construido para la administración, la gestión financiera avanzada y la integración de inteligencia artificial. Diseñado como un "Sistema Operativo" web, permite a los usuarios alternar entre múltiples módulos interconectados con una experiencia de uso sumamente fluida.

### ✨ Características Principales

* 💰 **Sistema Financiero:** Control de flujo de caja, presupuestos, inversiones, y modelado avanzado de proyecciones (incluyendo simulaciones de Monte Carlo).
* 🤖 **Mentores de IA (Laboratorio):** Integración profunda con modelos de Inteligencia Artificial que fungen como mentores y analistas financieros.
* 🛡️ **Panel Soberano:** Control administrativo total, métricas de hardware, auditoría en tiempo real y seguridad estricta basada en JWT.
* 🌐 **Internacionalización (i18n):** Sistema multi-idiomas listo para usarse.
* 🎨 **UI/UX Moderna:** Diseño inmersivo y responsivo.

---

## 🚀 Requisitos Previos

Asegúrate de tener instalado en tu sistema:
* [Node.js](https://nodejs.org/) v18 o superior.
* [NPM](https://www.npmjs.com/) v9 o superior.

---

## ⚙️ Instalación y Configuración

1. **Clona el repositorio** e ingresa a la carpeta:
   ```bash
   git clone https://github.com/YoxeLaunch/MagnusOS2.git
   cd MagnusOS2
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura el entorno:**  
   Duplica el archivo `.env.example`, renómbralo a `.env`, y llena los valores necesarios (API Keys, secretos JWT, etc.).

4. **Inicia el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```
   > 💡 *La plataforma se abrirá localmente con Vite.*

---

## 🛠️ Scripts Disponibles

En el directorio del proyecto, puedes correr:

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el entorno de desarrollo en Vite. |
| `npm run build` | Compila y optimiza la aplicación para producción. |
| `npm run preview` | Sirve la carpeta `dist` para probar la versión de producción. |
| `npm run lint` | Analiza el código buscando errores de sintaxis y estilo (ESLint). |
| `npm run type-check` | Verifica los tipos de TypeScript sin compilar. |
| `npm test` | Ejecuta la suite de pruebas unitarias usando Jest. |

---

## 📂 Arquitectura y Funcionamiento

### 1. Nivel de Infraestructura
MagnusOS2 está diseñado para una operación autónoma, segura y con requerimientos exactos para el mejor desempeño.

```mermaid
graph TD
    %% Definición de Nodos principales
    User(["👤 Usuario"]) -.->|"HTTP REST / WebSocket"| LB["Proxy / Nginx"]
    
    subgraph "Frontend SPA"
        React["React 18 + Vite"]
        React -->|"Módulo"| Finanzas["💰 finanza"]
        React -->|"Módulo"| Magnus["⚙️ magnus / admin"]
        React -->|"Módulo"| Auditor["📊 auditor"]
    end
    
    LB --> React
    LB -->|"Rutas API"| Backend
    
    subgraph "Backend Node.js"
        Backend["Express.js / Socket.IO"]
        JWT["Middleware Auth JWT"]
        ORM["Sequelize ORM"]
        
        Backend <--> JWT
        Backend <--> ORM
    end
    
    subgraph "Servicios Aislados (Contenedores Externos)"
        DB[("PostgreSQL 16")]
        AI["🧠 Ollama Local LLM"]
        Sandbox["📦 Python Sandbox"]
    end
    
    ORM <-->|"TCP Interno"| DB
    Backend <-->|"API"| AI
    Backend <-->|"Ejecución"| Sandbox

    %% Estilos aesthetic
    style User fill:#fff,stroke:#333,stroke-width:2px,color:#000
    style Backend fill:#339933,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    style AI fill:#ff8c00,stroke:#333,stroke-width:2px,color:#fff
```

### 2. Flujo Financiero (Ledger de Doble Entrada)
El motor principal del sistema garantiza la integridad matemática (Suma = 0) bajo un estricto proceso.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant R as React Frontend
    participant E as Node.js API
    participant DB as Base de Datos
    
    U->>R: Inicia Gasto / Inversión
    R->>E: POST /api/ledger/transactions (con JWT)
    activate E
    E->>E: Valida Seguridad JWT
    E->>E: Valida Invariante Contable (Db = Cr)
    E->>DB: BEGIN TRANSACTION
    activate DB
    E->>DB: Escribe Transacción Principal
    E->>DB: Inserta líneas contables (Unidad en centavos)
    E->>DB: Actualiza caché y balance (Account)
    E->>DB: COMMIT
    deactivate DB
    E-->>R: JSON Confirmación y Totales
    deactivate E
    R-->>U: Renderiza Dashboard (Recharts + Framer)
```

### 3. Distribución de Pantallas

```mermaid
graph LR
    A["src"] --> B("apps")
    A --> C("shared")
    B --> F("finanza:<br>Gestor de control de flujo")
    B --> M("magnus:<br>Panel y Lab IA")
    C --> CO("components:<br>Botones, layouts")
    C --> UT("utils:<br>Matemáticas, fechas")
```

---

## 🤝 Contribuyendo

Si te interesa colaborar o adaptar esta infraestructura a tus necesidades:
1. Haz un **Fork** interactivo del repositorio.
2. Crea tu propia rama: `git checkout -b feature/MiNuevaIdea`
3. Sube tus cambios a GitHub: `git push origin feature/MiNuevaIdea`
4. Abre un **Pull Request**.

---

## ✒️ Autor y Créditos

Este poderoso OS Financiero y Administrativo fue creado e ideado por:
* **YoxeLaunch** - Arquitecto, Desarrollador Principal y Creador Original.
* GitHub: [@YoxeLaunch](https://github.com/YoxeLaunch)

<br>
<div align="center">
  <p><strong>Construido para el control total ⚜️ — Diseñado por YoxeLaunch</strong></p>
  <sub>© 2026 MagnusOS2 Project</sub>
</div>
