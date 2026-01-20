import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from "firebase/database";

const TEAM_MEMBERS = ["Santiago", "Alan", "Ghis", "Diego", "Joy", "Juan", "Melany"];

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
    <div className="min-h-screen bg-white p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER PROFESIONAL */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-black p-8 rounded-3xl shadow-sm border border-slate-800/40 gap-4">
          <div className="space-y-1 text-center md:text-center w-full">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-emerald-700 p-2.5 rounded-2xl shadow-lg shadow-emerald-200/20">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Orchar <span className="text-emerald-400">Portal</span>
              </h1>
            </div>
            <p className="text-emerald-200 font-medium flex items-center gap-2 justify-center">
              <Calendar size={16} className="text-emerald-300" /> <span className="ml-1">Periodo Fiscal: 19 Ene — 15 Feb 2026</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {isOnline ? 'Cloud Sync Activo' : 'Reconectando...'}
              </span>
            </div>
          </div>
        </header>

        {/* TABLAS SEMANALES */}
        <div className="space-y-12">
          {WEEKS.map((week, index) => (
            <div key={index} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-300/50">
              <div className="bg-black px-8 py-5 flex flex-col md:flex-row justify-between items-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">
                    Week 0{index + 1}
                  </span>
                  <h2 className="font-bold text-white text-sm text-center">
                    {week[0].display} <span className="text-slate-500 mx-2">—</span> {week[week.length-1].display}
                  </h2>
                </div>
                <Users size={18} className="text-emerald-300 mt-3 md:mt-0" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] uppercase font-bold tracking-widest">
                      <th className="p-6 border-b border-slate-800">Consultor</th>
                      {week.map(day => (
                        <th key={day.display} className="p-6 border-b border-slate-100 text-center">
                          <span className="text-emerald-300 block text-[10px] mb-1">{day.dayName.substring(0,3)}</span>
                          <span className="text-white text-sm font-black">{day.display}</span>
                        </th>
                      ))}
                      <th className="p-6 border-b border-emerald-100 text-center bg-emerald-50/50 text-emerald-700 font-black">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TEAM_MEMBERS.map((member) => (
                      <tr key={member} className="group hover:bg-emerald-50/40 transition-all">
                        <td className="p-6 font-semibold text-slate-700 group-hover:text-emerald-700 text-center md:text-left">{member}</td>
                        {week.map(day => (
                          <td key={day.display} className="p-2 text-center">
                            <input 
                              type="text"
                              value={(hoursData[member] && hoursData[member][day.display]) || ""}
                              onChange={(e) => handleInputChange(member, day.display, e.target.value)}
                              placeholder="0"
                              className="w-14 p-2.5 text-center bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 outline-none text-sm font-medium transition-all hover:border-slate-300"
                            />
                          </td>
                        ))}
                        <td className="p-6 text-center bg-emerald-50/20 font-black text-emerald-700 text-base">
                          {calculateWeeklyMemberTotal(member, week)}<span className="text-[10px] ml-1 opacity-60">h</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* DASHBOARD DE TOTALES FINALES */}
        <section className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-100 border border-emerald-100">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10">
            <div className="space-y-1 text-center md:text-left w-full">
              <h3 className="text-2xl font-black text-slate-900 flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                <TrendingUp className="text-emerald-600" /> <span className="mt-2 md:mt-0">Rendimiento Consolidado</span>
              </h3>
              <p className="text-slate-500 font-medium text-center md:text-left">Acumulado total por consultor en el periodo actual</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_MEMBERS.map(member => (
              <div key={member} className="relative group overflow-hidden bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock size={60} />
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">{member}</span>
                <div className="mt-2 flex items-baseline gap-1 justify-center md:justify-start">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">
                    {calculateGrandTotal(member)}
                  </span>
                  <span className="text-emerald-500 font-bold text-sm italic">horas</span>
                </div>
                <div className="mt-4 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((parseFloat(calculateGrandTotal(member)) / 160) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center pb-10 text-slate-400 text-xs font-medium tracking-widest uppercase">
          Orchar Management System © 2026 • Secure Enterprise Sync
        </footer>
      </div>
    </div>
  );
}

export default App;