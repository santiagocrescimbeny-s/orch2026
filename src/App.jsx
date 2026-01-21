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
        <div className="min-h-screen bg-[#050505] font-sans text-slate-300" style={{ overflowX: 'hidden', width: '100vw', maxWidth: '100%', padding: '0' }}>
            <style>
                {`
                /* Reset y prevención de scroll horizontal */
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                html, body {
                    overflow-x: hidden;
                    width: 100%;
                    max-width: 100vw;
                }
                
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
                    padding: 60px 20px;
                    border-radius: 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    width: 100%;
                    margin: 0 auto 20px;
                    max-width: 100%;
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

                /* Container principal */
                .main-container {
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 16px;
                }

                /* WEEKS / TABLES */
                .weeks-section {
                    display: flex;
                    flex-direction: column;
                    gap: 80px;
                    width: 100%;
                    max-width: 100%;
                }
                .week-wrapper { 
                    position: relative; 
                    width: 100%;
                    max-width: 100%;
                }
                .week-label {
                    position: absolute;
                    top: -2%;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 20;
                    padding: 10px 32px;
                    border-radius: 16px;
                    background: linear-gradient(145deg, #064e3b 0%, #022c22 100%);
                    border: 1px solid #10b981;
                }
                .week-label span { 
                    color: #ffffff; 
                    font-size: clamp(9px, 1.5vw, 12px);
                    font-weight: 900; 
                    text-transform: uppercase; 
                    letter-spacing: 0.4em; 
                    display: inline-block; 
                }

                .week-card {
                    background-color: #ffffff;
                    border-radius: 40px;
                    padding: 48px 16px 24px 16px;
                    border: 1px solid #ecfdf5;
                    overflow: hidden;
                    width: 100%;
                    max-width: 100%;
                }
                
                .table-container {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: visible;
                    -webkit-overflow-scrolling: touch;
                }
                
                .week-table { 
                    width: 100%; 
                    border-collapse: separate; 
                    border-spacing: 0 8px;
                    min-width: 100%;
                }

                /* Responsive date text */
                .week-table thead th {
                    padding: 12px 4px;
                    text-align: center;
                    font-size: 9px;
                    font-weight: 900;
                    color: #64748b;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .week-table thead th .day-abbrev {
                    display: block;
                    color: #10b981;
                    font-weight: 800;
                    font-size: clamp(8px, 1.6vw, 12px);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .week-table thead th .day-display {
                    display: block;
                    color: #064e3b;
                    font-weight: 900;
                    font-size: clamp(12px, 3vw, 16px);
                }
                
                .week-table tbody td {
                    padding: 8px 4px;
                    text-align: center;
                }
                
                .week-table tbody td input {
                    width: clamp(36px, 6.5vw, 52px);
                    min-width: 36px;
                    max-width: 52px;
                    height: clamp(34px, 3.5vw, 38px);
                    text-align: center;
                    background-color: #f8fafc;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    color: #059669;
                    font-weight: 800;
                    font-size: clamp(11px, 1.8vw, 13px);
                    box-sizing: border-box;
                }
                
                .set-all-select {
                    width: clamp(40px, 6.5vw, 65px);
                    min-width: 40px;
                    max-width: 65px;
                    height: clamp(34px, 3.5vw, 36px);
                    background-color: #ffffff;
                    border: 1px solid #d1fae5;
                    border-radius: 12px;
                    color: #064e3b;
                    font-weight: 700;
                    font-size: clamp(9px, 1.6vw, 11px);
                    text-align: center;
                    cursor: pointer;
                    box-sizing: border-box;
                }

                /* Member name responsive */
                .member-name {
                    font-size: clamp(11px, 2.2vw, 14px);
                    font-weight: 800;
                    color: #334155;
                    background-color: #f8fafc;
                }

                /* SALARY CARDS */
                .salary-section {
                    position: relative;
                    background-color: #050505;
                    border: 1px solid rgba(16, 185, 129, 0.1);
                    border-radius: 4rem;
                    padding: 80px 20px;
                    overflow: hidden;
                    width: 100%;
                    max-width: 100%;
                }
                
                .salary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                    width: 100%;
                    max-width: 100%;
                }
                
                .salary-card {
                    position: relative;
                    background-color: #0f0f0f;
                    border: 2px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2.5rem;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    cursor: pointer;
                    min-height: 160px;
                    width: 100%;
                }

                .card-inner {
                    padding: 36px 24px;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                }
                
                .card-left, .card-center, .card-right {
                    min-width: 0;
                    flex: 1;
                }
                
                .card-center {
                    text-align: center;
                }
                
                .card-center h3 {
                    font-size: clamp(1rem, 3.5vw, 1.4rem);
                    line-height: 1;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .card-left p, .card-left .rate { 
                    font-size: 12px; 
                }
                
                .card-left .rate-amount { 
                    font-size: 16px; 
                    font-weight: 800; 
                    color: #fff; 
                }

                .card-right {
                    text-align: right;
                }
                
                .card-right .totalNeto {
                    font-size: clamp(16px, 4vw, 28px);
                    font-weight: 1000;
                    color: #00ffcc;
                    white-space: nowrap;
                }

                .expandable-content {
                    max-height: 0px;
                    opacity: 0;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    background-color: rgba(255,255,255,0.02);
                    border-top: 1px solid rgba(255,255,255,0.05);
                    padding: 0 36px;
                    overflow: hidden;
                }
                
                .expandable-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }

                /* Responsive rules */
                @media (max-width: 1200px) {
                    .hero-section { 
                        padding: 50px 16px; 
                        border-radius: 2.5rem; 
                    }
                    .week-card { 
                        padding: 36px 12px 20px 12px; 
                    }
                    .main-container {
                        padding: 0 12px;
                    }
                }
                
                @media (max-width: 768px) {
                    .main-container {
                        padding: 0 8px;
                    }
                    
                    .camera-container { 
                        width: 56px; 
                        height: 56px; 
                        bottom: 18px; 
                        right: 18px; 
                    }
                    
                    .camera-btn { 
                        width: 50px; 
                        height: 50px; 
                    }
                    
                    .hero-section { 
                        padding: 36px 12px; 
                        border-radius: 1.5rem;
                        margin-bottom: 16px;
                    }
                    
                    .hero-blob { 
                        width: 300px; 
                        height: 140px; 
                        filter: blur(70px); 
                    }

                    .week-label { 
                        padding: 8px 20px; 
                        border-radius: 12px; 
                        top: -16px; 
                    }
                    
                    .week-label span { 
                        font-size: clamp(9px, 1.8vw, 11px); 
                        letter-spacing: 0.3em; 
                    }

                    .weeks-section {
                        gap: 60px;
                    }

                    .week-card { 
                        padding: 28px 8px 16px 8px; 
                        border-radius: 20px; 
                    }
                    
                    .week-table thead th { 
                        padding: 8px 2px; 
                        font-size: 8px; 
                    }
                    
                    .week-table tbody td {
                        padding: 6px 2px;
                    }
                    
                    .week-table tbody td input { 
                        min-width: 32px;
                        max-width: 44px; 
                        height: 36px; 
                        font-size: 12px; 
                    }

                    .set-all-select { 
                        min-width: 36px;
                        max-width: 50px; 
                        height: 34px; 
                        font-size: 10px; 
                    }

                    .salary-section { 
                        padding: 40px 12px; 
                        border-radius: 1.5rem; 
                    }
                    
                    .salary-grid { 
                        grid-template-columns: 1fr; 
                        gap: 14px; 
                    }
                    
                    .salary-card { 
                        border-radius: 1.25rem; 
                    }
                    
                    .card-inner { 
                        padding: 20px 16px; 
                        flex-direction: column; 
                        align-items: center; 
                        text-align: center; 
                        gap: 8px; 
                    }
                    
                    .card-left, .card-center, .card-right { 
                        width: 100%; 
                        text-align: center;
                    }
                    
                    .card-center h3 { 
                        font-size: clamp(1rem, 4.5vw, 1.3rem); 
                        white-space: normal; 
                    }
                    
                    .card-right .totalNeto { 
                        font-size: clamp(18px, 6vw, 24px); 
                    }

                    .expandable-content { 
                        padding: 0 16px; 
                    }
                    
                    .expandable-grid { 
                        grid-template-columns: 1fr; 
                    }
                }
                
                @media (max-width: 480px) {
                    .main-container {
                        padding: 0 6px;
                    }
                    
                    .hero-section {
                        padding: 28px 8px;
                        border-radius: 1.25rem;
                    }
                    
                    .week-table thead th { 
                        font-size: 7px; 
                        padding: 6px 1px; 
                    }
                    
                    .week-table tbody td input { 
                        min-width: 28px;
                        max-width: 40px; 
                        height: 34px; 
                        font-size: 11px;
                        border-radius: 8px;
                    }
                    
                    .week-card { 
                        padding: 24px 4px 12px 4px;
                        border-radius: 16px;
                    }
                    
                    .week-label { 
                        padding: 6px 14px; 
                    }
                    
                    .week-label span { 
                        font-size: 9px; 
                        letter-spacing: 0.22em; 
                    }
                    
                    .set-all-select { 
                        min-width: 32px;
                        max-width: 45px; 
                        height: 32px; 
                        font-size: 9px; 
                    }

                    .card-center h3 { 
                        font-size: 1.3rem; 
                    }
                    
                    .card-right .totalNeto { 
                        font-size: 18px; 
                    }
                    
                    .salary-section {
                        padding: 32px 8px;
                    }
                }

                /* Improve accessibility focus */
                .camera-btn:focus { 
                    box-shadow: 0 0 0 3px rgba(34,211,238,0.18); 
                }
                
                select:focus, input:focus { 
                    outline: 2px solid rgba(16,185,129,0.12); 
                    border-color: rgba(16,185,129,0.3); 
                }
                `}
            </style>

            <div className="camera-container">
                <button onClick={handleScreenshot} disabled={iscapturing} className="camera-btn" aria-label="Capturar pantalla">
                    <Camera size={28} color="white" />
                </button>
            </div>

            <div className="main-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
                <section className="hero-section">
                    <div className="hero-blob" />
                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        <div className="hero-badge">
                            <ShieldCheck className="text-black" size={40} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', fontWeight: '900', letterSpacing: '-0.05em', lineHeight: '1', margin: 0 }}>
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
                            <p style={{ color: '#71717a', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4em', marginTop: '10px' }}>
                                Precision Management System
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 16px',
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

                <div ref={printRef} style={{ width: '100%', maxWidth: '100%' }}>
                    <section className="weeks-section">
                        {WEEKS.map((week, index) => (
                            <div key={index} className="week-wrapper">
                                <div className="week-label">
                                    <span>SEMANA 0{index + 1}</span>
                                </div>
                                <div className="week-card">
                                    <div className="table-container">
                                        <table className="week-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ minWidth: '80px' }}>MIEMBRO / DÍA</th>
                                                    {week.map(day => (
                                                        <th key={day.display}>
                                                            <span className="day-abbrev">{day.dayName.substring(0, 3)}</span>
                                                            <span className="day-display">{day.display}</span>
                                                        </th>
                                                    ))}
                                                    <th style={{ fontSize: '11px', fontWeight: '900', color: '#059669', textTransform: 'uppercase', minWidth: '60px' }}>TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr style={{ backgroundColor: '#f0fdf4', borderRadius: '20px' }}>
                                                    <td style={{ padding: '16px 8px', textAlign: 'center', borderRadius: '20px 0 0 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px', fontWeight: '900', color: '#059669' }}>
                                                            <TrendingUp size={14} /> SET ALL
                                                        </div>
                                                    </td>
                                                    {week.map(day => (
                                                        <td key={`set-all-${day.display}`} style={{ textAlign: 'center' }}>
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
                                                    const nombresFemeninos = ['MARIA', 'ANA', 'LAURA', 'ELENA', 'SARA', 'CARMEN', 'LUCIA', 'CONY', 'GHIS', 'MELANY'];
                                                    const esFemenino = nombresFemeninos.includes(member.toUpperCase());
                                                    return (
                                                        <tr key={member}>
                                                            <td className="member-name" style={{ padding: '16px 8px', textAlign: 'center', borderRadius: '16px 0 0 16px' }}>{member}</td>
                                                            {week.map(day => (
                                                                <td key={day.display} style={{ textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={(hoursData[member] && hoursData[member][day.display]) || ""}
                                                                        onChange={(e) => handleInputChange(member, day.display, e.target.value)}
                                                                        placeholder="0.0"
                                                                        aria-label={`${member} ${day.display}`}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td style={{ padding: '16px 8px', textAlign: 'center', backgroundColor: '#064e3b', borderRadius: '0 16px 16px 0' }}>
                                                                <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '14px' }}>{calculateWeeklyMemberTotal(member, week)}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="salary-section" style={{ marginTop: '60px', padding: '0 20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.04em', margin: 0 }}>
                                Consolidado de <span style={{ color: '#10b981' }}>Gestión Salarial</span>
                            </h2>
                        </div>

                        {/* Contenedor Grid Ajustado */}
                        <div className="salary-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {TEAM_MEMBERS.map(member => {
                                const totalHrs = parseFloat(calculateGrandTotal(member));
                                const rateNeto = 21.59;
                                const rateDeducciones = 4.16;
                                const totalNeto = (totalHrs * rateNeto).toFixed(2);
                                const totalTaxACC = (totalHrs * rateDeducciones).toFixed(2);

                                return (
                                    <div
                                        key={member}
                                        className="salary-card"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            overflow: 'hidden',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            const target = e.currentTarget;
                                            target.style.borderColor = '#22d3ee';
                                            target.style.boxShadow = '0 0 40px rgba(34, 211, 238, 0.15)';
                                            const expandable = target.querySelector('.expandable-content');
                                            if (expandable) {
                                                expandable.style.maxHeight = '500px';
                                                expandable.style.opacity = '1';
                                                expandable.style.paddingTop = '20px';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            const target = e.currentTarget;
                                            target.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                            target.style.boxShadow = 'none';
                                            const expandable = target.querySelector('.expandable-content');
                                            if (expandable) {
                                                expandable.style.maxHeight = '0px';
                                                expandable.style.opacity = '0';
                                                expandable.style.paddingTop = '0px';
                                            }
                                        }}
                                    >
                                        <div className="card-inner" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="card-left">
                                                <p style={{ color: '#52525b', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em', margin: 0 }}>RATE</p>
                                                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '800' }}>$25.75</div>
                                                <div style={{ color: '#00ffcc', fontSize: '13px', fontWeight: '900' }}>$21.59 <span style={{ fontSize: '9px' }}>NET</span></div>
                                            </div>

                                            {/* Nombre Ajustado */}
                                            <div className="card-center" style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                                                <h3 style={{
                                                    color: '#00ffcc',
                                                    fontWeight: '900',
                                                    textTransform: 'uppercase',
                                                    margin: '0 0 4px 0',
                                                    filter: 'drop-shadow(0 0 10px rgba(0, 255, 204, 0.4))',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {member}
                                                </h3>
                                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.85rem', opacity: 0.8 }}>{totalHrs} HORAS</div>
                                            </div>

                                            <div className="card-right" style={{ textAlign: 'right' }}>
                                                <p style={{ color: '#52525b', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em', margin: 0 }}>TOTAL NETO</p>
                                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: '900' }}>${totalNeto}</div>
                                                <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: '800' }}>-${totalTaxACC}</div>
                                            </div>
                                        </div>

                                        <div className="expandable-content" style={{
                                            maxHeight: '0px',
                                            opacity: '0',
                                            overflow: 'hidden',
                                            transition: 'all 0.5s ease',
                                            padding: '0 24px'
                                        }}>
                                            <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                                                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                                    <h4 style={{ color: '#22d3ee', fontSize: '10px', fontWeight: '900', margin: '0 0 4px 0' }}>CÁLCULO BRUTO</h4>
                                                    <p style={{ color: '#a1a1aa', fontSize: '10px', margin: 0 }}>$23.85 + 8% Holiday Pay ($25.75).</p>
                                                </div>
                                                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                                    <h4 style={{ color: '#f43f5e', fontSize: '10px', fontWeight: '900', margin: '0 0 4px 0' }}>DEDUCCIONES IRD</h4>
                                                    <p style={{ color: '#a1a1aa', fontSize: '10px', margin: 0 }}>$3.73 PAYE + $0.43 ACC = $4.16/hr.</p>
                                                </div>
                                            </div>

                                            <div style={{ paddingBottom: '24px', textAlign: 'center' }}>
                                                <a href="https://www.paye.net.nz/calculator/" target="_blank" rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '8px 16px',
                                                        backgroundColor: 'rgba(34, 211, 238, 0.1)',
                                                        border: '1px solid #22d3ee',
                                                        borderRadius: '10px',
                                                        color: '#22d3ee',
                                                        fontSize: '10px',
                                                        fontWeight: '900',
                                                        textDecoration: 'none'
                                                    }}>
                                                    CALCULADORA OFICIAL NZ
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