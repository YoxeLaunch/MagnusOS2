<div align="center">
  <h1>🌌 MagnusOS2</h1>
  <p><strong>Financial Operating System — Plataforma Soberana de Gestión Financiera, Inteligencia Macroeconómica y Control Patrimonial</strong></p>

  <img src="https://img.shields.io/badge/React-18.2-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.2-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.3-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-20_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-29.1-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Ubuntu-26.04_LTS-E95420?style=for-the-badge&logo=ubuntu&logoColor=white" alt="Ubuntu" />
  <br />
  <img src="https://img.shields.io/badge/Technical_Health_Score-98%2F100-34D399?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Technical Health Score" />
  <img src="https://img.shields.io/badge/Security_Level-Hardened_(Phase_II_Certified)-10B981?style=for-the-badge&logo=shield&logoColor=white" alt="Security Classification" />
  <img src="https://img.shields.io/badge/MECE_Engine-Phase_1C_Active_(Merkle_Audit)-06B6D4?style=for-the-badge&logo=databricks&logoColor=white" alt="MECE Engine" />
  <img src="https://img.shields.io/badge/SB_Banking_Engine-Dynamic_Cutoff_(SB_v2_Canonical)-8B5CF6?style=for-the-badge&logo=bank&logoColor=white" alt="SB Banking Engine" />
  <img src="https://img.shields.io/badge/Tests-91%2F91_Passing_(100%25_Green)-brightgreen?style=for-the-badge&logo=jest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Ledger-Double--Entry_(PostgreSQL_Triggers)-6366F1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Ledger Invariant" />
  <img src="https://img.shields.io/badge/Durability-synchronous__commit=on-blue?style=for-the-badge&logo=databricks&logoColor=white" alt="Durability" />
</div>

<hr />

## 📖 Sobre el Proyecto

**MagnusOS2** es un **Financial Operating System** personal de grado institucional y uso privado: un entorno operativo web full-stack diseñado para el control soberano de finanzas, administración de patrimonio e inteligencia de mercado macroeconómico.

El sistema opera bajo un principio inquebrantable: **el Ledger contable de doble entrada es la única fuente oficial de verdad financiera (Single Source of Truth - SOT)**. Toda cifra proyectada, balance de cuenta o métrica patrimonial se calcula o reconcilia matemáticamente contra el libro mayor, con integridad garantizada a nivel relacional en PostgreSQL y almacenamiento monetario exacto en unidades enteras menores (`BigInt` / centavos).

> 🏛️ **Filosofía Soberana:** El dato nunca abandona la infraestructura propia. Todo reside en la red soberana privada (**Providence Local Network**), con durabilidad transaccional estricta, aislamiento hermético de servicios y sin telemetría de terceros.
>
> 🛡️ **Clasificación de Seguridad & Resiliencia:** `[PRODUCCIÓN / HARDENED / PHASE II VALIDATED / DYNAMIC SB CANONICAL]`  
> 📑 **Informe de Auditoría Dinámica SB:** [`docs/audits/BANKING_DYNAMIC_PERIOD_AUDIT.md`](docs/audits/BANKING_DYNAMIC_PERIOD_AUDIT.md)  
> 📑 **Informe Final de Remediación (Fase II):** [`docs/audit/PHASE2_FINAL_REMEDIATION_REPORT.md`](docs/audit/PHASE2_FINAL_REMEDIATION_REPORT.md)  
> 🗺️ **Mapa de Fuente de Verdad Financiera:** [`docs/PHASE2_FINAL_SOURCE_OF_TRUTH_MAP.md`](docs/PHASE2_FINAL_SOURCE_OF_TRUTH_MAP.md)  
> 📘 **Manual de Despliegue en Producción:** [`docs/PHASE2_FINAL_PRODUCTION_RUNBOOK.md`](docs/PHASE2_FINAL_PRODUCTION_RUNBOOK.md)  
> 📂 **Archivo de Auditorías & Revisiones:** [`docs/audit/`](docs/audit/) y [`docs/audits/`](docs/audits/)

---

## 🗺️ Línea de Evolución del Sistema por Etapas (Roadmap & Milestones)

MagnusOS2 se ha consolidado a través de etapas de madurez ingenieril sucesivas, transformándose de un gestor de finanzas personales a un sistema operativo financiero con radar macroeconómico institucional:

