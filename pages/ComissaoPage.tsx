
import React, { useState, useMemo } from 'react';
import { 
  DollarSign, ChevronLeft, ChevronRight, Users, Calculator, AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import { HistoricoConsolidado } from '../types';
import { financeEngine } from '../services/financeEngine';

interface ComissaoPageProps {
  history: HistoricoConsolidado;
}

export const ComissaoPage: React.FC<ComissaoPageProps> = ({ history }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const report = useMemo(() => {
    const mesData = history.meses.find(m => m.mesReferencia === selectedMonth);
    const pedidos = mesData?.pedidos || [];

    const vendedores: Record<string, any> = {};

    pedidos.forEach(p => {
      if (p.isOcorrencia) return;

      if (!vendedores[p.vendedor]) {
        vendedores[p.vendedor] = { 
          nome: p.vendedor, 
          faturamentoBruto: 0, 
          faturamentoSemFrete: 0,
          freteTotal: 0,
          comissaoTotal: 0, 
          pedidosCount: 0,
          pedidos: []
        };
      }

      const calc = financeEngine.calculateCommission(p);
      
      vendedores[p.vendedor].faturamentoBruto += p.total;
      // Fixed: Use 'base' property from calc object as defined in financeEngine
      vendedores[p.vendedor].faturamentoSemFrete += calc.base;
      vendedores[p.vendedor].freteTotal += (p.frete || 0);
      vendedores[p.vendedor].comissaoTotal += calc.comissao;
      vendedores[p.vendedor].pedidosCount++;
      vendedores[p.vendedor].pedidos.push({ ...p, ...calc });
    });

    return {
      vendedores: Object.values(vendedores).sort((a: any, b: any) => b.comissaoTotal - a.comissaoTotal),
      totalMes: Object.values(vendedores).reduce((acc: number, v: any) => acc + v.comissaoTotal, 0),
      hasData: pedidos.length > 0
    };
  }, [selectedMonth, history]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Comissões</h2>
          <div className="flex items-center gap-4 mt-2">
             <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                <button onClick={() => setSelectedMonth(prev => {
                  const [y, m] = prev.split('-');
                  const d = new Date(parseInt(y), parseInt(m) - 2);
                  return d.toISOString().slice(0, 7);
                })}><ChevronLeft className="w-4 h-4" /></button>
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none" />
                <button onClick={() => setSelectedMonth(prev => {
                  const [y, m] = prev.split('-');
                  const d = new Date(parseInt(y), parseInt(m));
                  return d.toISOString().slice(0, 7);
                })}><ChevronRight className="w-4 h-4" /></button>
             </div>
          </div>
        </div>
        <div className="bg-[#0A1121] px-10 py-6 rounded-3xl text-white shadow-2xl flex items-center gap-6">
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Período</p><h3 className="text-3xl font-black tracking-tighter text-[#E30613]">{formatCurrency(report.totalMes)}</h3></div>
           <Calculator className="w-8 h-8 text-[#E30613]" />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-xs font-medium text-amber-800">Taxas baseadas na <span className="font-black">Margem Final</span>. Base: <span className="font-black">Produto (Sem Frete)</span>. Regra: &gt;10% = 1,5% | &gt;7.99% = 1,0% | &lt;7.99% = 0%.</p>
      </div>

      {!report.hasData ? (
        <div className="py-40 text-center text-slate-300 font-black uppercase text-xs">Nenhum dado consolidado para este mês.</div>
      ) : (
        <div className="space-y-6">
          {report.vendedores.map((v: any) => (
            <div key={v.nome} className="bg-white border rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-xl transition-all">
              <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer" onClick={() => setExpandedVendor(expandedVendor === v.nome ? null : v.nome)}>
                <div className="flex items-center gap-6"><Users className="w-6 h-6 text-slate-400" /><div><h4 className="text-lg font-black uppercase">{v.nome}</h4><p className="text-[10px] font-black text-slate-400">{v.pedidosCount} Pedidos</p></div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                   <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Bruto</p><p className="text-sm font-black">{formatCurrency(v.faturamentoBruto)}</p></div>
                   <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Frete</p><p className="text-sm font-bold text-red-500">-{formatCurrency(v.freteTotal)}</p></div>
                   <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Base</p><p className="text-sm font-black text-emerald-600">{formatCurrency(v.faturamentoSemFrete)}</p></div>
                   <div className="text-right"><p className="text-[9px] font-black text-[#E30613] uppercase mb-1">Comissão</p><p className="text-2xl font-black">{formatCurrency(v.comissaoTotal)}</p></div>
                </div>
                {expandedVendor === v.nome ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
