/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Clinical Blue
                primary: {
                    50: '#f0f7ff',
                    100: '#e0effe',
                    200: '#bae0fd',
                    300: '#7cc3fb',
                    400: '#38a1f6',
                    500: '#0e82e5', // Medical Blue
                    600: '#0264be',
                    700: '#035091',
                    800: '#074478',
                    900: '#0b3965',
                    950: '#072444',
                },
                // Clinical Teal
                secondary: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6', // Medical Teal
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                    950: '#042f2e',
                },
                // Medical Status Colors (Muted for professionalism)
                low: {
                    light: '#dcfce7',
                    DEFAULT: '#22c55e',
                    dark: '#166534',
                },
                medium: {
                    light: '#fef3c7',
                    DEFAULT: '#f59e0b',
                    dark: '#92400e',
                },
                high: {
                    light: '#fee2e2',
                    DEFAULT: '#ef4444',
                    dark: '#991b1b',
                },
                background: {
                    light: '#f8fafc',
                    dark: '#0f172a',
                },
                card: {
                    light: '#ffffff',
                    dark: '#1e293b',
                }
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '3rem',
            },
        },
    },
    plugins: [],
}