```mermaid
flowchart LR
    Fase1["ETAPA I: Génesis y Ledger Base (Partida doble inicial, Multi-divisa, UI React)"]
    Fase2["ETAPA II: Endurecimiento y SOT (Ledger Único, Triggers SQL, BigInt centavos, Leases)"]
    Fase3["ETAPA III (ACTUAL): Convergencia y Radar (Motor MECE 1C, Providence FX, MICM, SB v2 Dinámico)"]
    Fase4["ETAPA IV: Wealth AI y Predictive (Simulaciones econométricas, Modelos predictivos)"]

    Fase1 ==>|"Refactorización Estructural"| Fase2
    Fase2 ==>|"Infraestructura Blindada"| Fase3
    Fase3 -.->|"Próxima Frontera"| Fase4

    style Fase1 fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#fff
    style Fase2 fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    style Fase3 fill:#1e1b4b,stroke:#6366f1,stroke-width:3px,color:#fff
    style Fase4 fill:#312e81,stroke:#a855f7,stroke-dasharray: 5 5,stroke-width:2px,color:#fff
```

### Síntesis de las Etapas del Sistema

* **Etapa I — Génesis y Ledger Base:** Establecimiento del esquema de partida doble, catálogo de cuentas maestras y panel de control web personal.
* **Etapa II — Endurecimiento Institucional y Reconciliación (Hardening & Remediation):** Etapa de consolidación arquitectónica en la que se eliminó la fragmentación legacy, se activaron triggers atómicos en PostgreSQL, se adoptó el estándar monetario `BigInt` (centavos), se implementaron leases distribuidos contra caídas y se verificó la salud operativa mediante simulacros de desastre (`RESTORE_DRILL`).
* **Etapa III — Convergencia Macroeconómica, Inteligencia de Mercados y Dinamismo SB (Etapa Activa):**
  * **MECE (Fase 1C):** Motor econométrico que coteja la microeconomía del usuario con la inflación real (IPC BCRD 1984–2026), sensibilidad FX y bitácora criptográfica encadenada (Merkle Tree).
  * **Providence FX & Energía:** Monitor inteligente de divisas (USD/EUR) y parser de boletines oficiales de combustibles del MICM con soporte nativo para semanas que cruzan meses.
  * **Análisis Bancario Dinámico (SB v2):** Eliminación total de datos fijos/hardcodes; gobernanza temporal basada en el último corte oficial real con contrato de metadatos estricto (`meta`).
  * **Identidad Magnus Financial Systems:** Rediseño corporativo de la landing pública y reorganización del sidebar contextual en 5 cuadrantes operativos.
* **Etapa IV — Wealth AI & Modelado Predictivo (Próxima Frontera):** Simulación avanzada de escenarios de liquidez, proyecciones multivariables y toma de decisiones patrimoniales asistida por IA local soberana.

---

## 🏛️ Topología de Infraestructura y Red Soberana

MagnusOS2 opera mediante una arquitectura multicapa contenerizada en Docker Compose, diseñada para alta disponibilidad, observabilidad y mínimo consumo de recursos:

