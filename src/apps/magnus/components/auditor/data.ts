export interface MedicalRecord {
    id: number;
    closeDate: string;
    patientName: string;
    nap: string;
    note?: string;
    coverage: number;
    glossedAmount: number;
    amountToPay: number;
}

export const MOCK_RECORDS: MedicalRecord[] = [
    {
        id: 1,
        closeDate: '12/11/2025',
        patientName: 'LISBETH NADEDZA SUAREZ RAMOS',
        nap: '10036157',
        coverage: 19180.43,
        glossedAmount: 1755.07,
        amountToPay: 17425.36,
    },
    {
        id: 2,
        closeDate: '01/12/2025',
        patientName: 'KARELYN MEDINA RODRIGUEZ',
        nap: '10090778',
        coverage: 41625.10,
        glossedAmount: 2040.81,
        amountToPay: 39584.29,
    },
    {
        id: 3,
        closeDate: '03/12/2025',
        patientName: 'ROMER JAIREN SANCHEZ MARTE',
        nap: '10093064',
        coverage: 19793.51,
        glossedAmount: 1297.44,
        amountToPay: 18496.07,
    },
    {
        id: 4,
        closeDate: '21/11/2025',
        patientName: 'NICELYS ALYRIA DE LA CRUZ REYES',
        nap: '10078705',
        coverage: 31485.09,
        glossedAmount: 3131.54,
        amountToPay: 28353.55,
    },
    {
        id: 5,
        closeDate: '16/12/2025',
        patientName: 'STEPHANY MARIE RODRIGUEZ VARGAS',
        nap: '10112974',
        coverage: 11938.09,
        glossedAmount: 676.76,
        amountToPay: 11261.33,
    },
    {
        id: 6,
        closeDate: '03/12/2025',
        patientName: 'GLORIANGEL JEREZ NUÑEZ',
        nap: '10096965',
        coverage: 20750.17,
        glossedAmount: 2205.86,
        amountToPay: 18544.31,
    },
    {
        id: 8,
        closeDate: '26/12/2025',
        patientName: 'ANDRIU SUAREZ SANTOS',
        nap: 'H95-4186553',
        note: 'DIALISIS',
        coverage: 4500.00,
        glossedAmount: 125.99,
        amountToPay: 4374.01,
    },
    {
        id: 9,
        closeDate: '24/12/2025',
        patientName: 'ANDRIU SUAREZ SANTOS',
        nap: 'H95-4177173',
        note: 'DIALISIS',
        coverage: 4500.00,
        glossedAmount: 125.99,
        amountToPay: 4374.01,
    },
    {
        id: 10,
        closeDate: '12/12/2025',
        patientName: 'ANDRIU SUAREZ SANTOS',
        nap: 'H95-4047582',
        note: 'DIALISIS',
        coverage: 4500.00,
        glossedAmount: 125.99,
        amountToPay: 4374.01,
    },
];
