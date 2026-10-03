/**
 * ============================================================================
 * ENERGÍA RD // CONTROLLER
 * Endpoints REST para combustibles oficiales de República Dominicana
 * ============================================================================
 */

import { energyService } from '../services/energy/energyService.js';
import { FuelPolicyWeek } from '../models/index.js';

export const getEnergySummary = async (req, res) => {
    try {
        const forceRefresh = req.query.force === 'true';
        const data = await energyService.getEnergySummary({ forceRefresh });
        res.setHeader('Cache-Control', 'public, max-age=120');
        return res.json({ success: true, data });
    } catch (error) {
        console.error('[EnergyController] Error en getEnergySummary:', error.message);
        return res.status(500).json({
            success: false,
            error: 'FAILED_TO_FETCH_ENERGY_DATA',
            details: error.message
        });
    }
};

export const getFuelsList = async (req, res) => {
    try {
        const summary = await energyService.getEnergySummary();
        return res.json({
            success: true,
            period: summary.period,
            fuels: summary.fuels
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export const getFuelDetail = async (req, res) => {
    try {
        const { fuelId } = req.params;
        const summary = await energyService.getEnergySummary();
        const fuel = summary.fuels.find(f => f.id === fuelId);
        if (!fuel) {
            return res.status(404).json({ success: false, error: 'FUEL_NOT_FOUND' });
        }
        return res.json({ success: true, fuel, period: summary.period, policy: summary.policy });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export const getFuelHistory = async (req, res) => {
    try {
        const { fuelId } = req.params;
        const range = req.query.range || '1Y';
        const history = await energyService.getFuelHistory(fuelId, range);
        if (!history) {
            return res.status(404).json({ success: false, error: 'FUEL_NOT_FOUND' });
        }
        return res.json({ success: true, data: history });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export const getPolicyHistory = async (req, res) => {
    try {
        const policies = await FuelPolicyWeek.findAll({
            order: [['validFrom', 'DESC']],
            limit: 52 // 1 año de semanas
        });
        return res.json({ success: true, count: policies.length, policies });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export const syncEnergyData = async (req, res) => {
    try {
        const result = await energyService.syncWeeklyEnergyData();
        return res.json({ success: true, result });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