```mermaid
graph TB
    subgraph Client ["🌐 Capa de Cliente (SPA Soberana)"]
        UI["React 18 + TypeScript + Vite 7.3"]
        Framer["Framer Motion + Recharts + Lucide Icons"]
        Safety["moneySafety.ts (BigInt Minor Units Guard)"]
        Formatters["bankingFormatters.ts (Localized Dominican Spanish)"]
        UI --- Framer
        UI --- Safety
        UI --- Formatters
    end

    subgraph Host ["🖥️ Host Soberano (Ubuntu Server 26.04 LTS)"]
        Proxy["Puerto 4000 (HTTP / WS Unificado)"]
    end

    subgraph AppContainer ["📦 Contenedor All-in-One: magnus_os2_app"]
        direction TB
        Server["Express.js 4 + Socket.IO (Node.js 20 LTS)"]
        
        subgraph Probes ["🩺 Probes de Salud y Telemetría"]
            Live["/health/live (Liveness)"]
            Ready["/health/ready (Readiness: DB + Migrations + Drift)"]
            Deep["/health/deep (Deep Telemetry - Admin Auth)"]
        end

        subgraph CoreEngine ["💰 Núcleo Financiero Unificado"]
            LedgerService["ledgerReadService.js (SOT Oficial)"]
            AnalyticsService["ledgerAnalyticsService.js (KPIs & Proyecciones)"]
            DualWrite["finanzaController.js (Atomic Dual-Write)"]
            Reconciler["ledgerReconciliationService.js (Zero Drift)"]
        end

        subgraph MECE ["🌌 Motor MECE (Fase 1C)"]
            RealIncome["realIncomeEngine.js (Poder Adquisitivo Real)"]
            Exposure["exposureEngine.js (Sensibilidad FX & Inflación)"]
            Governance["temporalGovernance.js (Ventana Temporal)"]
            Merkle["auditLogService.js (Bitácora Criptográfica)"]
        end

        subgraph MarketRadar ["📡 Radar de Mercados & Ingesta Externa"]
            SbService["sbStatisticsService.js (SB v2 Dynamic Contract)"]
            FxService["fxService.js (Providence FX USD/DOP)"]
            EnergyService["energyService.js (MICM Cross-Month Parser)"]
            MacroService["macroService.js (BCRD IPC / TPM)"]
        end

        subgraph Resilience ["🛡️ Observabilidad y Resiliencia"]
            JobEngine["jobObservabilityService.js"]
            LeaseLock["Distributed Leases (job_leases)"]
            CrashRecovery["recoverCrashedJobsOnStartup()"]
        end

        Server --> Probes
        Server --> CoreEngine
        Server --> MECE
        Server --> MarketRadar
        Server --> Resilience
    end

    subgraph DatabaseCluster ["Capa de Datos Relacional"]
        ProdDB[("PostgreSQL 16: magnus_postgres 5432 - Rol: magnus_app - synchronous_commit = on")]
        TestDB[("PostgreSQL 16: magnus_postgres_test 5433 - Tmpfs Isolated Test Harness")]
        
        subgraph Constraints ["⚡ Invariantes en Motor SQL"]
            TrigBalance["trg_check_ledger_transaction_balance (Sum=0, Lines>=2)"]
            TrigCurrency["trg_enforce_multicurrency_invariants (Strict Currency Gate)"]
            ExactColumns["Columns: amount_minor BIGINT, rate_exact NUMERIC(12,6)"]
        end

        ProdDB --- Constraints
    end

    subgraph IsolatedServices ["🔒 Servicios Auxiliares Aislados"]
        Sandbox["🐍 magnus_sandbox (Python Execution / Non-Root)"]
        Ollama["🧠 magnus_ollama (LLM Local / profile: disabled)"]
    end

    Client ==>|"JWT Bearer / WebSocket Handshake"| Proxy
    Proxy ==> AppContainer
    CoreEngine ==>|"Sequelize ORM (TCP Interno)"| ProdDB
    Resilience ==>|"pg_advisory_xact_lock"| ProdDB
    MarketRadar ==>|"Persistencia Relacional"| ProdDB
    AppContainer -.->|"Bridge Seguro (Puerto 5000)"| Sandbox
    AppContainer -.->|"Inferencia Local"| Ollama

    style Client fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style AppContainer fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#fff
    style DatabaseCluster fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style IsolatedServices fill:#312e81,stroke:#8b5cf6,stroke-width:1px,color:#fff
    style CoreEngine fill:#064e3b,stroke:#34d399,stroke-width:1px,color:#fff
    style MECE fill:#0f172a,stroke:#06b6d4,stroke-width:1px,color:#fff
    style MarketRadar fill:#1e1b4b,stroke:#8b5cf6,stroke-width:1px,color:#fff
    style Probes fill:#1e293b,stroke:#38bdf8,stroke-width:1px,color:#fff
```

---

## 🏛️ Arquitectura por Capas del Sistema (Clean & Modular Architecture)

La arquitectura de software de MagnusOS2 sigue principios de arquitectura limpia, asegurando que las reglas contables e invariantes nucleares sean independientes de frameworks, bases de datos o clientes web:

```mermaid
flowchart TD
    subgraph L1 ["Capas Externas: Interfaces & Presentación"]
        WebUI["💻 React SPA (TypeScript + Framer Motion)"]
        CLI["🛠️ CLI Scripts (migrate, reconcile, restore-drill)"]
        WSClient["⚡ Clientes WebSocket (Alertas en Tiempo Real)"]
    end

    subgraph L2 ["Capa de Transporte & Controladores"]
        ExpressRouter["🛡️ Express REST Endpoints (JWT / Rate Limit)"]
        SocketIO["🔌 Socket.IO Gateway (Auth Guard)"]
        HealthProbes["🩺 Health Endpoints (/live, /ready, /deep)"]
    end

    subgraph L3 ["Capa de Servicios de Dominio & Motores"]
        MECE_Motor["🌌 Motor MECE (Inflación, Erosión, Sensibilidad)"]
        SB_Motor["🏛️ Motor Bancario SB (Contrato Canónico, HHI, DSI)"]
        FX_Motor["💱 Motor Providence FX (Volatilidad & Devaluación)"]
        Energy_Motor["⛽ Motor Energía RD (MICM Cross-Month Parsing)"]
        Ledger_Service["📊 Ledger Analytics Service (SOT de Saldos)"]
    end

    subgraph L4 ["Capa de Integración, Adaptadores & Tareas"]
        Adapters["🔌 Adaptadores de Datos (BCRD, SB v2, MICM, InfoDolar)"]
        SchedulerJobs["⏰ Schedulers Inteligentes (Monitoreados c/ Leases)"]
        Recovery["🔄 Recover Crashed Jobs on Startup"]
    end

    subgraph L5 ["Núcleo Inviolable: Invariantes & Almacenamiento"]
        PG_Engine[("🐘 PostgreSQL 16 (synchronous_commit = on)")]
        SQL_Triggers["⚡ Triggers Atómicos: trg_check_balance & trg_multicurrency"]
        BigInt_Storage["🔢 amount_minor BIGINT (Cero errores de punto flotante)"]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L3 --> L5
    L4 --> L5

    style L5 fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff
    style L3 fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
    style L2 fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style L1 fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style L4 fill:#312e81,stroke:#a855f7,stroke-width:2px,color:#fff
```

