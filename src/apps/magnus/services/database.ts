export interface ChecklistItem {
    id: string;
    text: string;
    done: boolean;
}

export const db = {
    getChecklist: async (): Promise<ChecklistItem[]> => {
        try {
            const res = await apiFetch('/api/data');
            const data = await res.json();
            return data.checklist || [];
        } catch (e) {
            console.error('Error fetching checklist', e);
            return [];
        }
    },

    saveChecklist: async (items: ChecklistItem[]) => {
        try {
            await apiFetch('/api/checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items)
            });
        } catch (e) {
            console.error('Error saving checklist', e);
        }
    },

    getCalendarData: async (): Promise<Record<string, boolean>> => {
        try {
            const res = await apiFetch('/api/data');
            const data = await res.json();
            return data.calendar || {};
        } catch (e) {
            console.error('Error fetching calendar', e);
            return {};
        }
    },

    toggleCalendarDate: async (dateStr: string, currentValue: boolean) => {
        try {
            // We send the NEW value (inverse of current)
            await apiFetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, value: !currentValue })
            });
        } catch (e) {
            console.error("Error toggling date", e);
        }
    }
};
