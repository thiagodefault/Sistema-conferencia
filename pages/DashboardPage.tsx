import React, { useMemo, useState, useEffect } from 'react';
import { HistoricoConsolidado, MesConferencia } from '../types';
import { 
  Banknote, 
  TrendingUp, 
  Percent, 
  Calendar, 
  ShoppingBag, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert,
  Scale
} from 'lucide-react';
import { PainelBatimentoPlanilhas } from '../components/PainelBatimentoPlanilhas';
import { toNum, safeRound } from '../services/financeEngine';

interface DashboardPageProps {
  history: HistoricoConsolidado;
  data?: MesConferencia | null;
  onSetData?: (newData: MesConferencia | null) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ history, data, onSetData }) => {
  const initialMonth = data?.mesReferencia || history.meses[0]?.mesReferencia || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  useEffect(() => {
    if (data?.mesReferencia) {
      setSelectedMonth(data.mesReferencia);
    }
  }, [data?.mesReferencia]);

  const activeMesData = useMemo<MesConferencia | null>(() => {
    if (data && data.mesReferencia === selectedMonth) {
      return data;
    }
    const found = history.meses.find(m => m.mesReferencia === selectedMonth);
    return found || (data && data.pedidos.length > 0 ? data : null);
  }, [data, history, selectedMonth]);

  // "e Dashboar so entra os pedidos validos"
  const pedidosValidos = useMemo(() => {
    const todosPedidos = activeMesData?.pedidos || [];
    return todosPedidos.filter(p => {
      const isBacklogFake = 
        p.vendedor === 'SISTEMA (BACKLOG)' || 
        p.vendedor === 'TRANSPORTADORA (SISTEMA)' ||
        p.canal?.startsWith('AJUSTE') ||
        p.canal?.includes('FRETE') ||
        p.data === 'Mês Anterior' ||
        p.data === 'Backlog Logístico';
      
      const isCanceladoOuDevolvido = 
        p.isCancelado || 
        p.isDevolvido || 
        (p.margemDeduzidaCancelamento !== undefined && p.margemDeduzidaCancelamento !== 0) || 
        (p.margemDeduzidaDevolucao !== undefined && p.margemDeduzidaDevolucao !== 0) ||
        toNum(p.total) <= 0;

      return !isBacklogFake && !isCanceladoOuDevolvido;
    });
  }, [activeMesData]);

  const stats = useMemo(() => {
    let totalVendas = 0;
    let totalMargem = 0;
    let totalPedidos = 0;
    let totalVazamento = 0;

    pedidosValidos.forEach(p => {
      totalVendas += (p.isOcorrencia ? 0 : toNum(p.total));
      totalMargem += toNum(p.margemReal ?? p.margemAjustada);
      totalPedidos++;
      totalVazamento += toNum(p.vazamentoFrete);
    });

    totalVendas = safeRound(totalVendas);
    totalMargem = safeRound(totalMargem);
    totalVazamento = safeRound(totalVazamento);

    const margemPct = totalVendas > 0 ? safeRound((totalMargem / totalVendas) * 100) : 0;

    return { 
      totalVendas, 
      totalMargem, 
      totalPedidos, 
      margemPct, 
      totalVazamento, 
      hasData: pedidosValidos.length > 0 
    };
  }, [pedidosValidos]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* HEADER DO DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Painel de Controle</h2>
          <div className="flex items-center gap-4 mt-3">
             <p className="text-[#E30613] font-black uppercase text-[10px] tracking-[0.3em]">Performance Consolidada & Margem Real</p>
             <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <button onClick={() => {
                  const [y, m] = selectedMonth.split('-');
                  setSelectedMonth(new Date(parseInt(y), parseInt(m) - 2).toISOString().slice(0, 7));
                }}><ChevronLeft className="w-3.5 h-3.5 text-slate-600 hover:text-black"/></button>
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                  className="bg-transparent text-[11px] font-black uppercase text-slate-800 outline-none cursor-pointer" 
                />
                <button onClick={() => {
                  const [y, m] = selectedMonth.split('-');
                  setSelectedMonth(new Date(parseInt(y), parseInt(m)).toISOString().slice(0, 7));
                }}><ChevronRight className="w-3.5 h-3.5 text-slate-600 hover:text-black"/></button>
             </div>
          </div>
        </div>

        <div className="bg-emerald-50 px-6 py-4 rounded-3xl border border-emerald-100 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-emerald-500 rounded-xl text-white shadow-lg"><ArrowUpRight className="w-5 h-5" /></div>
          <div>
            <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Base Auditada</p>
            <p className="text-sm font-black text-emerald-900 uppercase tracking-tighter">
              {history.meses.length + (data && !history.meses.some(m => m.mesReferencia === data.mesReferencia) ? 1 : 0)} Competência(s)
            </p>
          </div>
        </div>
      </div>

      {!stats.hasData ? (
        <div className="py-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center text-slate-300">
           <Calendar className="w-16 h-16 mb-4 opacity-10" />
           <p className="font-black uppercase text-xs tracking-widest">Aguardando Importação para {selectedMonth}</p>
        </div>
      ) : (
        <>
          {/* CARDS KPI SUPERIORES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#0A1121] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 rounded-2xl"><Banknote className="w-6 h-6 text-[#E30613]" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Faturamento Líquido</span>
              </div>
              <p className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalVendas)}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-bold">{stats.totalPedidos} pedidos faturados</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-2xl"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Margem Real Auditada</span>
              </div>
              <p className="text-4xl font-black tracking-tighter text-slate-900">{formatCurrency(stats.totalMargem)}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-2">100% dos débitos e créditos alocados</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 rounded-2xl"><Percent className="w-6 h-6 text-[#E30613]" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rentabilidade Real %</span>
              </div>
              <p className="text-4xl font-black tracking-tighter text-slate-900">{stats.margemPct.toFixed(2)}%</p>
              <p className="text-[10px] text-slate-400 mt-2 font-bold">Sobre o faturamento líquido</p>
            </div>

            <div className={`rounded-[2.5rem] p-8 shadow-2xl transition-all ${stats.totalVazamento > 0 ? 'bg-red-950 text-white' : 'bg-slate-50 border border-slate-200'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-600 rounded-2xl"><ShieldAlert className="w-6 h-6 text-white" /></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${stats.totalVazamento > 0 ? 'text-red-300' : 'text-slate-400'}`}>Vazamento Logístico</span>
              </div>
              <p className={`text-4xl font-black tracking-tighter ${stats.totalVazamento > 0 ? 'text-white' : 'text-slate-300'}`}>
                {formatCurrency(stats.totalVazamento)}
              </p>
              <p className={`text-[10px] mt-2 font-bold ${stats.totalVazamento > 0 ? 'text-red-300' : 'text-slate-400'}`}>
                {stats.totalVazamento > 0 ? 'Diferença Custo vs Frete Cobrado' : 'Sem vazamento de frete'}
              </p>
            </div>
          </div>

          {/* PAINEL DE BATIMENTO CONSOLIDADO DAS PLANILHAS */}
          {activeMesData && (
            <PainelBatimentoPlanilhas data={activeMesData} onSetData={onSetData} showDetailsDefault={false} />
          )}

          {/* PERFORMANCE POR VENDEDOR */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-6">
             <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.2em] flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#E30613]" /> Performance de Margem Real por Vendedor
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pedidosValidos
                   .reduce((acc: any[], p) => {
                      const existing = acc.find(x => x.vendedor === p.vendedor);
                      const venda = p.isOcorrencia ? 0 : toNum(p.total);
                      const margem = toNum(p.margemReal ?? p.margemAjustada);
                      const vazamento = toNum(p.vazamentoFrete);

                      if (existing) {
                         existing.venda += venda;
                         existing.margem += margem;
                         existing.vazamento += vazamento;
                      } else {
                         acc.push({ vendedor: p.vendedor, venda, margem, vazamento });
                      }
                      return acc;
                   }, [])
                   .sort((a, b) => b.margem - a.margem)
                   .map(v => (
                      <div key={v.vendedor} className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-500 uppercase">{v.vendedor}</p>
                            <div className={`px-3 py-1 rounded-lg font-black text-[10px] ${ (v.margem/v.venda*100) >= 10 ? 'bg-emerald-100 text-emerald-700' : (v.margem/v.venda*100) >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-[#E30613]' }`}>
                               {(v.venda > 0 ? (v.margem/v.venda*100) : 0).toFixed(1)}%
                            </div>
                         </div>
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-xl font-black text-slate-900">{formatCurrency(v.margem)}</p>
                               {v.vazamento > 0 && <p className="text-[9px] font-bold text-[#E30613] uppercase tracking-tighter">Δ Frete: -{formatCurrency(v.vazamento)}</p>}
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Venda Total</p>
                               <p className="text-xs font-bold text-slate-500">{formatCurrency(v.venda)}</p>
                            </div>
                         </div>
                      </div>
                   ))
                }
             </div>
          </div>
        </>
      )}
    </div>
  );
};
