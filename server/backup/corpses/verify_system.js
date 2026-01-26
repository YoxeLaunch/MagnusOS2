import { sequelize } from '../config/database.js';
import { sequelizeSystem } from '../config/database.js';
import { User, Transaction } from '../models/index.js';
import { SystemUpdate, Mentor, Message, UserChecklist } from '../models/system/index.js';

const runHealthCheck = async () => {
    console.log('\n🏥 --- SISTEMA MAGNUS: DIAGNÓSTICO DE SALUD ---\n');

    try {
        // 1. Check Finanza DB
        console.log('🔍 Verificando NÚCLEO FINANCIERO (finanza.db)...');
        await sequelize.authenticate();
        const userCount = await User.count();
        const txCount = await Transaction.count();
        console.log(`   ✅ Conexión Establecida.`);
        console.log(`   📊 Usuarios: ${userCount}`);
        console.log(`   📊 Transacciones: ${txCount}`);

        // 2. Check System DB
        console.log('\n🔍 Verificando NÚCLEO DE SISTEMA (magnus_system.db)...');
        await sequelizeSystem.authenticate();
        const updateCount = await SystemUpdate.count();
        const mentorCount = await Mentor.count();
        const msgCount = await Message.count();
        const checklistCount = await UserChecklist.count();

        console.log(`   ✅ Conexión Establecida.`);
        console.log(`   📊 Actualizaciones: ${updateCount}`);
        console.log(`   📊 Mentores: ${mentorCount}`);
        console.log(`   📊 Mensajes: ${msgCount}`);
        console.log(`   📊 Items Checklist: ${checklistCount}`);

        // 3. Integrity Check (Sample)
        if (msgCount > 0) {
            console.log('\n🔍 Verificando Integridad Cruzada (Chat)...');
            const lastMsg = await Message.findOne({ order: [['createdAt', 'DESC']] });
            if (lastMsg) {
                const sender = await User.findByPk(lastMsg.fromUsername);
                if (sender) {
                    console.log(`   ✅ Último mensaje (${lastMsg.text}) enlazado correctamente a usuario: ${sender.username}`);
                } else {
                    console.log(`   ⚠️ ALERTA: Último mensaje es huérfano (Usuario ${lastMsg.fromUsername} no existe en FinanzaDB).`);
                }
            }
        }

        console.log('\n✨ DIAGNÓSTICO COMPLETADO: SISTEMA ESTABLE\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:', error);
        process.exit(1);
    }
};

runHealthCheck();
