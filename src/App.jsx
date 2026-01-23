import { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, ShieldCheck, Camera, MapPin } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from "firebase/database";
import html2canvas from 'html2canvas';
import emailjs from '@emailjs/browser';

// Map (Leaflet) imports
// NOTE: Requires these packages installed: react-leaflet, leaflet
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths when bundlers don't handle them automatically
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TEAM_MEMBERS = ["Santiago", "Alan", "Ghis", "Diego", "Cony", "Juan", "Melany"];

const EMAILS = {
    Santiago: 'santiagocrescimbeny@gmail.com',
    Alan: 'alan.carrizo@hotmail.com',
    Ghis: 'ghislayne.gr@gmail.com',
    Diego: 'diegomartinaviles@gmail.com',
    Cony: 'kony.e.r@gmail.com',
    Juan: 'juanr00729@gmail.com',
    Melany: 'melagimenez5@gmail.com'
};

const EMAILJS_CONFIG = {
    publicKey: 'wri9yLRhHrRSpDay5',
    serviceId: 'hellorchardteam',
    templateId: 'template_3ldkmmt'
};

const EMOJI_MARKERS = {
    RAIN: '🌧️',
    MAN_NO: '🙅‍♂️',
    WOMAN_NO: '🙅‍♀️'
};

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

const WEEKS = generateWeeks();

