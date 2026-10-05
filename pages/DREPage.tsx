
import React, { useState, useMemo } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { HistoricoConsolidado, ContaPagar } from '../types';

interface DREPageProps {
  history: HistoricoConsolidado;
  contasPagar: ContaPagar[];
}

export const DREPage: React.FC<DREPageProps> = ({ history, contasPagar }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const dreData = useMemo(() => {
    const mesVendas = history.meses.find(m => m.mesReferencia === selectedMonth);
    const pedidos = mesVendas?.pedidos || [];

    const receitaBruta = pedidos.reduce((acc, p) => acc + p.total, 0);
    const margemOriginal = pedidos.reduce((acc, p) => acc + p.margemOriginal, 0);
    const totalAjustes = pedidos.reduce((acc, p) => acc + (p.credito - p.debito), 0);
    const margemAjustada = margemOriginal + totalAjustes;

    const despesasMes = contasPagar.filter(c => c.dataPagamento.startsWith(selectedMonth));
    const totalDespesas = despesasMes.reduce((acc, c) => acc + c.valor, 0);

    const lucroLiquido = margemAjustada - totalDespesas;
    const margemPct = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

    return {
      receitaBruta,
      cmv: receitaBruta - margemOriginal,
      margemOriginal,
      totalAjustes,
      margemAjustada,
      totalDespesas,
      lucroLiquido,
      margemPct,
      hasData: pedidos.length > 0 || despesasMes.length > 0
    };
  }, [selectedMonth, history, contasPagar]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">DRE</h2>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="mt-2 bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase outline-none cursor-pointer border border-slate-200"
          />
        </div>
      </div>

      {!dreData.hasData ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] py-40 text-center text-slate-300">
           <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
           <p className="font-black uppercase text-[10px] tracking-widest">Nenhum dado consolidado para {selectedMonth}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden p-10">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-[0.2em] mb-8 border-b border-slate-50 pb-4">Estrutura de Resultado</h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-xs font-black text-slate-900 uppercase">
                    <span>Receita Bruta</span>
                    <span>{formatCurrency(dreData.receitaBruta)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>(-) Custos Mercadorias (CMV)</span>
                    <span>{formatCurrency(dreData.cmv)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-black text-slate-900 uppercase bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span>(=) Resultado Bruto</span>
                    <span>{formatCurrency(dreData.margemOriginal)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>(+/-) Ajustes Auditoria (Créditos/Débitos)</span>
                    <span className={dreData.totalAjustes >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                       {formatCurrency(dreData.totalAjustes)}
                    </span>
                 </div>
                 <div className="flex justify-between text-xs font-black text-slate-900 uppercase bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span>(=) Margem de Contribuição Auditada</span>
                    <span>{formatCurrency(dreData.margemAjustada)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
                    <span>(-) Despesas Operacionais (Contas Pagar)</span>
                    <span>{formatCurrency(dreData.totalDespesas)}</span>
                 </div>
                 
                 <div className="mt-8 bg-[#0A1121] p-8 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lucro / Prejuízo Líquido</p>
                       <p className="text-4xl font-black tracking-tighter">{formatCurrency(dreData.lucroLiquido)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rentabilidade</p>
                       <p className={`text-2xl font-black ${dreData.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-[#E30613]'}`}>{dreData.margemPct.toFixed(2)}%</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
                 <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-blue-600" />
                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Auditoria Inteligente</h4>
                 </div>
                 <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
                    Este relatório cruza os dados de vendas que foram finalizados na auditoria com as despesas reais lançadas no financeiro.
                 </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-lg">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ponto de Equilíbrio</h4>
                 <p className="text-2xl font-black text-slate-900">{formatCurrency(dreData.totalDespesas)}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Margem bruta mínima necessária para cobrir despesas fixas.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