---

## 📡 Ecosistema de Datos y Radar de Inteligencia Macroeconómica

MagnusOS2 no opera en el vacío: absorbe, normaliza y audita feeds oficiales de la economía dominicana e internacional para proporcionar contexto a las finanzas privadas:

```mermaid
flowchart LR
    subgraph Sources ["Feeds y Fuentes Oficiales"]
        BCRD["Banco Central RD: IPC Histórico 1984-2026, TPM"]
        SB["Superintendencia de Bancos: SB v2 API Estadísticas"]
        MICM["MICM República Dominicana: Boletines Semanales Combustibles"]
        FXFeeds["Mercados FX: InfoDolar, Yahoo Finance"]
    end

    subgraph Ingestion ["Capa de Ingesta y Resiliencia"]
        JobScheduler["Intelligent Schedulers: Cron RD Timezone"]
        LeaseEngine["Distributed Leases: job_leases y Advisory Locks"]
        Parsers["Parsers y Normalizadores: Cross-Month Sanitizer"]
        JobScheduler --- LeaseEngine
        LeaseEngine --- Parsers
    end

    subgraph Storage ["Base de Datos Soberana"]
        DB[("PostgreSQL 16: sb_metrics, sync_runs, cpi_index, fuel_prices, exchange_rates")]
    end

    subgraph Analytics ["Motores de Análisis y Frontend"]
        MECE_App["MECE Engine: Pérdida de poder adquisitivo"]
        Banking_App["Análisis Bancario: Cierre Dinámico, HHI, DSI"]
        Radar_App["Radar de Mercados: Monitoreo en vivo"]
    end

    Sources --> Ingestion
    Ingestion --> Storage
    Storage --> Analytics

    style Sources fill:#1e293b,stroke:#64748b,color:#fff
    style Ingestion fill:#0f172a,stroke:#38bdf8,color:#fff
    style Storage fill:#1e1b4b,stroke:#6366f1,color:#fff
    style Analytics fill:#064e3b,stroke:#34d399,color:#fff
```

---

## 💰 Núcleo Financiero — Ciclo de Vida del Ledger de Doble Entrada

El Ledger de doble entrada es inmutable. Cada transacción financiera (ingreso, gasto, transferencia, ajuste) se procesa de forma atómica y debe cumplir estrictamente la regla matemática de suma cero por divisa:

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Usuario Soberano
    participant UI as 💻 Frontend (React + moneySafety)
    participant API as 🛡️ API Backend (finanzaController)
    participant SOT as 🏛️ Ledger Core (ledgerReadService)
    participant DB as 🐘 PostgreSQL (magnus_app)

    User->>UI: Registra / Edita Transacción (monto, cuenta, divisa)
    UI->>UI: toMinorUnits(amount) → Convierte a BigInt centavos
    UI->>API: POST/PUT /api/finanza/transactions (JWT Bearer)
    activate API
    API->>API: Valida identidad estricta (req.user.username)
    API->>API: Verifica ownership de cuentas y tipos de saldo
    API->>DB: BEGIN TRANSACTION (Nivel READ COMMITTED)
    activate DB
    API->>DB: INSERT/UPDATE ledger_transactions (id, user_id, description, currency)
    API->>DB: INSERT transaction_lines (Debit + Credit en amount_minor)
    API->>DB: UPDATE accounts SET balance_minor (Caché derivado)
    API->>DB: INSERT legacy_daily_transaction_mappings (Idempotencia)
    Note over DB: Ejecución de Triggers en PostgreSQL al COMMIT:
    DB->>DB: 1. trg_check_ledger_transaction_balance: ¿SUM(amount_minor) == 0 y Lines >= 2?
    DB->>DB: 2. trg_enforce_multicurrency_invariants: ¿Líneas en misma divisa o puente FX válido?
    alt Invariante Violado (Desbalance / Mezcla de divisas)
        DB-->>API: ERROR: Transaction unbalanced or multicurrency violation
        API->>DB: ROLLBACK (Cero afectación de datos)
        API-->>UI: HTTP 400 Bad Request: Financial Invariant Failure
        UI-->>User: ❌ Error: La transacción viola el balance contable
    else Invariante Satisfecho (Integridad 100%)
        DB->>DB: COMMIT ATÓMICO EXITOSO
        deactivate DB
        API->>SOT: Notifica invalidación de caché / telemetría
        API-->>UI: HTTP 200 OK (Transacción confirmada en Ledger)
        deactivate API
        UI->>UI: formatMinorMoney() → Renderiza cifras exactas
        UI-->>User: ✅ Dashboard actualizado con balance conciliado
    end