function App() {
    const [hoursData, setHoursData] = useState({});
    const [locations, setLocations] = useState({}); // { [dateLabel]: { lat, lng, name } }
    const [isOnline, setIsOnline] = useState(false);
    const [iscapturing, setIsCapturing] = useState(false);
    const [countdowns, setCountdowns] = useState({});
    const [flashes, setFlashes] = useState({});
    const [notices, setNotices] = useState({});
    const [openDropdowns, setOpenDropdowns] = useState({}); // track per-day set-all dropdown open state
    const [openMapModal, setOpenMapModal] = useState(null); // dateLabel for which modal is open
    const printRef = useRef();
    const intervalsRef = useRef({});

    useEffect(() => {
        const hoursRef = ref(db, 'work_hours/');
        const unsubscribeHours = onValue(hoursRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setHoursData(data);
                setIsOnline(true);
            } else {
                const initial = TEAM_MEMBERS.reduce((acc, name) => { acc[name] = {}; return acc; }, {});
                setHoursData(initial);
            }
        }, () => setIsOnline(false));

        const locRef = ref(db, 'work_locations/');
        const unsubscribeLoc = onValue(locRef, (snap) => {
            const data = snap.val();
            if (data) setLocations(data);
            else setLocations({});
        });

        return () => {
            unsubscribeHours();
            unsubscribeLoc();
        };
    }, []);

    useEffect(() => {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    }, []);

    useEffect(() => {
        return () => {
            Object.values(intervalsRef.current).forEach(id => clearInterval(id));
        };
    }, []);

    // close dropdowns when clicking outside
    useEffect(() => {
        const handleDocClick = () => {
            setOpenDropdowns({});
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    const syncWithFirebase = (newData) => set(ref(db, 'work_hours/'), newData);
    const syncLocations = (newLocs) => set(ref(db, 'work_locations/'), newLocs);

    const handleInputChange = (member, dateLabel, value) => {
        const newData = { ...hoursData, [member]: { ...(hoursData[member] || {}), [dateLabel]: value } };
        setHoursData(newData);
        syncWithFirebase(newData);
    };

    const handleSetAll = (dateLabel, value) => {
        const isClearAction = value === "CLEAR";
        const mensaje = isClearAction
            ? `¿Deseas LIMPIAR todas las horas del equipo para el día ${dateLabel}?`
            : `¿Aplicar "${value}" a todo el equipo para el día ${dateLabel}?`;

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
        setOpenDropdowns(prev => ({ ...prev, [dateLabel]: false }));
    };

    const setLocationForDate = async (dateLabel, lat, lng) => {
        // reverse geocode with Nominatim for readable name
        let name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            if (res.ok) {
                const json = await res.json();
                if (json && json.display_name) name = json.display_name;
            }
        } catch (e) {
            console.warn('Reverse geocode failed', e);
        }
        const newLocs = { ...locations, [dateLabel]: { lat, lng, name } };
        setLocations(newLocs);
        syncLocations(newLocs);
    };

    const isEmojiMarker = (v) => {
        return v === EMOJI_MARKERS.RAIN || v === EMOJI_MARKERS.MAN_NO || v === EMOJI_MARKERS.WOMAN_NO;
    };

    const parseHours = (val) => {
        if (!val || val === "" || isEmojiMarker(val)) return 0;
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

    const formatNumber = (value) => {
        const num = Number(value || 0);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const sendEmailToMember = async (member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC, recipient) => {
        const templateParams = {
            recipient_email: recipient,
            member_name: member,
            total_hours: Number(totalHrs).toFixed(2),
            rate_neto: formatNumber(rateNeto),
            rate_deducciones: formatNumber(rateDeducciones),
            total_neto: formatNumber(totalNeto),
            total_tax: formatNumber(totalTaxACC)
        };

        try {
            console.log('📤 Enviando email a:', recipient);
            console.log('📋 Datos:', templateParams);

            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                templateParams
            );

            console.log('✅ Email enviado exitosamente:', response.status, response.text);

            setNotices(n => ({ ...n, [member]: '✉️ Email enviado con éxito!' }));
            setTimeout(() => {
                setNotices(n => {
                    const copy = { ...n };
                    delete copy[member];
                    return copy;
                });
            }, 4000);

        } catch (error) {
            console.error('❌ Error al enviar email:', error);

            setNotices(n => ({ ...n, [member]: '⚠️ Error al enviar email' }));
            setTimeout(() => {
                setNotices(n => {
                    const copy = { ...n };
                    delete copy[member];
                    return copy;
                });
            }, 4000);

            alert(`Error al enviar email a ${member}: ${error.text || error.message}`);
        }
    };

    const buildPlainEmail = (member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC) => {
        const hrs = Number(totalHrs || 0).toFixed(2);
        const rateNetoFmt = formatNumber(rateNeto);
        const rateDeduccionesFmt = formatNumber(rateDeducciones);
        const totalNetoFmt = formatNumber(totalNeto);
        const totalTaxACCFmt = formatNumber(totalTaxACC);

        const lines = [
            `Hola ${member},`,
            ``,
            `Resumen de pago:`,
            `Horas totales: ${hrs} hrs`,
            `Rate neto (por hora): $${rateNetoFmt}`,
            `Total Neto: $${totalNetoFmt}`,
            `Deducciones (ACC / IRD): -$${totalTaxACCFmt}`,
            ``,
            `Detalle adicional:`,
            `CÁLCULO BRUTO: $23.85 + 8% Holiday Pay ($25.75).`,
            `DEDUCCIONES IRD: $3.73 PAYE + $0.43 ACC = $${rateDeduccionesFmt}/hr.`,
            ``,
            `Saludos,`,
            `Orchard TEAM`
        ];
        return lines.join('\n');
    };

    const buildHtmlTemplate = (member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC) => {
        const hrs = Number(totalHrs || 0).toFixed(2);
        const rateNetoFmt = formatNumber(rateNeto);
        const rateDeduccionesFmt = formatNumber(rateDeducciones);
        const totalNetoFmt = formatNumber(totalNeto);
        const totalTaxACCFmt = formatNumber(totalTaxACC);

        return `
            <!doctype html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <title>Resumen de Pago - ${member}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background: #f6fbf7; margin: 0; padding: 24px; color: #0f172a; }
                .card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(6,95,70,0.08); border: 1px solid rgba(6,95,70,0.06); }
                .header { background: linear-gradient(90deg,#064e3b,#10b981); color: #fff; padding: 20px 28px; }
                .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
                .content { padding: 20px 28px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th { text-align: left; padding: 10px 12px; background: #e6fff5; color: #064e3b; font-weight: 800; font-size: 13px; border-bottom: 1px solid rgba(6,95,70,0.06); }
                td { padding: 10px 12px; border-bottom: 1px solid #f1f7f3; color: #0f172a; font-size: 14px; }
                .monetary { font-weight: 900; color: #064e3b; }
                .negative { color: #ef4444; font-weight: 900; }
                .footer { padding: 16px 28px; font-size: 13px; color: #475569; }
                .cta { display:inline-block; padding:10px 14px; background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:800;margin-top:12px; }
              </style>
            </head>
            <body>
              <div class="card" role="article" aria-label="Resumen de pago ${member}">
                <div class="header">
                  <h1>Resumen de Pago | Orchard TEAM</h1>
                </div>
                <div class="content">
                  <p style="margin:0 0 8px 0;">Hola <strong>${member}</strong>,</p>
                  <p style="margin:0 0 12px 0;color:#334155;">Adjunto encontrarás el detalle de tu pago.</p>

                  <table role="table" aria-label="Detalle salarial">
                    <tr><th>Concepto</th><th style="text-align:right">Valor</th></tr>
                    <tr><td>Horas totales</td><td style="text-align:right">${hrs} hrs</td></tr>
                    <tr><td>Rate neto (por hora)</td><td style="text-align:right" class="monetary">$${rateNetoFmt}</td></tr>
                    <tr><td>Total Neto</td><td style="text-align:right" class="monetary">$${totalNetoFmt}</td></tr>
                    <tr><td>Deducciones (ACC / IRD)</td><td style="text-align:right" class="negative">-$${totalTaxACCFmt}</td></tr>
                  </table>

                  <div style="margin-top:14px;">
                    <strong>Detalle adicional</strong>
                    <p style="margin:6px 0 0 0;color:#475569;">CÁLCULO BRUTO: $23.85 + 8% Holiday Pay ($25.75).<br/>DEDUCCIONES IRD: $3.73 PAYE + $0.43 ACC = $${rateDeduccionesFmt}/hr.</p>
                  </div>

                  <a href="#" class="cta" onclick="window.location.href='mailto:${EMAILS[member] ? EMAILS[member] : ''}?subject=${encodeURIComponent('Resumen de pago - ' + member)}'">Responder por correo</a>
                </div>
                <div class="footer">
                  Saludos,<br/>Orchard TEAM
                </div>
              </div>
            </body>
            </html>
        `;
    };

    const openEmailPreviewWindow = (member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC) => {
        const recipient = EMAILS[member];
        if (!recipient) {
            alert(`No hay correo configurado para ${member}. Por favor configura el email para este miembro.`);
            return;
        }

        const subject = `Resumen de pago - ${member}`;
        const plainBody = buildPlainEmail(member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC);
        const htmlTemplate = buildHtmlTemplate(member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC);

        const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=700');
        if (!win) {
            alert('Pop-up bloqueado. Permite ventanas emergentes para usar la vista previa de email.');
            return;
        }

        const safeHtml = htmlTemplate;
        win.document.write(safeHtml);

        const addControls = () => {
            try {
                const doc = win.document;
                const controlsBar = doc.createElement('div');
                controlsBar.style.padding = '12px 28px';
                controlsBar.style.display = 'flex';
                controlsBar.style.gap = '8px';
                controlsBar.style.alignItems = 'center';
                controlsBar.style.justifyContent = 'flex-end';
                controlsBar.style.background = '#f6fbf7';

                const sendBtn = doc.createElement('button');
                sendBtn.textContent = 'Enviar correo (abrir cliente)';
                sendBtn.style.padding = '10px 14px';
                sendBtn.style.background = '#10b981';
                sendBtn.style.color = '#fff';
                sendBtn.style.border = 'none';
                sendBtn.style.borderRadius = '8px';
                sendBtn.style.fontWeight = '800';
                sendBtn.style.cursor = 'pointer';
                sendBtn.onclick = () => {
                    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
                    window.location.href = mailto;
                };

                const copyHtmlBtn = doc.createElement('button');
                copyHtmlBtn.textContent = 'Copiar plantilla HTML';
                copyHtmlBtn.style.padding = '10px 14px';
                copyHtmlBtn.style.background = '#064e3b';
                copyHtmlBtn.style.color = '#fff';
                copyHtmlBtn.style.border = 'none';
                copyHtmlBtn.style.borderRadius = '8px';
                copyHtmlBtn.style.fontWeight = '700';
                copyHtmlBtn.style.cursor = 'pointer';
                copyHtmlBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(htmlTemplate);
                        copyHtmlBtn.textContent = 'Plantilla copiada ✓';
                        setTimeout(() => { if (copyHtmlBtn) copyHtmlBtn.textContent = 'Copiar plantilla HTML'; }, 1500);
                    } catch (e) {
                        alert('No se pudo copiar al portapapeles. Usa Ctrl+C en la ventana emergente.');
                    }
                };

                controlsBar.appendChild(copyHtmlBtn);
                controlsBar.appendChild(sendBtn);

                const firstChild = win.document.body.firstChild;
                win.document.body.insertBefore(controlsBar, firstChild);
            } catch (e) {
                console.error('Error adding controls to preview window', e);
            }
        };

        setTimeout(addControls, 200);
    };

    const startCountdownAndEmail = (member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC) => {
        const recipient = EMAILS[member];

        if (!recipient) {
            alert(`⚠️ No hay correo configurado para ${member}.\nPor favor, configura el email en el código.`);
            return;
        }

        if (countdowns[member] && countdowns[member] > 0) return;

        setFlashes(prev => ({ ...prev, [member]: true }));
        setTimeout(() => {
            setFlashes(prev => {
                const copy = { ...prev };
                delete copy[member];
                return copy;
            });
        }, 350);

        setCountdowns(prev => ({ ...prev, [member]: 5 }));

        const id = setInterval(() => {
            setCountdowns(prev => {
                const current = prev[member] || 0;
                if (current <= 1) {
                    clearInterval(intervalsRef.current[member]);
                    delete intervalsRef.current[member];

                    sendEmailToMember(member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC, recipient);

                    const updated = { ...prev, [member]: 0 };
                    setTimeout(() => {
                        setCountdowns(p2 => {
                            const copy = { ...p2 };
                            delete copy[member];
                            return copy;
                        });
                    }, 800);

                    return updated;
                } else {
                    return { ...prev, [member]: current - 1 };
                }
            });
        }, 1000);

        intervalsRef.current[member] = id;
    };

    // NEW: capture helper that clones the print area, expands internal scrollable containers and captures the full height.
    const captureFullAreaClone = async (rootEl) => {
        const clone = rootEl.cloneNode(true);

        clone.style.maxWidth = '1200px';
        clone.style.width = '1200px';
        clone.style.boxSizing = 'border-box';
        clone.style.overflow = 'visible';

        const cam = clone.querySelector('.camera-container');
        if (cam) cam.remove();

        clone.querySelectorAll('.table-container').forEach(tc => {
            tc.style.overflow = 'visible';
            tc.style.maxHeight = 'none';
            tc.style.webkitOverflowScrolling = 'auto';
        });

        clone.querySelectorAll('.expandable-content').forEach(ec => {
            ec.style.maxHeight = 'none';
            ec.style.opacity = '1';
            ec.style.paddingTop = '20px';
        });

        clone.querySelectorAll('.setall-panel').forEach(p => {
            p.style.position = 'absolute';
            p.style.zIndex = '1000';
        });

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.width = '1200px';
        wrapper.style.overflow = 'visible';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        await new Promise(r => setTimeout(r, 350));

        const canvas = await html2canvas(clone, {
            backgroundColor: '#050505',
            scale: Math.min(2, window.devicePixelRatio || 1),
            logging: false,
            useCORS: true,
            windowWidth: clone.scrollWidth || 1200,
            windowHeight: clone.scrollHeight || document.documentElement.scrollHeight
        });

        document.body.removeChild(wrapper);

        return canvas;
    };

    const handleScreenshot = async () => {
        if (iscapturing) return;
        setIsCapturing(true);

        try {
            const root = printRef.current;
            if (!root) throw new Error('Elemento a capturar no encontrado');

            const mobileBreakpoint = 768;
            let canvas;
            if (window.innerWidth <= mobileBreakpoint) {
                canvas = await captureFullAreaClone(root);
            } else {
                canvas = await html2canvas(root, {
                    backgroundColor: '#050505',
                    scale: Math.min(2.5, window.devicePixelRatio || 1),
                    logging: false,
                    useCORS: true
                });
            }

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

    const EmailIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11z" stroke="#10b981" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M3 6.8l8.2 6.2a2 2 0 0 0 2.6 0L22 6.8" stroke="#10b981" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );

    // hours quick options for panel
    const hoursOptions = Array.from({ length: 24 }, (_, i) => ((i + 1) / 2).toString());

    // Map modal with search (Nominatim)
    const MapPickerModal = ({ dateLabel, initialPos, onClose, onConfirm }) => {
        const [marker, setMarker] = useState(initialPos || null);
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);
        const [isSearching, setIsSearching] = useState(false);

        function ClickHandler() {
            useMapEvents({
                click(e) {
                    setMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
                }
            });
            return null;
        }

        const searchAddress = async (q) => {
            if (!q || q.trim() === '') return;
            setIsSearching(true);
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Search failed');
                const json = await res.json();
                setResults(json || []);
            } catch (e) {
                console.error('Search error', e);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(2,6,23,0.55)',
                    padding: 20
                }}
                onClick={onClose}
                aria-modal="true"
                role="dialog"
            >
                <div style={{ width: '100%', maxWidth: 980, height: '80vh', borderRadius: 12, overflow: 'hidden', background: '#fff' }}
                    onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                        <div style={{ fontWeight: 900 }}>Buscar / seleccionar ubicación - {dateLabel}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={onClose} style={{ padding: '8px 10px', borderRadius: 8, background: '#efefef', border: 'none', fontWeight: 700 }}>Cerrar</button>
                            <button
                                onClick={() => {
                                    if (!marker) return alert('Seleccione un punto en el mapa o desde resultados');
                                    onConfirm(marker.lat, marker.lng);
                                    onClose();
                                }}
                                style={{ padding: '8px 10px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 900 }}
                            >
                                Guardar ubicación
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', height: 'calc(100% - 48px)' }}>
                        <div style={{ width: 360, borderRight: '1px solid #eee', padding: 12, overflowY: 'auto' }}>
                            <div style={{ marginBottom: 8 }}>
                                <input
                                    placeholder="Buscar dirección, calle, ciudad..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(query); }}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button onClick={() => searchAddress(query)} style={{ padding: '8px 10px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 900 }}>
                                        {isSearching ? 'Buscando...' : 'Buscar'}
                                    </button>
                                    <button onClick={() => { setQuery(''); setResults([]); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#efefef', border: 'none', fontWeight: 800 }}>
                                        Limpiar
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 900, marginBottom: 8 }}>Resultados</div>
                                {results.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>Sin resultados</div>}
                                {results.map((r, i) => (
                                    <div key={i} onClick={() => {
                                        setMarker({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
                                    }} style={{ cursor: 'pointer', padding: 8, borderRadius: 8, background: '#fafafa', marginBottom: 8, border: marker && marker.lat === parseFloat(r.lat) && marker.lng === parseFloat(r.lon) ? '2px solid #10b981' : '1px solid #eee' }}>
                                        <div style={{ fontWeight: 800 }}>{r.display_name.split(',')[0]}</div>
                                        <div style={{ fontSize: 12, color: '#555' }}>{r.display_name}</div>
                                    </div>
                                ))}
                            </div>

                        </div>

                        <div style={{ flex: 1 }}>
                            <MapContainer center={ initialPos ? [initialPos.lat, initialPos.lng] : [ -36.8485, 174.7633 ] } zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <ClickHandler />
                                {marker && (
                                    <Marker position={[marker.lat, marker.lng]}>
                                        <Popup>
                                            {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                        </Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
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

                /* Animations */
                @keyframes camera-glow-30s {
                    0%, 90%, 100% { border-color: rgba(255,255,255,0.1); }
                    92% { background-color: #00ffff; box-shadow: 0 0 20px #00ffff; }
                    95% { background-color: #2563eb; box-shadow: 0 0 20px #2563eb; }
                }
                @keyframes double-flash {
                    0%, 15%, 30%, 45%, 100% { opacity: 0; transform: scale(1); }
                    5%, 20% { opacity: 1; transform: scale(5); filter: blur(15px); }
                }

                /* quick flash on click */
                @keyframes flash-quick {
                    0% { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0); }
                    40% { transform: scale(1.03); box-shadow: 0 0 30px rgba(16,185,129,0.45); }
                    100% { transform: scale(1); box-shadow: 0 0 0 rgba(16,185,129,0); }
                }
                .flash {
                    animation: flash-quick 0.35s ease forwards;
                }

                /* twinkle (titilar) while waiting */
                @keyframes twinkle {
                    0% { opacity: 1; transform: translateY(0); }
                    50% { opacity: 0.65; transform: translateY(-1px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .twinkle {
                    animation: twinkle 0.7s ease-in-out infinite;
                }

                /* blinking highlight for member elements (waiting state) */
                @keyframes blink-highlight {
                    0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); transform: translateY(0); }
                    50% { box-shadow: 0 0 18px rgba(16,185,129,0.45); transform: translateY(-2px); }
                    100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); transform: translateY(0); }
                }
                .blinking {
                    animation: blink-highlight 1s infinite;
                    border-color: #10b981 !important;
                }
                .blinking-input {
                    animation: blink-highlight 1s infinite;
                    background-color: rgba(16,185,129,0.04);
                    border-color: rgba(16,185,129,0.12);
                }
                .blinking-week-total {
                    animation: blink-highlight 1s infinite;
                    background-color: rgba(16,185,129,0.03);
                }

                /* Notice style */
                .email-notice {
                    color: #a7f3d0;
                    font-weight: 900;
                    font-size: 12px;
                    margin-top: 8px;
                    display: inline-block;
                    opacity: 0;
                    transform: translateY(6px);
                    animation: notice-in 0.25s forwards;
                }
                @keyframes notice-in {
                    to { opacity: 1; transform: translateY(0); }
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
                    background: radial-gradient(circle, rgba(16,185,129,1) 0%, rgba(255,255,255,1) 40%, transparent 70%);
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
                    border: 3px solid #10b981 !important;
                    box-shadow: 0 0 15px rgba(16,185,129,0.4);
                }
                .camera-container:hover .lucide-camera {
                    color: #10b981 !important;
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
                    background-color: rgba(16, 185, 129, 0.61);
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
                    background-color: rgb(8, 52, 11);
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
                    font-size: clamp(8px,14:38, 1.6vw, 12px);
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

            .setall-button {
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
                position: relative;
            }
            .setall-panel {
                position: absolute;
                top: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%);
                width: 320px;
                max-width: 86vw;
                background: #ffffff;
                color: #0f172a;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(2,6,23,0.2);
                border: 1px solid rgba(6,95,70,0.06);
                z-index: 60;
                padding: 12px;
            }
            .setall-panel .panel-row {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
                flex-wrap: wrap;
            }
            .panel-section-title {
                font-size: 11px;
                font-weight: 900;
                color: #064e3b;
                margin: 6px 0 8px 0;
            }
            .panel-option {
                padding: 8px 10px;
                border-radius: 8px;
                background: #f8fafc;
                border: 1px solid rgba(6,95,70,0.04);
                cursor: pointer;
                font-weight: 800;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .panel-option:hover { box-shadow: 0 6px 18px rgba(16,185,129,0.06); transform: translateY(-2px); }

            .location-btn { background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; }
            .location-chip { background: #ecfdf5; color: #064e3b; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 12px; }

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
            @media (max-width: 1200px) { .hero-section { padding: 50px 16px; border-radius: 2.5rem; } .week-card { padding: 36px 12px 20px 12px; } .main-container { padding: 0 12px; } }
            @media (max-width: 768px) {
                .main-container { padding: 0 8px; }
                .camera-container { width: 56px; height: 56px; bottom: 18px; right: 18px; }
                .camera-btn { width: 50px; height: 50px; }
                .hero-section { padding: 36px 12px; border-radius: 1.5rem; margin-bottom: 16px; }
                .hero-blob { width: 300px; height: 140px; filter: blur(70px); }
                .week-label { padding: 8px 20px; border-radius: 12px; top: -16px; }
                .week-label span { font-size: clamp(9px, 1.8vw, 11px); letter-spacing: 0.3em; }
                .weeks-section { gap: 60px; }
                .week-card { padding: 28px 8px 16px 8px; border-radius: 20px; }
                .week-table thead th { padding: 8px 2px; font-size: 8px; }
                .week-table tbody td { padding: 6px 2px; }
                .week-table tbody td input { min-width: 32px; max-width: 44px; height: 36px; font-size: 12px; }
                .set-all-select { min-width: 36px; max-width: 50px; height: 34px; font-size: 10px; }
                .salary-section { padding: 40px 12px; border-radius: 1.5rem; }
                .salary-grid { grid-template-columns: 1fr; gap: 14px; }
                .salary-card { border-radius: 1.25rem; }
                .card-inner { padding: 20px 16px; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
                .card-left, .card-center, .card-right { width: 100%; text-align: center; }
                .card-center h3 { font-size: clamp(1rem, 4.5vw, 1.3rem); white-space: normal; }
                .card-right .totalNeto { font-size: clamp(18px, 6vw, 24px); }
                .expandable-content { padding: 0 16px; }
                .expandable-grid { grid-template-columns: 1fr; }
            }
            @media (max-width: 480px) {
                .main-container { padding: 0 6px; }
                .hero-section { padding: 28px 8px; border-radius: 1.25rem; }
                .week-table thead th { font-size: 7px; padding: 6px 1px; }
                .week-table tbody td input { min-width: 28px; max-width: 40px; height: 34px; font-size: 11px; border-radius: 8px; }
                .week-card { padding: 24px 4px 12px 4px; border-radius: 16px; }
                .week-label { padding: 6px 14px; }
                .week-label span { font-size: 9px; letter-spacing: 0.22em; }
                .set-all-select { min-width: 32px; max-width: 45px; height: 32px; font-size: 9px; }
                .card-center h3 { font-size: 1.3rem; }
                .card-right .totalNeto { font-size: 18px; }
                .salary-section { padding: 32px 8px; }
                .setall-panel { width: 280px; }
            }

            /* Improve accessibility focus */
            .camera-btn:focus { box-shadow: 0 0 0 3px rgba(16,185,129,0.18); }
            select:focus, input:focus { outline: 2px solid rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }

            /* Email send button styling */
            .email-send-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(90deg, rgba(16,185,129,0.06), rgba(6,95,59,0.04));
                border: 1px solid rgba(16,185,129,0.08);
                color: #a7f3d0;
                padding: 8px 12px;
                border-radius: 12px;
                font-weight: 900;
                cursor: pointer;
                text-decoration: none;
                transition: transform 0.12s ease;
            }
            .email-send-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.06); }
            .email-send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
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
                                                    <th style={{ minWidth: '120px', textAlign: 'left', paddingLeft: 12 }}>MIEMBRO / DÍA</th>
                                                    {week.map(day => (
                                                        <th key={day.display} style={{ position: 'relative', paddingBottom: 24 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b' }}>{day.dayName.substring(0,3).toUpperCase()}</div>
                                                                <div style={{ fontSize: 13, fontWeight: 900, color: '#064e3b' }}>{day.display}</div>

                                                                {/* LOCATION BUTTON (above dropdown) */}
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    <button
                                                                        className="location-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenMapModal(day.display);
                                                                        }}
                                                                        title={locations[day.display] ? locations[day.display].name : 'Marcar ubicación'}
                                                                    >
                                                                        <MapPin size={16} color="#10b981" />
                                                                    </button>
                                                                    {locations[day.display] && (
                                                                        <div className="location-chip" title={locations[day.display].name}>
                                                                            {locations[day.display].name.split(',')[0]}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* SET-ALL custom button + panel (positioned under header) */}
                                                                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        className="setall-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenDropdowns(prev => ({ ...prev, [day.display]: !prev[day.display] }));
                                                                        }}
                                                                        aria-expanded={!!openDropdowns[day.display]}
                                                                        aria-haspopup="true"
                                                                        title="Abrir opciones"
                                                                    >
                                                                        +
                                                                    </button>

                                                                    {openDropdowns[day.display] && (
                                                                        <div
                                                                            className="setall-panel"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            role="dialog"
                                                                            aria-label={`Opciones rápidas para ${day.display}`}
                                                                        >
                                                                            <div style={{ fontWeight: 900, color: '#064e3b', marginBottom: 8 }}>Marcadores</div>
                                                                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                                                                <div className="panel-option" onClick={() => handleSetAll(day.display, EMOJI_MARKERS.RAIN)}>
                                                                                    <span style={{ fontSize: '18px' }}>{EMOJI_MARKERS.RAIN}</span>
                                                                                    <span style={{ fontSize: '12px' }}>Lluvia</span>
                                                                                </div>
                                                                                <div className="panel-option" onClick={() => handleSetAll(day.display, EMOJI_MARKERS.MAN_NO)}>
                                                                                    <span style={{ fontSize: '18px' }}>{EMOJI_MARKERS.MAN_NO}</span>
                                                                                    <span style={{ fontSize: '12px' }}>No asis. (H)</span>
                                                                                </div>
                                                                                <div className="panel-option" onClick={() => handleSetAll(day.display, EMOJI_MARKERS.WOMAN_NO)}>
                                                                                    <span style={{ fontSize: '18px' }}>{EMOJI_MARKERS.WOMAN_NO}</span>
                                                                                    <span style={{ fontSize: '12px' }}>No asis. (M)</span>
                                                                                </div>
                                                                            </div>

                                                                            <div style={{ height: '1px', background: 'rgba(6,95,70,0.04)', margin: '8px 0' }} />

                                                                            <div style={{ fontWeight: 900, color: '#064e3b', marginBottom: 8 }}>Horas rápidas</div>
                                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                                                                {hoursOptions.slice(0, 12).map(h => (
                                                                                    <div key={h} className="panel-option" onClick={() => handleSetAll(day.display, h)}>
                                                                                        <span style={{ fontSize: '12px' }}>{h}h</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                                                                {hoursOptions.slice(12).map(h => (
                                                                                    <div key={h} className="panel-option" onClick={() => handleSetAll(day.display, h)}>
                                                                                        <span style={{ fontSize: '12px' }}>{h}h</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>

                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                                                                <button className="btn-clear" onClick={() => handleSetAll(day.display, "CLEAR")}>Limpiar</button>
                                                                                <button className="btn-close" onClick={() => setOpenDropdowns(prev => ({ ...prev, [day.display]: false }))}>Cerrar</button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
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
                                                            <div style={{ height: '34px' }} />
                                                        </td>
                                                    ))}
                                                    <td style={{ borderRadius: '0 20px 20px 0' }}></td>
                                                </tr>
                                                <tr style={{ height: '12px' }}></tr>
                                                {TEAM_MEMBERS.map((member) => {
                                                    const nombresFemeninos = ['MARIA', 'ANA', 'LAURA', 'ELENA', 'SARA', 'CARMEN', 'LUCIA', 'CONY', 'GHIS', 'MELANY'];
                                                    const esFemenino = nombresFemeninos.includes(member.toUpperCase());
                                                    const isBlinking = !!(countdowns[member] && countdowns[member] > 0);
                                                    return (
                                                        <tr key={member} data-member={member}>
                                                            <td className="member-name" style={{ padding: '16px 8px', textAlign: 'center', borderRadius: '16px 0 0 16px' }}>{member}</td>
                                                            {week.map(day => {
                                                                const cellVal = (hoursData[member] && hoursData[member][day.display]) || "";
                                                                return (
                                                                    <td key={day.display} style={{ textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <input
                                                                                type="text"
                                                                                value={cellVal}
                                                                                onChange={(e) => handleInputChange(member, day.display, e.target.value)}
                                                                                placeholder="0.0"
                                                                                aria-label={`${member} ${day.display}`}
                                                                                className={isBlinking ? 'blinking-input' : ''}
                                                                                style={{ textAlign: 'center', width: 64, padding: '6px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: '16px 8px', textAlign: 'center', backgroundColor: '#064e3b', borderRadius: '0 16px 16px 0' }} className={isBlinking ? 'blinking-week-total' : ''}>
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
                                const isBlinking = !!(countdowns[member] && countdowns[member] > 0);
                                const secondsLeft = countdowns[member] || 0;
                                const isFlashing = !!flashes[member];
                                const notice = notices[member];
                                const recipient = EMAILS[member];

                                return (
                                    <div
                                        key={member}
                                        className={`salary-card ${isBlinking ? 'blinking' : ''} ${isFlashing ? 'flash' : ''}`}
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
                                            target.style.borderColor = '#10b981';
                                            target.style.boxShadow = '0 0 40px rgba(16, 185, 129, 0.12)';
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
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <button
                                                            onClick={() => startCountdownAndEmail(member, totalHrs, rateNeto, rateDeducciones, totalNeto, totalTaxACC)}
                                                            className="email-send-btn"
                                                            aria-label={`Enviar resumen salarial por email a ${member}`}
                                                            type="button"
                                                            disabled={isBlinking}
                                                            title={recipient ? (isBlinking ? `Enviando... ${secondsLeft}s` : `Enviar resumen por email a ${recipient}`) : 'Email no configurado'}
                                                        >
                                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                                <EmailIcon size={18} />
                                                            </span>
                                                            <span className={isBlinking ? 'twinkle' : ''} style={{ color: '#a7f3d0', fontSize: '12px' }}>
                                                                {isBlinking ? `Enviando... ${secondsLeft}s` : 'Cuanto cobro'}
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {notice && (
                                                        <div className="email-notice" role="status" aria-live="polite">
                                                            {notice}
                                                        </div>
                                                    )}
                                                </div>
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
                                                        backgroundColor: 'rgba(114, 112, 74, 0.1)',
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

            {/* Map picker modal */}
            {openMapModal && (
                <MapPickerModal
                    dateLabel={openMapModal}
                    initialPos={locations[openMapModal] ? { lat: locations[openMapModal].lat, lng: locations[openMapModal].lng } : null}
                    onClose={() => setOpenMapModal(null)}
                    onConfirm={(lat, lng) => setLocationForDate(openMapModal, lat, lng)}
                />
            )}
        </div>
    );
}

export default App;