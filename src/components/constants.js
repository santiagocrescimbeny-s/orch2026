// Constantes y helpers reutilizables

export const TEAM_MEMBERS = ["Santiago", "Alan", "Ghis", "Diego", "Cony", "Juan", "Melany"];

export const EMAILS = {
    Santiago: 'santiagocrescimbeny@gmail.com',
    Alan: 'alan.carrizo@hotmail.com',
    Ghis: 'ghislayne.gr@gmail.com',
    Diego: 'diegomartinaviles@gmail.com',
    Cony: 'kony.e.r@gmail.com',
    Juan: 'juanr00729@gmail.com',
    Melany: 'melagimenez5@gmail.com'
};

export const EMAILJS_CONFIG = {
    publicKey: 'wri9yLRhHrRSpDay5',
    serviceId: 'hellorchardteam',
    templateId: 'template_3ldkmmt'
};

export const EMOJI_MARKERS = {
    RAIN: '🌧️',
    MAN_NO: '🙅‍♂️',
    WOMAN_NO: '🙅‍♀️'
};

export const generateWeeks = () => {
    const weeks = [];
    let current = new Date(2026, 0, 19);
    const end = new Date(2026, 1, 15);
    while (current <= end) {
        let week = [];
        for (let i = 0; i < 7; i++) {
            if (current <= end) {
                week.push({
                    display: current.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    dayName: current.toLocaleDateString('es-ES', { weekday: 'long' }),
                    iso: current.toISOString().slice(0,10)
                });
            }
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
    }
    return weeks;
};

export const WEEKS = generateWeeks();

// Opciones rápidas de horas
export const hoursOptions = Array.from({ length: 24 }, (_, i) => ((i + 1) / 2).toString());

// Tarifas / constantes usadas en cálculos de salario
export const RATE_NETO = 21.59;
export const RATE_DEDUCCIONES = 4.16;
export const RATE_BRUTO_DISPLAY = '25.75';