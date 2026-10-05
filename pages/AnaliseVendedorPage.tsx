
import React, { useMemo } from 'react';
import { HistoricoConsolidado } from '../types';
import { Users, Trophy, TrendingDown, Target } from 'lucide-react';

interface AnaliseVendedorPageProps {
  history: HistoricoConsolidado;
}

export const AnaliseVendedorPage: React.FC<AnaliseVendedorPageProps> = ({ history }) => {
  const ranking = useMemo(() => {
    const vendedores: Record<string, { nome: string; totalVendas: number; totalMargem: number; pedidos: number }> = {};

    history.meses.forEach(mes => {
      mes.pedidos.forEach(p => {
        if (!vendedores[p.vendedor]) {
          vendedores[p.vendedor] = { nome: p.vendedor, totalVendas: 0, totalMargem: 0, pedidos: 0 };
        }
        vendedores[p.vendedor].totalVendas += p.total;
        vendedores[p.vendedor].totalMargem += p.margemAjustada;
        vendedores[p.vendedor].pedidos++;
      });
    });

    return Object.values(vendedores)
      .map(v => ({
        ...v,
        margemPct: v.totalVendas > 0 ? (v.totalMargem / v.totalVendas) * 100 : 0
      }))
      .sort((a, b) => b.totalMargem - a.totalMargem);
  }, [history]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Performance de Vendedores</h2>
        <p className="text-[#E30613] font-bold mt-2 uppercase text-[11px] tracking-[0.3em]">Ranking Geral por Margem de Contribuição</p>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A1121] text-slate-400">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest">Posição</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest">Vendedor</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Qtd Pedidos</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Faturamento Total</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right">Margem Gerada (R$)</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right text-[#E30613]">Margem % Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    Aguardando consolidação do primeiro mês...
                  </td>
                </tr>
              ) : (
                ranking.map((v, index) => (
                  <tr key={v.nome} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                          {index + 1}º
                        </span>
                        {index === 0 && <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />}
                      </div>
                    </td>
                    <td className="px-10 py-8 font-black text-slate-900 uppercase tracking-tight text-sm">{v.nome}</td>
                    <td className="px-10 py-8 text-right font-bold text-slate-500">{v.pedidos}</td>
                    <td className="px-10 py-8 text-right font-bold text-slate-900">{formatCurrency(v.totalVendas)}</td>
                    <td className="px-10 py-8 text-right font-black text-emerald-600">{formatCurrency(v.totalMargem)}</td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`font-black text-lg ${v.margemPct < 10 ? 'text-[#E30613]' : 'text-slate-900'}`}>
                          {v.margemPct.toFixed(2)}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${v.margemPct < 10 ? 'bg-[#E30613]' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, v.margemPct * 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
