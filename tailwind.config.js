/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "var(--color-primary)",
                secondary: "var(--color-secondary)",
                success: "var(--color-success)",
                error: "var(--color-error)",
                background: "var(--bg-color)",
                text: "var(--text-main)",
                card: "var(--card-bg)",
                border: "var(--border-color)",

                // Legacy support (optional, or remove if migrated)
                danger: "var(--color-error)",
                warning: "#f59e0b",
                "background-light": "var(--color-bg-light)",
                "background-dark": "var(--color-bg-dark)",
                "card-light": "#ffffff",
                "card-dark": "#121212",
                theme: {
                    gold: '#D4AF37',
                    "gold-dark": '#B5952F',
                    dark: '#000000',
                    card: '#050505',
                    sidebar: '#000000',
                    accent: '#111111'
                },

                // Landing page (marketing site) palette
                "accent-green": "#00C853",
                "accent-blue": "#2962FF",
                "accent-orange": "#FF6D00",
                "accent-purple": "#6200EA",
                "surface-dark": "#121418",
                "surface-light": "#FFFFFF",
            },
            fontFamily: {
                sans: ["Manrope", "sans-serif"],
                display: ["Playfair Display", "serif"],
            },
        },
    },
    plugins: [],
}