```

### Invariantes Contables Garantizados en PostgreSQL

1. **Suma Cero Estricta:**
   ```sql
   -- Evaluado por trg_check_ledger_transaction_balance en COMMIT:
   SUM(transaction_lines.amount_minor) WHERE transaction_id = X = 0 AND COUNT(*) >= 2;
   ```
2. **Invariante Multimoneda:**
   ```sql
   -- Evaluado por trg_enforce_multicurrency_invariants:
   -- Todas las líneas deben compartir la divisa del encabezado, salvo operaciones con puente FX explícito.
   ```
3. **Almacenamiento Monetario Exacto:**
   - **Montos:** `amount_minor BIGINT` (centavos, sin imprecisión IEEE 754 de punto flotante).
   - **Tipos de Cambio:** `rate_exact NUMERIC(12, 6)` (precisión cambiaria institucional a 6 decimales).

---

## 🛡️ Etapa Fase II (Consolidada): Endurecimiento Institucional y Reconciliación

La **Fase II** representó la maduración estructural del sistema, eliminando cualquier vestigio de divergencia contable, asegurando cero schema drift y certificando la resiliencia operativa del entorno productivo:

| Dimensión Arquitectónica | Estado Previo (Fase I) | Estado Consolidado (Fase II) | Garantía y Evidencia Técnica |
|---|:---:|:---:|---|
| **Fuente de Verdad (SOT)** | ⚠️ Dual / Fragmentada | 🟢 **Ledger Único Oficial** | Todos los consumidores financieros consultan exclusivamente `ledgerReadService.js` / `ledgerAnalyticsService.js`. |
| **Invariante Multimoneda** | 🔴 Inexistente | 🟢 **Triggers Activos** | Triggers relacionales impiden mezclar divisas en una transacción sin puente FX explícito. |
| **Precisión Numérica** | ⚠️ Floats en UI/API | 🟢 **Exact Money (BigInt)** | Unidades menores enteras (`amount_minor`) en BD, API y componentes React (`moneySafety.ts`). |
| **Dual-Write Legacy** | 🔴 Divergente | 🟢 **Atómico (SQL Tx)** | Transacciones legacy actualizan cabecera, líneas contables y saldo de cuenta en la misma transacción SQL. |
| **Cutover de Transacciones** | ⚠️ Datos dispersos | 🟢 **433/433 Migradas (100%)** | Cutover determinista completado sin pérdida de registros ni discrepancias. |
| **Gobernanza de Schema** | ⚠️ Drift Potencial | 🟢 **Zero Drift (`isSynced`)** | 11 migraciones reproducibles (000–010) protegidas por `pg_advisory_xact_lock`. |
| **Observabilidad de Jobs** | 🔴 Inexistente | 🟢 **Leases + Telemetría** | Leases distribuidos (`job_leases`), logging estructurado y recuperación automática ante cortes de energía. |
| **Probes Operativos** | 🔴 Acoplados a JWT | 🟢 **Desacoplados** | `/health/live` y `/health/ready` públicos para orquestadores; `/health/deep` protegido para telemetría admin. |
| **Simulacro de Restore** | 🔴 No probado | 🟢 **Verificado (Drill OK)** | `npm run db:restore:drill` valida backup físico y consistencia relacional periódica. |

---

## 🌌 Etapa Fase III (Actual): Motores Especializados y Actualizaciones Recientes

### 1. Motor MECE — Macro-Economic Convergence Engine (Fase 1C)

**MECE** fusiona la microeconomía personal registrada en el Ledger con las fuerzas macroeconómicas reales de la República Dominicana:

* **Serie Histórica Oficial IPC BCRD (1984–2026):** Ingesta mensual con verificación de integridad criptográfica y gobernanza temporal.
* **Cálculo de Ingreso Real y Erosión:** Descompone la variación nominal del patrimonio frente a la inflación acumulada, calculando el poder adquisitivo neto real y tasa real de retorno simple.
* **Exposición Cambiaria y Energética:** Análisis de sensibilidad que estima el impacto directo de variaciones en la tasa USD/DOP y la canasta de combustibles en el flujo operativo del usuario.
* **Bitácora Criptográfica (Merkle Chain):** Cada consulta analítica genera un bloque con hash encadenado (`previous_hash`, `payload_hash`, `tamper_detection`), garantizando trazabilidad absoluta e inmutabilidad de los diagnósticos.
* **Defensa E2E:** 9 pruebas de seguridad que validan control de acceso basado en roles, aislamiento anti-IDOR y partición de caché.

---

### 2. Análisis Bancario Dinámico — Superintendencia de Bancos (SB v2)

La sección **Análisis Bancario** ha sido actualizada para operar bajo un contrato canónico de metadatos temporales de alta fidelidad, erradicando cualquier texto, mes o fallback numérico estático:

```mermaid
flowchart TD
    subgraph SB_API ["🏛️ API Oficial SB v2"]
        SB_Endpoint["/estadisticas/v2/captaciones"]
    end

    subgraph SB_Sync ["🔄 Ingesta & Detección de Corte"]
        SyncJob["sbSchedulerJob.js<br/>(Día 16 a las 03:00 AM)"]
        CheckLast["syncLatestSbPeriod()<br/>Detecta último corte publicado"]
    end

    subgraph Database ["🐘 Base de Datos Soberana"]
        Records["sb_banking_metrics: 2026-09 y 2026-08 (40 entidades)"]
        Runs["sb_sync_runs: Snapshot ID y Telemetría"]
    end

    subgraph TemporalContract ["Contrato Canónico de Metadatos: meta"]
        MetaObj["meta: referencePeriod: 2026-09 | freshness: CURRENT | snapshotId: 10"]
    end

    subgraph FrontendTabs ["6 Pestañas Bancarias Sincronizadas"]
        Header["Encabezado Global: Cierre septiembre 2026 (SB)"]
        Card["Context Card: DSI 29.4%, HHI 2044.07"]
        Tab1["1. Resumen: 40 Instituciones (Top 5 + Otras 35)"]
        Tab2["2. Rendimientos: Cierre Septiembre 2026"]
        Tab3["3. Instituciones: 40 Entidades Activas"]
        Tab4["4. Dolarización: Tendencia al Cierre 2026-09"]
        Tab5["5. Geografía: 32 Provincias a Septiembre 2026"]
        Tab6["6. Histórico: Serie Completa 2024-01 a 2026-09"]
    end

    SB_API --> SyncJob
    SyncJob --> Records
    SyncJob --> Runs
    Records --> TemporalContract
    Runs --> TemporalContract
    TemporalContract --> Header
    TemporalContract --> Card
    TemporalContract --> Tab1
    TemporalContract --> Tab2
    TemporalContract --> Tab3
    TemporalContract --> Tab4
    TemporalContract --> Tab5
    TemporalContract --> Tab6

    style SB_API fill:#1e293b,stroke:#64748b,color:#fff
    style SB_Sync fill:#0f172a,stroke:#38bdf8,color:#fff
    style Database fill:#1e1b4b,stroke:#6366f1,color:#fff
    style TemporalContract fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff
    style FrontendTabs fill:#312e81,stroke:#a855f7,color:#fff
