import { Company, MedicalRecord, Closure } from '../types';

export const auditorService = {
    // --- Companies ---
    getCompanies: async (): Promise<Company[]> => {
        const response = await fetch('/api/auditor/companies');
        if (!response.ok) throw new Error('Error al obtener compañías');
        return response.json();
    },

    createCompany: async (name: string): Promise<Company> => {
        const response = await fetch('/api/auditor/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear compañía');
        }
        return response.json();
    },

    // --- Records ---
    getRecords: async (companyId: string, closureId?: string): Promise<MedicalRecord[]> => {
        const url = closureId
            ? `/api/auditor/companies/${companyId}/records?closureId=${closureId}`
            : `/api/auditor/companies/${companyId}/records`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener expedientes');
        const data = await response.json();

        // Transform snake_case from DB to camelCase for frontend
        return data.map((record: any) => ({
            id: record.id,
            companyId: record.company_id,
            closureId: record.closure_id,
            recordType: record.record_type,
            closeDate: record.close_date,
            patientName: record.patient_name,
            nap: record.nap,
            note: record.note,
            coverage: record.coverage,
            glossedAmount: record.glossed_amount,
            amountToPay: record.amount_to_pay,
            createdAt: record.created_at
        }));
    },

    addRecord: async (record: Omit<MedicalRecord, 'id' | 'createdAt'>): Promise<MedicalRecord> => {
        // Transform camelCase to snake_case for API
        const payload = {
            company_id: record.companyId,
            closure_id: record.closureId,
            record_type: record.recordType,
            close_date: record.closeDate,
            patient_name: record.patientName,
            nap: record.nap,
            note: record.note,
            coverage: record.coverage,
            glossed_amount: record.glossedAmount,
            amount_to_pay: record.amountToPay
        };

        const response = await fetch('/api/auditor/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear expediente');
        }

        const data = await response.json();
        return {
            id: data.id,
            companyId: data.company_id,
            closureId: data.closure_id,
            recordType: data.record_type,
            closeDate: data.close_date,
            patientName: data.patient_name,
            nap: data.nap,
            note: data.note,
            coverage: data.coverage,
            glossedAmount: data.glossed_amount,
            amountToPay: data.amount_to_pay,
            createdAt: data.created_at
        };
    },

    updateRecord: async (id: string, record: Partial<Omit<MedicalRecord, 'id' | 'companyId' | 'createdAt'>>): Promise<MedicalRecord> => {
        const payload: any = {};
        if (record.closeDate) payload.close_date = record.closeDate;
        if (record.patientName) payload.patient_name = record.patientName;
        if (record.nap) payload.nap = record.nap;
        if (record.note !== undefined) payload.note = record.note;
        if (record.coverage !== undefined) payload.coverage = record.coverage;
        if (record.glossedAmount !== undefined) payload.glossed_amount = record.glossedAmount;
        if (record.amountToPay !== undefined) payload.amount_to_pay = record.amountToPay;

        const response = await fetch(`/api/auditor/records/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar expediente');
        }

        const data = await response.json();
        return {
            id: data.id,
            companyId: data.company_id,
            closureId: data.closure_id,
            recordType: data.record_type,
            closeDate: data.close_date,
            patientName: data.patient_name,
            nap: data.nap,
            note: data.note,
            coverage: data.coverage,
            glossedAmount: data.glossed_amount,
            amountToPay: data.amount_to_pay,
            createdAt: data.created_at
        };
    },

    deleteRecord: async (id: string): Promise<void> => {
        const response = await fetch(`/api/auditor/records/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al eliminar expediente');
    },

    // --- Closures ---
    getClosures: async (companyId: string, type?: 'emergency' | 'record'): Promise<Closure[]> => {
        const url = type
            ? `/api/auditor/closures?companyId=${companyId}&type=${type}`
            : `/api/auditor/closures?companyId=${companyId}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener cierres');
        const data = await response.json();

        return data.map((closure: any) => ({
            id: closure.id,
            companyId: closure.company_id,
            name: closure.name,
            type: closure.type,
            status: closure.status,
            createdAt: closure.created_at
        }));
    },

    createClosure: async (companyId: string, name: string, type: 'emergency' | 'record'): Promise<Closure> => {
        const response = await fetch('/api/auditor/closures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_id: companyId, name, type })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear cierre');
        }

        const data = await response.json();
        return {
            id: data.id,
            companyId: data.company_id,
            name: data.name,
            type: data.type,
            status: data.status,
            createdAt: data.created_at
        };
    },

    // --- Stats ---
    getStats: async (companyId: string) => {
        const response = await fetch(`/api/auditor/companies/${companyId}/stats`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return response.json();
    }
};
