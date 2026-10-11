/**
 * ============================================================================
 * PROVIDENCE FX // QUANTITATIVE RESEARCH ENGINE
 * Model Factory & Registry
 * ============================================================================
 */

import { RandomWalkModel, RandomWalkWithDriftModel, MovingAverageModel, SimpleExponentialSmoothingModel } from './baselineModels.js';
import { ArimaModel } from './arimaModel.js';
import { GarchModel } from './garchModel.js';

export const MODEL_REGISTRY = {
    [RandomWalkModel.id]: {
        id: RandomWalkModel.id,
        name: RandomWalkModel.name,
        category: 'BASELINE',
        classRef: RandomWalkModel,
        description: 'Pronóstico ingenuo P(t+h) = P(t). Benchmark obligatorio mínimo de la literatura financiera.'
    },
    [RandomWalkWithDriftModel.id]: {
        id: RandomWalkWithDriftModel.id,
        name: RandomWalkWithDriftModel.name,
        category: 'BASELINE',
        classRef: RandomWalkWithDriftModel,
        description: 'Random Walk con drift proyectado estrictamente desde el promedio de retornos in-sample.'
    },
    [MovingAverageModel.id]: {
        id: MovingAverageModel.id,
        name: MovingAverageModel.name,
        category: 'INDICATOR',
        classRef: MovingAverageModel,
        description: 'Proyección sobre media móvil de ventana configurable (5, 20 o 60 sesiones).'
    },
    [SimpleExponentialSmoothingModel.id]: {
        id: SimpleExponentialSmoothingModel.id,
        name: SimpleExponentialSmoothingModel.name,
        category: 'SMOOTHING',
        classRef: SimpleExponentialSmoothingModel,
        description: 'Suavizado exponencial simple con optimización in-sample del parámetro alfa.'
    },
    [ArimaModel.id]: {
        id: ArimaModel.id,
        name: ArimaModel.name,
        category: 'AUTOREGRESSIVE',
        classRef: ArimaModel,
        description: 'Modelo autorregresivo integrado de medias móviles sobre diferencias logarítmicas.'
    },
    [GarchModel.id]: {
        id: GarchModel.id,
        name: GarchModel.name,
        category: 'VOLATILITY',
        classRef: GarchModel,
        description: 'Modelado de heterocedasticidad condicional y agrupamiento de volatilidad GARCH(1,1).'
    }
};

export function createModelInstance(modelId, params = {}) {
    const entry = MODEL_REGISTRY[modelId];
    if (!entry) {
        throw new Error(`Modelo no reconocido en el registro de investigación: ${modelId}`);
    }
    return new entry.classRef(params);
}