```

#### Garantías del Contrato Temporal SB

1. **Cero Hardcodes y Cero Fallbacks Ocultos:** Eliminadas las cadenas estáticas `"Cierre Agosto 2026"` y los valores sustitutos (`29.7%`, `1.76%`, `4.09%`, `40 instituciones`). Si un dato no está disponible, el sistema declara explícitamente `Dato no disponible` en lugar de inventar números.
2. **Conteo Dinámico de Entidades:** El total de instituciones (`data.institutionCount = 40`) y la agrupación de mercado (`Otras (35)`) se derivan del conteo real de entidades válidas presentes en el corte.
3. **Formateador Centralizado en Español Dominicano:** `bankingFormatters.ts` genera etiquetas institucionales limpias (`Cierre septiembre 2026`, `Último corte oficial disponible: septiembre 2026`) con validación defensiva `Number.isNaN`.
4. **Sincronización Total entre Pestañas:** El encabezado global, las tarjetas de contexto y las 6 pestañas funcionales (Resumen, Rendimientos, Instituciones, Dolarización, Geografía e Histórico) consumen el mismo período de referencia sin divergencia.

---

### 3. Radar Energético & Providence FX

* **Parser de Combustibles MICM Multi-Mes:** Capacidad de interpretar avisos de precios semanales que cruzan meses (p.ej. `31-OCT a 06-NOV`), normalización fonética de nombres de combustibles, extracción de subsidios oficiales por galón y deduplicación estricta por `(fuel_id, valid_from)`.
* **Providence FX:** Monitoreo y analítica de volatilidad cambiaria USD/DOP y EUR/DOP con tasas del BCRD, análisis de spread y cobertura frente a devaluación.

---

### 4. Magnus Financial Systems & Sidebar Modular

* **Landing Corporativa:** Rediseño completo de la página institucional de bienvenida con temática financiera dorada, tipografía monospace y copy institucional soberano.
* **Navegación Contextual Reorganizada:**
  * **Radar de Mercados:** Monitoreo en vivo de divisas, energía y contexto macro.
  * **Análisis Bancario:** Acceso directo a las 6 pestañas de estadísticas SB.
  * **Planificación Patrimonial:** Flujo de caja, proyecciones, simulación Monte Carlo y convergencia MECE.
  * **Laboratorio Financiero:** Simuladores econométricos y mentoría.
  * **Torre de Control:** Panel administrativo, estado de contenedores y salud del sistema.

---

## 🚀 Puesta en Marcha y Verificación

### Prerrequisitos

* [Ubuntu Server](https://ubuntu.com/) v26.04 LTS o superior
* [Docker](https://www.docker.com/) v29.1+ & Docker Compose v2.40+
* [Node.js](https://nodejs.org/) v20 LTS (v20.20+)
* [PostgreSQL Client](https://www.postgresql.org/) v16 (`pg_dump` / `pg_restore`)

### Ejecución de Pruebas (100% Aisladas)

MagnusOS2 cuenta con un arnés de pruebas estricto que **nunca toca la base de datos de producción**:

```bash
# 1. Ejecutar la suite completa de pruebas unitarias y de integración (91 pruebas)
npm test

