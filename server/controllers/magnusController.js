import { User, Transaction, DailyTransaction } from '../models/index.js';
import { Mentor, UserChecklist, UserCalendar, CurriculumModule, Mission } from '../models/system/index.js';

// --- USERS ---
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { username } = req.params;
    const updates = req.body;

    try {
        const user = await User.findByPk(username);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        await user.update(updates);

        const userData = user.toJSON();
        const { password, ...safeUser } = userData;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    const { username } = req.params;

    if (username.toLowerCase() === 'soberano') {
        return res.status(403).json({ error: 'No se puede eliminar al usuario Soberano' });
    }

    try {
        const user = await User.findByPk(username);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Cascading delete should ideally be handled by DB FKs, but ensuring manual cleanup here too just in case
        await Transaction.destroy({ where: { userId: username } });
        await DailyTransaction.destroy({ where: { userId: username } });
        await UserChecklist.destroy({ where: { userId: username } });
        await UserCalendar.destroy({ where: { userId: username } });
        await user.destroy();

        res.json({ success: true, message: `Usuario ${username} eliminado.` });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

export const updateUserPreferences = async (req, res) => {
    const { username } = req.params;
    const { preferences } = req.body;

    try {
        const user = await User.findByPk(username);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const currentPrefs = user.preferences || {};
        const newPrefs = { ...currentPrefs, ...preferences };

        await user.update({ preferences: newPrefs });

        // Return mostly full object for frontend sync
        const userData = user.toJSON();
        res.json({ success: true, user: userData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUserTags = async (req, res) => {
    const { username } = req.params;
    const { tag, action } = req.body;

    try {
        const user = await User.findByPk(username);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        let tags = user.tags || [];
        if (action === 'add') {
            if (!tags.includes(tag)) tags.push(tag);
        } else if (action === 'remove') {
            tags = tags.filter(t => t !== tag);
        }

        // Explicitly set because of potential JSON reference issues if modifying in place
        await user.update({ tags: [...tags] });

        // --- VIP NOTIFICATION SYSTEM ---
        if (tag === 'VIP' && req.io) {
            const isUpgrade = action === 'add';
            const title = isUpgrade ? '¡Nuevo Miembro VIP!' : 'Actualización de Membresía';
            const message = isUpgrade
                ? `¡Felicitaciones a ${user.name || username} por su ascenso al rango VIP!`
                : `La membresía VIP de ${user.name || username} ha finalizado.`;

            const type = isUpgrade ? 'success' : 'warning'; // Using success/warning types

            req.io.emit('system:broadcast', {
                title,
                message,
                type, // 'success' should be handled by frontend as green/gold
                timestamp: new Date()
            });
            console.log(`[VIP] Broadcast sent for ${username} (${action})`);
        }
        // -------------------------------

        const userData = user.toJSON();
        const { password, ...safeUser } = userData;
        res.json(safeUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// --- MENTORS ---
export const getMentors = async (req, res) => {
    try {
        const mentors = await Mentor.findAll();
        res.json(mentors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const saveMentors = async (req, res) => {
    const mentorsData = req.body;
    try {
        // Upsert logic (Bulk create with update on duplicate key is usually handled specially in SQL)
        // For simplicity: truncate and re-insert or manual loop.
        // Assuming this endpoint replaces the full list OR adds new ones. 
        // The old code did `writeMentors` overwriting file. So replace all is safer parity.

        await Mentor.destroy({ where: {}, truncate: true });

        const safeMentors = mentorsData.map(m => (!m.id ? { ...m, id: Date.now() + Math.random().toString(36).substr(2, 9) } : m));
        await Mentor.bulkCreate(safeMentors);

        res.json({ success: true, data: safeMentors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- CHECKLIST & CALENDAR ---
export const getData = async (req, res) => {
    // Legacy endpoint expected { checklist: [], calendar: {} }
    // We should try to find by User if we have authentication context, but old code was global/generic.
    // We migrated assuming 'soberano'. We'll fetch 'soberano' data or global for now.

    const checklistItems = await UserChecklist.findAll({ where: { userId: 'soberano' } });
    const formattedChecklist = checklistItems.map(i => ({ text: i.text, checked: i.completed }));

    const calendarItems = await UserCalendar.findAll({ where: { userId: 'soberano' } });
    const formattedCalendar = {};
    calendarItems.forEach(i => {
        formattedCalendar[i.date] = i.value;
    });

    res.json({ checklist: formattedChecklist, calendar: formattedCalendar });
};

export const saveChecklist = async (req, res) => {
    const items = req.body; // [{text, checked}]
    // Replace logic for 'soberano'
    try {
        await UserChecklist.destroy({ where: { userId: 'soberano' } });
        const mapped = items.map(i => ({
            text: i.text,
            completed: i.checked,
            userId: 'soberano'
        }));
        await UserChecklist.bulkCreate(mapped);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const saveCalendar = async (req, res) => {
    const { date, value } = req.body;
    try {
        // Upsert
        const existing = await UserCalendar.findOne({ where: { userId: 'soberano', date } });
        if (existing) {
            await existing.update({ value });
        } else {
            await UserCalendar.create({ userId: 'soberano', date, value });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// --- CURRICULUM ---
export const getCurriculum = async (req, res) => {
    try {
        const modules = await CurriculumModule.findAll({
            include: [{ model: Mission, as: 'missions' }],
            order: [['order', 'ASC'], ['missions', 'week', 'ASC']]
        });
        res.json(modules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const toggleMission = async (req, res) => {
    try {
        await initSystemDb();
        const { missionId } = req.body;
        const mission = await Mission.findByPk(missionId);

        if (!mission) return res.status(404).json({ error: 'Mission not found' });

        mission.isCompleted = !mission.isCompleted;
        await mission.save();

        res.json(mission);
    } catch (error) {
        console.error('Toggle mission error:', error);
        res.status(500).json({ error: 'Failed to toggle mission' });
    }
};

// --- CURRICULUM CRUD (ADMIN) ---
export const createMission = async (req, res) => {
    try {
        await initSystemDb();
        const { moduleId, text, week } = req.body;
        const mission = await Mission.create({ moduleId, text, week, isCompleted: false });
        res.json(mission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateMission = async (req, res) => {
    try {
        await initSystemDb();
        const { id, text, week } = req.body;
        const mission = await Mission.findByPk(id);
        if (!mission) return res.status(404).json({ error: 'Mission not found' });

        await mission.update({ text, week });
        res.json(mission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteMission = async (req, res) => {
    try {
        await initSystemDb();
        const { id } = req.body;
        const mission = await Mission.findByPk(id);
        if (!mission) return res.status(404).json({ error: 'Mission not found' });

        await mission.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const uploadImage = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return the public URL
        const filename = req.file.filename;
        const url = `/images/mentors/${filename}`;

        console.log(`[UPLOAD] Image saved: ${url}`);
        res.json({ url });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
};
