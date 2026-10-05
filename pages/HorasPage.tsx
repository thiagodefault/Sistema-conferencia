
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileUp, Search, ShieldCheck, 
  IdCard, AlertOctagon, Printer, Fingerprint, AlertTriangle, Users, Database, CalendarRange
} from 'lucide-react';

// --- MODELO DE DADOS ---
type Punch = { id: string; dayISO: string; time: string; nsr: string };
type Person = { 
  name: string; 
  ids: string[]; // Aliases canonicalizados (12 digits)
};
type Store = {
  people: Person[];
  punches: Punch[];
  lastImport?: { 
    file: string; 
    stats: { punches: number; users: number; range: string } 
  };
};

// --- MOTOR DE PARSING ---
const canon12 = (d: string) => d.replace(/\D/g, '').padStart(12, '0').slice(-12);
const RX_CADASTRO = /\d{10}(\d{8})(\d{4})[IAE]?(\d+?)(?=[A-ZÀ-Ü])([A-ZÀ-Ü\s\-\']+)/;
const RX_BATIDA = /(\d{10})3(\d{8})(\d{4})[IAE]?(\d+)/;

export const HorasPage: React.FC = () => {
  const [store, setStore] = useState<Store>(() => {
    const saved = localStorage.getItem('abc_ponto_v10');
    return saved ? JSON.parse(saved) : { people: [], punches: [] };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

  // Efeito corrigido para salvar apenas quando o 'store' mudar
  useEffect(() => {
    localStorage.setItem('abc_ponto_v10', JSON.stringify(store));
  }, [store]);

  const handleImportAFD = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, "ISO-8859-1"); 
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 20);
      
      const newPunches: Punch[] = [];
      const userMap = new Map<string, string>(); 
      const foundMonths = new Set<string>();

      lines.forEach((raw) => {
        const userMatch = raw.match(RX_CADASTRO);
        if (userMatch) {
          const id = canon12(userMatch[3]);
          const name = userMatch[4].trim().toUpperCase();
          if (name.length > 2) userMap.set(id, name);
          return;
        }

        const punchMatch = raw.match(RX_BATIDA);
        if (punchMatch) {
          const [, nsr, ddmmyyyy, hhmm, idRaw] = punchMatch;
          const dayISO = `${ddmmyyyy.slice(4, 8)}-${ddmmyyyy.slice(2, 4)}-${ddmmyyyy.slice(0, 2)}`;
          foundMonths.add(`${ddmmyyyy.slice(4, 8)}-${ddmmyyyy.slice(2, 4)}`);
          newPunches.push({
            nsr, dayISO,
            time: `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`,
            id: canon12(idRaw)
          });
        }
      });

      if (newPunches.length > 0) {
        setStore(prev => {
          const people = [...prev.people];
          userMap.forEach((name, id) => {
            let person = people.find(p => p.name === name);
            if (!person) people.push({ name, ids: [id] });
            else if (!person.ids.includes(id)) person.ids.push(id);
          });

          const existingNsrs = new Set(prev.punches.map(p => p.nsr));
          const filteredNew = newPunches.filter(p => !existingNsrs.has(p.nsr));
          const allPunches = [...prev.punches, ...filteredNew];
          const allDates = allPunches.map(p => p.dayISO).sort();
          const range = allDates.length > 0 ? `${allDates[0]} até ${allDates[allDates.length-1]}` : "N/A";

          return {
            people,
            punches: allPunches,
            lastImport: { file: file.name, stats: { punches: newPunches.length, users: userMap.size, range } }
          };
        });
      }
    };
    event.target.value = '';
  };

  const auditData = useMemo(() => {
    const punchesInMonth = store.punches.filter(p => p.dayISO.startsWith(selectedMonth));
    const uniqueIdsInMonth = Array.from(new Set<string>(punchesInMonth.map(p => p.id)));

    const employees = uniqueIdsInMonth.map(id => {
      const person = store.people.find(p => p.ids.includes(id));
      return { id, name: person ? person.name : `COLABORADOR ${id.slice(-6)}`, isResolved: !!person };
    });

    const filtered = employees
      .filter(e => e.name.includes(searchTerm.toUpperCase()) || e.id.includes(searchTerm))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { employees: filtered, stats: { totalGlobal: store.punches.length, idsInMonth: uniqueIdsInMonth.length } };
  }, [store, selectedMonth, searchTerm]);

  const activeEmployee = auditData.employees.find(e => e.id === activePersonId);
  const punchesForDisplay = useMemo(() => {
    if (!activePersonId) return [];
    return store.punches
      .filter(p => p.id === activePersonId && p.dayISO.startsWith(selectedMonth))
      .sort((a, b) => a.dayISO.localeCompare(b.dayISO) || a.time.localeCompare(b.time));
  }, [activePersonId, store.punches, selectedMonth]);

  const calculateDayMins = (p: Punch[]) => {
    if (p.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < p.length - 1; i += 2) {
      const [h1, m1] = p[i].time.split(':').map(Number);
      const [h2, m2] = p[i+1].time.split(':').map(Number);
      total += (h2 * 60 + m2) - (h1 * 60 + m1);
    }
    return total;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-[#E30613] p-4 rounded-2xl shadow-lg"><ShieldCheck className="text-white w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-black uppercase text-[#0A1121]">Folha de Ponto</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Competência: {selectedMonth}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setActivePersonId(null); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black outline-none" />
          <label className="bg-[#0A1121] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 hover:bg-black transition-all">
            <FileUp className="w-4 h-4 text-[#E30613]" /> LER AFD <input type="file" className="hidden" onChange={handleImportAFD} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm min-h-[60vh] flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none" />
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {auditData.employees.map(e => (
              <button key={e.id} onClick={() => setActivePersonId(e.id)} className={`w-full text-left p-4 rounded-2xl transition-all border ${activePersonId === e.id ? 'bg-[#0A1121] text-white' : 'bg-slate-50 text-slate-600'}`}>
                <p className="text-[10px] font-black uppercase truncate">{e.name}</p>
                <p className="text-[8px] mt-1 font-bold opacity-60">ID: {e.id}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          {activeEmployee ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="bg-white border rounded-[2.5rem] p-8 shadow-xl flex justify-between items-center">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100"><IdCard className="text-emerald-500 w-8 h-8" /></div>
                     <div><h3 className="text-xl font-black uppercase text-slate-900 leading-none">{activeEmployee.name}</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Registro: {activeEmployee.id}</p></div>
                  </div>
                  <button onClick={() => window.print()} className="bg-[#0A1121] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2"><Printer className="w-4 h-4 text-[#E30613]" /> Imprimir</button>
               </div>
               <div className="bg-white border rounded-[3rem] shadow-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#0A1121] text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <tr><th className="px-10 py-6">Data / Dia</th><th className="px-10 py-6">Marcações (AFD)</th><th className="px-4 py-6 text-center">Horas</th><th className="px-4 py-6 text-center">Auditoria</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {punchesForDisplay.length > 0 && Array.from({length: 31}, (_, i) => {
                        const day = (i+1).toString().padStart(2, '0');
                        const iso = `${selectedMonth}-${day}`;
                        const dp = punchesForDisplay.filter(p => p.dayISO === iso);
                        if (dp.length === 0) return null;
                        const mins = calculateDayMins(dp);
                        return (
                          <tr key={iso} className="hover:bg-slate-50">
                            <td className="px-10 py-5 font-black text-slate-900">{day}/{selectedMonth.split('-')[1]}</td>
                            <td className="px-10 py-5 flex gap-2 flex-wrap">{dp.map((p, ix) => <span key={ix} className="bg-white border px-3 py-1 rounded text-[11px] font-black">{p.time}</span>)}</td>
                            <td className="px-4 py-5 text-center font-black text-xs text-slate-600">{mins > 0 ? `${Math.floor(mins/60)}h${(mins%60).toString().padStart(2,'0')}` : '--:--'}</td>
                            <td className="px-4 py-5 text-center">{dp.length % 2 !== 0 && <AlertOctagon className="w-4 h-4 text-red-500 mx-auto" />}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed rounded-[3rem] py-64 flex flex-col items-center justify-center text-slate-300">
              <Users className="w-24 h-24 opacity-10 mb-6" /><p className="font-black uppercase text-sm tracking-widest">Selecione um colaborador</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
