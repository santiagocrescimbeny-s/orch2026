import { useState, useEffect } from 'react';
import { Clock, Calendar, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from "firebase/database";

const TEAM_MEMBERS = ["Santiago", "Alan", "Ghis", "Diego", "Cony", "Juan", "Melany"];

const generateWeeks = () => {
    const weeks = [];
    let current = new Date(2026, 0, 19);
    const end = new Date(2026, 1, 15);
    while (current <= end) {
        let week = [];
        for (let i = 0; i < 7; i++) {
            if (current <= end) {
                week.push({
                    display: current.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    dayName: current.toLocaleDateString('es-ES', { weekday: 'long' })
                });
            }
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
    }
    return weeks;
};

const WEEKS = generateWeeks();

function App() {
    const [hoursData, setHoursData] = useState({});
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        const hoursRef = ref(db, 'work_hours/');
        return onValue(hoursRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setHoursData(data);
                setIsOnline(true);
            } else {
                const initial = TEAM_MEMBERS.reduce((acc, name) => { acc[name] = {}; return acc; }, {});
                setHoursData(initial);
            }
        }, () => setIsOnline(false));
    }, []);

    const syncWithFirebase = (newData) => set(ref(db, 'work_hours/'), newData);

    const handleInputChange = (member, dateLabel, value) => {
        const newData = { ...hoursData, [member]: { ...(hoursData[member] || {}), [dateLabel]: value } };
        setHoursData(newData);
        syncWithFirebase(newData);
    };

    const parseHours = (val) => {
        if (!val) return 0;
        const strVal = String(val).replace(',', '.');
        if (strVal.includes(':')) {
            const [h, m] = strVal.split(':');
            return parseFloat(h) + (parseInt(m || 0) / 60);
        }
        return parseFloat(strVal) || 0;
    };

    const calculateWeeklyMemberTotal = (member, weekDays) => {
        return weekDays.reduce((sum, day) => sum + parseHours((hoursData[member] && hoursData[member][day.display]) || 0), 0).toFixed(2);
    };

    const calculateGrandTotal = (member) => {
        return Object.values(hoursData[member] || {}).reduce((sum, val) => sum + parseHours(val), 0).toFixed(2);
    };

    return (
        <div className="min-h-screen bg-[#050505] p-4 md:p-8 font-sans text-slate-300">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* --- SECCIÓN 1: HERO / HEADER --- */}
                <section className="relative overflow-hidden bg-zinc-900/40 border border-white/5 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center text-center">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="bg-gradient-to-br from-emerald-400 to-emerald-800 p-4 rounded-3xl shadow-2xl shadow-emerald-500/20">
                            <ShieldCheck className="text-black" size={32} strokeWidth={2.5} />
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter">
                            <span className="text-white">Orchar</span>
                            <span 
                                className="ml-3 italic"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #064e3b 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    display: 'inline-block'
                                }}
                            >
                                TEAM
                            </span>
                        </h1>
                        
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold tracking-[0.2em] text-emerald-400">
                                <Calendar size={14} /> 19 ENE — 15 FEB 2026
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                                    {isOnline ? 'Cloud Sync Active' : 'Offline Mode'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SECCIÓN 2: TABLAS DE TRABAJO --- */}
                <section className="space-y-20">
                    {WEEKS.map((week, index) => (
                        <div key={index} className="relative group">
                            {/* Etiqueta de Semana Flotante Centrada */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                                <div className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-black text-sm shadow-xl shadow-emerald-500/20 uppercase tracking-widest">
                                    Semana 0{index + 1}
                                </div>
                            </div>

                            <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] pt-12 pb-6 px-4 overflow-hidden shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-emerald-500/20">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-separate border-spacing-y-2">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">Miembro</th>
                                                {week.map(day => (
                                                    <th key={day.display} className="px-4 py-4 text-center">
                                                        <span className="block text-[10px] font-bold text-emerald-500/50 uppercase tracking-tighter">{day.dayName.substring(0, 3)}</span>
                                                        <span className="text-white text-sm font-black tracking-widest">{day.display}</span>
                                                    </th>
                                                ))}
                                                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-emerald-500">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TEAM_MEMBERS.map((member) => (
                                                <tr key={member} className="group/row transition-all">
                                                    <td className="p-4 text-center font-bold text-slate-200 bg-white/5 rounded-l-2xl group-hover/row:bg-emerald-500/10 group-hover/row:text-white transition-colors">
                                                        {member}
                                                    </td>
                                                    {week.map(day => (
                                                        <td key={day.display} className="p-2 text-center bg-white/[0.02] group-hover/row:bg-white/[0.04] transition-colors">
                                                            <input
                                                                type="text"
                                                                value={(hoursData[member] && hoursData[member][day.display]) || ""}
                                                                onChange={(e) => handleInputChange(member, day.display, e.target.value)}
                                                                placeholder="-"
                                                                className="w-12 h-10 text-center bg-black/40 border border-white/5 rounded-xl focus:border-emerald-500 outline-none text-emerald-400 font-bold transition-all placeholder:text-zinc-800 focus:ring-4 focus:ring-emerald-500/5"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="p-4 text-center bg-emerald-500/5 rounded-r-2xl group-hover/row:bg-emerald-500/20 transition-all border-l border-emerald-500/10">
                                                        <span className="text-base font-black text-emerald-400">{calculateWeeklyMemberTotal(member, week)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="bg-zinc-950 border border-emerald-500/10 rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-inner">
                    <div className="flex flex-col items-center gap-4 mb-16 text-center">
                        <TrendingUp className="text-emerald-500 animate-bounce" size={48} />
                        <h2 className="text-4xl font-black text-white tracking-tight">Consolidado de Gestión</h2>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TEAM_MEMBERS.map(member => (
                            <div key={member} className="group bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-4 border border-white/10 group-hover:border-emerald-500/50 transition-all">
                                    <Users size={20} className="text-slate-500 group-hover:text-emerald-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">{member}</span>
                                <div className="my-4">
                                    <span className="text-5xl font-black text-white tracking-tighter italic">
                                        {calculateGrandTotal(member)}
                                    </span>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Horas Totales</p>
                                </div>
                                {/* Barra de progreso mini */}
                                <div className="w-full bg-black rounded-full h-1.5 p-[2px] mt-4 border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                        style={{ width: `${Math.min((parseFloat(calculateGrandTotal(member)) / 160) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="flex flex-col items-center gap-6 pb-20">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center gap-4 text-slate-600 font-bold uppercase tracking-[0.5em] text-[10px]">
                        <div className="w-2 h-2 bg-emerald-900 rounded-full" />
                        Orchar Management System © 2026
                        <div className="w-2 h-2 bg-emerald-900 rounded-full" />
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;