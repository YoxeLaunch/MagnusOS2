export interface Company {
    id: string;
    name: string;
    createdAt: string;
}

export interface Closure {
    id: string;
    companyId: string;
    name: string;
    type: 'emergency' | 'record';
    status: 'open' | 'closed';
    createdAt: string;
}

export interface MedicalRecord {
    id: string; // Changed from number to string for UUIDs
    companyId: string;
    closureId?: string;
    recordType?: 'emergency' | 'record';
    closeDate: string;
    patientName: string;
    nap: string;
    note?: string;
    coverage: number;
    glossedAmount: number;
    amountToPay: number;
    createdAt: string;
}