# 2. Ejecutar chequeo de tipos estricto con TypeScript
npx tsc --noEmit

# 3. Compilar frontend de producción con Vite
npm run build

# 4. Validar estado de gobernanza de migraciones relacionales
docker compose run --rm --no-deps magnus node scripts/migrate.js status

# 5. Ejecutar simulacro completo de respaldo y restauración en sandbox
npm run db:restore:drill
```

### Comprobación de Salud en Producción (Live Probes)

```bash
# Liveness Probe (¿El servidor Express responde?)
curl -s http://127.0.0.1:4000/api/health
# {"status":"UP","timestamp":"2026-11-01T...","uptimeSeconds":45,"version":"2.0.0"}

# Resumen Bancario con Metadatos Canónicos (Verifica corte dinámico y frescura)
curl -s http://127.0.0.1:4000/api/markets/banking/summary | jq .meta
# {
#   "source": "SB v2 API",
#   "referencePeriod": "2026-09",
#   "freshness": "CURRENT",
#   "snapshotId": 10
# }

# Reconciliación Contable en Vivo
docker compose run --rm --no-deps magnus node scripts/reconcile-ledger.js
# Status: HEALTHY | Discrepancies: 0 | Security Leaks: 0
```

---

## 📂 Estructura Detallada del Repositorio

```
MagnusOS2/
├── server/                         # Backend Institucional Node.js 20 LTS
│   ├── adapters/                   # Adaptadores de integración y desacoplamiento
│   │   └── mece/                   # Adaptadores MECE (Ledger, Macro, FX, Energy)
│   ├── config/database.js          # Configuración de conexiones PostgreSQL / SQLite
│   ├── controllers/                # Controladores de dominio (finanzas, mece, sb, mercado)
│   │   ├── sbBankingController.js  # Endpoints bancarios con contrato temporal canónico
│   │   ├── meceController.js       # Controlador del motor de convergencia MECE
│   │   └── finanzaController.js    # Controlador de transacciones y libro mayor
│   ├── data/                       # Staging offline e histórico verificado (CPI BCRD, etc.)
│   ├── jobs/                       # Schedulers inteligentes (SB, FX, Macro, Energía)
│   ├── middleware/                 # JWT estricto, rate limiting, security headers Helmet
│   ├── migrations/                 # Migraciones relacionales ordenadas (000_ a 015_)
│   ├── models/                     # Modelos Sequelize 6 (Ledger, Cuentas, Mercados, Jobs)
│   ├── routes/                     # Rutas modulares REST (finanza, auth, mece, sb, energy)
│   ├── services/                   # SOT Financiero, Observabilidad, Gobernanza y Reconciliador
│   │   ├── ledgerReadService.js    # Lógica oficial de consulta del libro mayor
│   │   ├── ledgerAnalyticsService.js # Agregación contable y métricas sin mezcla de divisas
│   │   ├── mece/                   # Motores MECE (realIncome, exposure, temporal, auditLog)
│   │   ├── sb/                     # Servicios SB (sbStatisticsService, sbMetrics)
│   │   ├── jobObservabilityService.js# Leases distribuidos y ciclo de vida de jobs
│   │   ├── migrationRunner.js      # Ejecutor transaccional con advisory locks
│   │   └── schemaDriftService.js   # Verificador de paridad Sequelize vs PostgreSQL
│   └── socket/                     # Handlers WebSocket autenticados en tiempo real
├── src/                            # Frontend React 18 + TypeScript + Vite
│   ├── apps/
│   │   ├── finanza/                # Módulo Financiero (Ledger, CashFlow, Providence FX)
│   │   │   ├── components/
│   │   │   │   ├── banking/        # Componentes y pestañas de Análisis Bancario (SB v2)
│   │   │   │   │   ├── BankingSection.tsx     # Sección principal con badge de corte dinámico
│   │   │   │   │   ├── BankingContextCard.tsx # Tarjetas de contexto sin fallbacks fijos
│   │   │   │   │   └── tabs/                  # 6 Pestañas sincronizadas (Resumen, Rendimientos...)
│   │   │   │   ├── ConvergenceTab.tsx         # Pestaña del motor MECE
│   │   │   │   └── macro/                     # Macro RD y visualización de indicadores
│   │   │   ├── pages/              # Páginas principales (Ledger, Cuentas, Banca, Mercados)
│   │   │   └── utils/
│   │   │       ├── bankingFormatters.ts       # Formateo localizado en español dominicano
│   │   │       └── moneySafety.ts             # Blindaje numérico BigInt contra errores de redondeo
│   │   ├── landing/                # Magnus Financial Systems — Landing institucional y legal
│   │   ├── magnus/                 # Sabiduría, Pensum, Lab IA y Centro de Comando
│   │   └── server-admin/           # Torre de Control Soberana (HUD, Hardware, Logs)
│   └── shared/                     # Componentes y contextos compartidos
├── tests/                          # Suite de pruebas automatizadas (91 tests passing)
│   ├── sbDynamicPeriod.test.js     # Pruebas de contrato dinámico y no-hardcodes SB
│   ├── sbMetrics.test.js           # Pruebas de frescura y cálculo de métricas SB
│   ├── meceExpressSecurityE2E.test.js # Pruebas E2E de seguridad MECE
│   ├── energyProvider.test.js      # Pruebas del parser de combustibles MICM
│   └── moneySafety.test.js         # Pruebas de integridad numérica BigInt
├── scripts/                        # Automatizaciones de infraestructura
│   ├── cutover-daily-transactions.js # Migrador idempotente de transacciones legacy
│   ├── reconcile-ledger.js         # Auditor de integridad de saldos en tiempo real
│   ├── migrate.js                  # CLI de migraciones y baselines
│   └── restore-drill.js            # Simulacro de restauración de backups en sandbox
├── docs/                           # Documentación de ingeniería, guías y gobernanza
│   ├── DOCS.md                     # Documentación técnica integral histórica
│   ├── GUIA_COMANDOS.md            # Guía operativa de comandos y túneles seguros
│   ├── audits/                     # Auditorías técnicas dinámicas (SB v2, etc.)
│   │   └── BANKING_DYNAMIC_PERIOD_AUDIT.md # Auditoría de períodos dinámicos SB v2
│   ├── audit/                      # Informes de auditoría y certificación (Fase II, Stress Test)
│   │   ├── PHASE2_FINAL_REMEDIATION_REPORT.md # Informe de remediación y hardening
│   │   └── INFORME_STRESS_TEST_2026-10-24.md  # Resultados de stress test de concurrencia
│   ├── FX_SERVICE.md               # Especificación del servicio Providence FX
│   ├── ENERGY_RD.md                # Monitor de combustibles y mercado energético MICM
│   ├── MACRO_RD.md                 # Contexto macroeconómico y series del BCRD
│   ├── PHASE2_FINAL_SOURCE_OF_TRUTH_MAP.md # Matriz de fuentes de verdad
│   └── PHASE2_FINAL_PRODUCTION_RUNBOOK.md  # Runbook paso a paso para despliegues
├── docker-compose.yml              # Orquestación de servicios en red soberana
├── Dockerfile.api                  # Imagen multicapa optimizada para producción
└── package.json                    # Dependencias y scripts de prueba
```

---

## 🔒 Seguridad y Principio de Menor Privilegio

* **Identidad Inmutable:** La identidad del usuario se deriva estrictamente del payload criptográfico del token JWT verificado en backend (`req.user.username` / `socket.user.username`). No se aceptan parámetros de suplantación en `body`, `query` o `params`.
* **Menor Privilegio en Base de Datos:** La aplicación se conecta mediante el usuario dedicado `magnus_app` (`NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`), garantizando que una vulnerabilidad a nivel de aplicación no comprometa el motor de PostgreSQL.
* **Durabilidad Máxima:** `synchronous_commit = on` activado permanentemente en PostgreSQL para garantizar que toda transacción confirmada esté escrita en disco ante cualquier corte abrupto de energía.
* **Python Sandbox Enjaulado:** Contenedor no-root (`sandboxuser`, UID 1000) con límites de CPU (1.0), memoria (512MB), archivos temporales únicos con UUID y timeout forzoso de 20s.

---

## ✒️ Autor y Créditos

Este Financial Operating System fue conceptualizado, diseñado y desarrollado por:

* **YoxeLaunch** — Creador Original, Arquitecto de Software y Desarrollador Principal  
* GitHub: [@YoxeLaunch](https://github.com/YoxeLaunch)

<br />
<div align="center">
  <p><strong>Construido para la Soberanía Financiera y el Control Total ⚜️ — Diseñado por YoxeLaunch</strong></p>
  <sub>© 2026 MagnusOS2 Project · Self-hosted · Sovereign by design</sub>
</div>
