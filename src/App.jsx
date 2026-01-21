import { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, Users, TrendingUp, ShieldCheck, Camera } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from "firebase/database";
import html2canvas from 'html2canvas';

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
    const [iscapturing, setIsCapturing] = useState(false);
    const printRef = useRef();

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

    const handleSetAll = (dateLabel, value) => {
        const isClearAction = value === "CLEAR";
        const mensaje = isClearAction
            ? `¿Deseas LIMPIAR todas las horas del equipo para el día ${dateLabel}?`
            : `¿Aplicar ${value}h a todo el equipo para el día ${dateLabel}?`;

        if (window.confirm(mensaje)) {
            const newData = { ...hoursData };
            const finalValue = isClearAction ? "" : value;
            TEAM_MEMBERS.forEach(member => {
                if (!newData[member]) newData[member] = {};
                newData[member][dateLabel] = finalValue;
            });
            setHoursData(newData);
            syncWithFirebase(newData);
        }
    };

    const parseHours = (val) => {
        if (!val || val === "") return 0;
        let strVal = String(val).replace(',', '.');
        if (strVal.includes(':')) {
            const [h, m] = strVal.split(':');
            return parseFloat(h || 0) + (parseInt(m || 0) / 60);
        }
        return parseFloat(strVal) || 0;
    };

    const calculateWeeklyMemberTotal = (member, weekDays) => {
        return weekDays.reduce((sum, day) => sum + parseHours((hoursData[member] && hoursData[member][day.display]) || 0), 0).toFixed(2);
    };

    const calculateGrandTotal = (member) => {
        return Object.values(hoursData[member] || {}).reduce((sum, val) => sum + parseHours(val), 0).toFixed(2);
    };

    const handleScreenshot = async () => {
        if (iscapturing) return;
        setIsCapturing(true);
        try {
            const element = printRef.current;
            const canvas = await html2canvas(element, {
                backgroundColor: '#050505',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const data = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = data;
            link.download = `Orchard_Report_${new Date().toLocaleDateString()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Screenshot failed', e);
            alert('No se pudo generar la captura. Intenta nuevamente.');
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-4 md:p-8 font-sans text-slate-300">
            <style>
                {`
                /* Animaciones y estilos globales */
                @keyframes camera-glow-30s {
                    0%, 90%, 100% { border-color: rgba(255,255,255,0.1); }
                    92% { background-color: #00ffff; box-shadow: 0 0 20px #00ffff; }
                    95% { background-color: #2563eb; box-shadow: 0 0 20px #2563eb; }
                }
                @keyframes double-flash {
                    0%, 15%, 30%, 45%, 100% { opacity: 0; transform: scale(1); }
                    5%, 20% { opacity: 1; transform: scale(5); filter: blur(15px); }
                }

                /* Camera button fixed */
                .camera-container {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 1000;
                    width: 70px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .camera-container::before {
                    content: '';
                    position: absolute;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(0,255,255,1) 0%, rgba(255,255,255,1) 40%, transparent 70%);
                    opacity: 0;
                    pointer-events: none;
                }
                .camera-container:hover::before {
                    animation: double-flash 0.7s ease-out;
                }
                .camera-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.1);
                    background-color: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    outline: none;
                    animation: camera-glow-30s 30s infinite;
                    position: relative;
                    z-index: 2;
                }
                .camera-container:hover .camera-btn {
                    background-color: #000000 !important;
                    border: 3px solid #00ff00 !important;
                    box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
                }
                .camera-container:hover .lucide-camera {
                    color: #2563eb !important;
                }

                /* HERO */
                .hero-section {
                    position: relative;
                    overflow: hidden;
                    background-color: #09090b;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 80px 20px;
                    border-radius: 4rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    width: 100%;
                    margin-bottom: 15px;
                }
                .hero-blob {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 400px;
                    height: 200px;
                    background-color: rgba(16, 185, 129, 0.15);
                    filter: blur(100px);
                    pointer-events: none;
                }
                .hero-badge {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 20px;
                    border-radius: 2rem;
                    box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3);
                    display: inline-flex;
                }

                /* WEEKS / TABLES */
                .weeks-section {
                    display: flex;
                    flex-direction: column;
                    gap: 80px;
                    padding: 20px;
                }
                .week-wrapper { position: relative; }
                .week-label {
                    position: absolute;
                    top: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 20;
                    padding: 10px 32px;
                    border-radius: 16px;
                    background: linear-gradient(145deg, #064e3b 0%, #022c22 100%);
                    border: 1px solid #10b981;
                }
                .week-card {
                    background-color: #ffffff;
                    border-radius: 40px;
                    padding: 48px 24px 24px 24px;
                    border: 1px solid #ecfdf5;
                    overflow-x: auto;
                }
                .week-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 720px; }

                .week-table thead th {
                    padding: 16px;
                    text-align: center;
                    font-size: 10px;
                    font-weight: 900;
                    color: #64748b;
                    text-transform: uppercase;
                }
                .week-table tbody td input {
                    width: 52px;
                    height: 38px;
                    text-align: center;
                    background-color: #f8fafc;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    color: #059669;
                    font-weight: 800;
                    font-size: 14px;
                }
                .set-all-select {
                    width: 65px;
                    height: 36px;
                    background-color: #ffffff;
                    border: 1px solid #d1fae5;
                    border-radius: 12px;
                    color: #064e3b;
                    font-weight: 700;
                    text-align: center;
                    cursor: pointer;
                }

                /* SALARY CARDS */
                .salary-section {
                    position: relative;
                    background-color: #050505;
                    border: 1px solid rgba(16, 185, 129, 0.1);
                    border-radius: 4rem;
                    padding: 80px 40px;
                    overflow: hidden;
                }
                .salary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }
                .salary-card {
                    position: relative;
                    background-color: #0f0f0f;
                    border: 2px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2.5rem;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    cursor: pointer;
                }
                .expandable-content {
                    max-height: 0px;
                    opacity: 0;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    background-color: rgba(255,255,255,0.02);
                    border-top: 1px solid rgba(255,255,255,0.05);
                    padding: 0 40px;
                }

                /* Responsive rules */
                @media (max-width: 1200px) {
                    .hero-section { padding: 60px 18px; border-radius: 2.5rem; }
                    .week-card { padding: 28px 18px 18px 18px; }
                    .week-table { min-width: 680px; }
                    .salary-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 768px) {
                    .camera-container { width: 56px; height: 56px; bottom: 18px; right: 18px; }
                    .camera-btn { width: 50px; height: 50px; }
                    .hero-section { padding: 36px 16px; border-radius: 1.5rem; }
                    .hero-blob { width: 300px; height: 140px; filter: blur(70px); }
                    .week-card { padding: 20px 12px 12px 12px; border-radius: 20px; }
                    .week-table { min-width: 620px; }
                    .week-table thead th { padding: 8px; font-size: 9px; }
                    .week-table tbody td input { width: 44px; height: 36px; font-size: 13px; }
                    .set-all-select { width: 54px; height: 34px; }
                    .salary-section { padding: 48px 20px; border-radius: 2rem; }
                    .salary-grid { grid-template-columns: 1fr; gap: 16px; }
                    .salary-card { border-radius: 1.5rem; }
                    .expandable-content { padding: 0 20px; }
                }
                @media (max-width: 420px) {
                    .week-table { min-width: 520px; }
                    .week-table tbody td input { width: 40px; height: 34px; font-size: 12px; }
                    .hero-section { padding: 28px 12px; }
                }

                /* Improve accessibility focus */
                .camera-btn:focus { box-shadow: 0 0 0 3px rgba(34,211,238,0.18); }
                select:focus, input:focus { outline: 2px solid rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }

                `}
            </style>

            <div className="camera-container">
                <button onClick={handleScreenshot} disabled={iscapturing} className="camera-btn" aria-label="Capturar pantalla">
                    <Camera size={28} color="white" />
                </button>
            </div>

            <div className="max-w-7xl mx-auto space-y-16">
                <section className="hero-section">
                    <div className="hero-blob" />
                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
                        <div className="hero-badge">
                            <ShieldCheck className="text-black" size={40} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 4rem)', fontWeight: '900', letterSpacing: '-0.05em', lineHeight: '1', margin: 0 }}>
                                <span style={{ color: '#ffffff' }}>Orchard</span>
                                <br />
                                <span style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #064e3b 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontStyle: 'italic',
                                    display: 'inline-block'
                                }}>TEAM</span>
                            </h1>
                            <p style={{ color: '#71717a', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4em', marginTop: '12px' }}>
                                Precision Management System
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 20px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: '1rem',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#ecfdf5'
                            }}>
                                <Calendar size={16} style={{ color: '#10b981' }} />
                                <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.1em' }}>
                                    19 ENE / 15 FEB 2026
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
                                    {isOnline && <span style={{ position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#4ade80', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />}
                                    <span style={{ position: 'relative', display: 'inline-flex', height: '8px', width: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : '#f43f5e' }} />
                                </span>
                                <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#52525b' }}>
                                    {isOnline ? 'System Harvested' : 'Winter Dormancy'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <div ref={printRef} className="space-y-16">
                    <section className="weeks-section">
                        {WEEKS.map((week, index) => (
                            <div key={index} className="week-wrapper">
                                <div className="week-label">
                                    <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Semana 0{index + 1}</span>
                                </div>
                                <div className="week-card">
                                    <table className="week-table">
                                        <thead>
                                            <tr>
                                                <th>Miembro / Día</th>
                                                {week.map(day => (
                                                    <th key={day.display}>
                                                        <span style={{ display: 'block', fontSize: '9px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>{day.dayName.substring(0, 3)}</span>
                                                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#064e3b' }}>{day.display}</span>
                                                    </th>
                                                ))}
                                                <th style={{ fontSize: '11px', fontWeight: '900', color: '#059669', textTransform: 'uppercase' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ backgroundColor: '#f0fdf4', borderRadius: '20px' }}>
                                                <td style={{ padding: '16px', textAlign: 'center', borderRadius: '20px 0 0 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px', fontWeight: '900', color: '#059669' }}>
                                                        <TrendingUp size={14} /> SET ALL
                                                    </div>
                                                </td>
                                                {week.map(day => (
                                                    <td key={`set-all-${day.display}`} style={{ padding: '8px', textAlign: 'center' }}>
                                                        <select
                                                            value=""
                                                            onChange={(e) => handleSetAll(day.display, e.target.value)}
                                                            className="set-all-select"
                                                        >
                                                            <option value="">+</option>
                                                            <option value="CLEAR" style={{ color: 'red', fontWeight: 'bold' }}> - </option>
                                                            {Array.from({ length: 24 }, (_, i) => (i + 1) / 2).map((val) => (
                                                                <option key={val} value={val}>{val}h</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                ))}
                                                <td style={{ borderRadius: '0 20px 20px 0' }}></td>
                                            </tr>
                                            <tr style={{ height: '12px' }}></tr>
                                            {TEAM_MEMBERS.map((member) => {
                                                const nombresFemeninos = ['MARIA', 'ANA', 'LAURA', 'ELENA', 'SARA', 'CARMEN', 'LUCIA', 'CONY', 'GHIIS', 'MELANY'];
                                                const esFemenino = nombresFemeninos.includes(member.toUpperCase());
                                                return (
                                                    <tr key={member}>
                                                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: '800', fontSize: '13px', color: esFemenino ? '#022c22' : '#334155', backgroundColor: '#f8fafc', borderRadius: '16px 0 0 16px' }}>{member}</td>
                                                        {week.map(day => (
                                                            <td key={day.display} style={{ padding: '8px', textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                                                                <input
                                                                    type="text"
                                                                    value={(hoursData[member] && hoursData[member][day.display]) || ""}
                                                                    onChange={(e) => handleInputChange(member, day.display, e.target.value)}
                                                                    placeholder="0.0"
                                                                    aria-label={`${member} ${day.display}`}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td style={{ padding: '16px', textAlign: 'center', backgroundColor: '#064e3b', borderRadius: '0 16px 16px 0' }}>
                                                            <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '14px' }}>{calculateWeeklyMemberTotal(member, week)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="salary-section">
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.04em', margin: 0 }}>
                                Consolidado de <span style={{ color: '#10b981' }}>Gestión Salarial</span>
                            </h2>
                        </div>

                        <div className="salary-grid">
                            {TEAM_MEMBERS.map(member => {
                                const totalHrs = parseFloat(calculateGrandTotal(member));
                                const rateGrossTotal = 25.75;
                                const rateNeto = 21.59;
                                const rateDeducciones = 4.16;
                                const totalNeto = (totalHrs * rateNeto).toFixed(2);
                                const totalTaxACC = (totalHrs * rateDeducciones).toFixed(2);

                                return (
                                    <div
                                        key={member}
                                        className="salary-card"
                                        onMouseEnter={(e) => {
                                            const target = e.currentTarget;
                                            if (target && target.style) {
                                                target.style.borderColor = '#22d3ee';
                                                target.style.boxShadow = '0 0 40px rgba(34, 211, 238, 0.15)';
                                            }
                                            const expandable = target.querySelector('.expandable-content');
                                            if (expandable instanceof HTMLElement) {
                                                expandable.style.maxHeight = '500px';
                                                expandable.style.opacity = '1';
                                                expandable.style.paddingTop = '20px';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const target = e.currentTarget;
                                            if (target && target.style) {
                                                target.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                                target.style.boxShadow = 'none';
                                            }
                                            const expandable = target.querySelector('.expandable-content');
                                            if (expandable instanceof HTMLElement) {
                                                expandable.style.maxHeight = '0px';
                                                expandable.style.opacity = '0';
                                                expandable.style.paddingTop = '0px';
                                            }
                                        }}
                                    >
                                        <div style={{ padding: '28px', position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ color: '#52525b', fontSize: '10px', fontWeight: '900', letterSpacing: '0.2em' }}>HOURLY RATE</p>
                                                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: '800' }}>$25.75 <span style={{ fontSize: '10px', color: '#71717a' }}>GROSS</span></div>
                                                    <div style={{ color: '#00ffcc', fontSize: '20px', fontWeight: '900' }}>$21.59 <span style={{ fontSize: '10px', color: '#00ffcc' }}>NETO</span></div>
                                                </div>
                                                <div style={{ flex: 2, textAlign: 'center' }}>
                                                    <h3 style={{ fontSize: '2.4rem', fontWeight: '1000', color: '#00ffcc', textTransform: 'uppercase', margin: '0', filter: 'drop-shadow(0 0 15px rgba(0, 255, 204, 0.6))' }}>{member}</h3>
                                                    <div style={{ color: '#fff', fontWeight: '800', fontSize: '1rem' }}>{totalHrs} HORAS</div>
                                                </div>
                                                <div style={{ flex: 1.2, textAlign: 'right' }}>
                                                    <p style={{ color: '#52525b', fontSize: '10px', fontWeight: '900', letterSpacing: '0.2em' }}>TOTAL NETO</p>
                                                    <div style={{ fontSize: '28px', fontWeight: '1000', color: '#00ffcc' }}>${totalNeto}</div>
                                                    <div style={{ fontSize: '12px', color: '#f43f5e', fontWeight: '800' }}>-${totalTaxACC} <span style={{ fontSize: '10px' }}>TAX/ACC</span></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="expandable-content">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                                <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                    <h4 style={{ color: '#22d3ee', fontSize: '11px', fontWeight: '900', marginBottom: '8px' }}>CÁLCULO BRUTO</h4>
                                                    <p style={{ color: '#a1a1aa', fontSize: '10px', lineHeight: '1.6' }}>Multiplicación de horas por <b>$25.75</b>. Incluye base de $23.85 más el <b>8% de Holiday Pay</b>.</p>
                                                </div>
                                                <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                    <h4 style={{ color: '#f43f5e', fontSize: '11px', fontWeight: '900', marginBottom: '8px' }}>DEDUCCIONES IRD</h4>
                                                    <p style={{ color: '#a1a1aa', fontSize: '10px', lineHeight: '1.6' }}>Retención de <b>$4.16/hr</b>. Desglose: <b>$3.73 PAYE</b> y <b>$0.43 ACC</b>.</p>
                                                </div>
                                                <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                    <h4 style={{ color: '#00ffcc', fontSize: '11px', fontWeight: '900', marginBottom: '8px' }}>PAGO NETO</h4>
                                                    <p style={{ color: '#a1a1aa', fontSize: '10px', lineHeight: '1.6' }}>Representa el dinero real disponible tras obligaciones fiscales en NZ.</p>
                                                </div>
                                            </div>
                                            <div style={{ paddingBottom: '40px', textAlign: 'center' }}>
                                                <a
                                                    href="https://www.paye.net.nz/calculator/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '12px 24px',
                                                        backgroundColor: 'rgba(34, 211, 238, 0.1)',
                                                        border: '1px solid #22d3ee',
                                                        borderRadius: '15px',
                                                        color: '#22d3ee',
                                                        fontSize: '12px',
                                                        fontWeight: '900',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const el = e.currentTarget;
                                                        if (el && el.style) {
                                                            el.style.backgroundColor = '#22d3ee';
                                                            el.style.color = '#000';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        const el = e.currentTarget;
                                                        if (el && el.style) {
                                                            el.style.backgroundColor = 'rgba(34, 211, 238, 0.1)';
                                                            el.style.color = '#22d3ee';
                                                        }
                                                    }}
                                                >
                                                    ABRIR CALCULADORA OFICIAL NZ
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default App;