
const seed = async () => {
    const updates = [
        {
            title: "Sistema Restaurado",
            description: "El panel de administración y el sistema de mentores han sido actualizados y restaurados a su funcionalidad completa.",
            type: "announcement",
            date: new Date().toISOString()
        },
        {
            title: "Nueva Gestión de Mentores",
            description: "Ahora puedes crear mentores personalizados y asignarlos visualmente en el calendario.",
            type: "feature",
            date: new Date(Date.now() - 86400000).toISOString() // Yesterday
        }
    ];

    for (const update of updates) {
        try {
            console.log(`Creating update: ${update.title}`);
            const res = await fetch('http://localhost:3001/api/updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
            });
            if (res.ok) {
                console.log("Success");
            } else {
                console.error("Failed", await res.text());
            }
        } catch (e) {
            console.error(e);
        }
    }
}
seed();
