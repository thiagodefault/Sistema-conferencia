
import React, { useState, useMemo } from 'react';
import { 
  Plus, Calendar, Wallet, Trash2, Save, X, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { ContaPagar, Recebimento } from '../types';

interface FluxoCaixaPageProps {
  contasPagar: ContaPagar[];
  recebimentos: Recebimento[];
  setRecebimentos: React.Dispatch<React.SetStateAction<Recebimento[]>>;
}

export const FluxoCaixaPage: React.FC<FluxoCaixaPageProps> = ({ contasPagar, recebimentos, setRecebimentos }) => {
  const [showInModal, setShowInModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [newIn, setNewIn] = useState<Partial<Recebimento>>({
    dataRecebimento: new Date().toISOString().split('T')[0],
    origem: '',
    valor: 0,
    recebido: true
  });

  const stats = useMemo(() => {
    const monthIn = recebimentos.filter(r => r.dataRecebimento.startsWith(selectedMonth));
    const monthOut = contasPagar.filter(c => c.dataPagamento.startsWith(selectedMonth));

    const totalIn = monthIn.reduce((acc, r) => acc + r.valor, 0);
    const totalOut = monthOut.reduce((acc, c) => acc + c.valor, 0);
    
    const realIn = monthIn.filter(r => r.recebido).reduce((acc, r) => acc + r.valor, 0);
    const realOut = monthOut.filter(c => c.pago).reduce((acc, c) => acc + c.valor, 0);

    return {
      previsto: totalIn - totalOut,
      realizado: realIn - realOut,
      totalIn, totalOut, realIn, realOut
    };
  }, [recebimentos, contasPagar, selectedMonth]);

  const handleAddIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIn.origem || !newIn.valor || newIn.valor <= 0) return;

    const entry: Recebimento = {
      id: crypto.randomUUID(),
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      dataRecebimento: newIn.dataRecebimento || new Date().toISOString().split('T')[0],
      origem: newIn.origem || '',
      valor: newIn.valor || 0,
      recebido: newIn.recebido ?? true
    };

    setRecebimentos(prev => [...prev, entry]);
    setShowInModal(false);
    setNewIn({
      dataRecebimento: new Date().toISOString().split('T')[0],
      origem: '', 
      valor: 0, 
      recebido: true
    });
  };

  const deleteIn = (id: string) => {
    if (window.confirm('Deseja excluir permanentemente este registro de entrada?')) {
      setRecebimentos(prev => prev.filter(r => r.id !== id));
    }
  };

  const toggleInStatus = (id: string) => {
    setRecebimentos(prev => prev.map(r => r.id === id ? { ...r, recebido: !r.recebido } : r));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">Fluxo de Caixa</h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[#E30613] font-black uppercase text-[10px] tracking-[0.3em]">Gestão de Disponibilidade</p>
             <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                <Calendar className="w-3 h-3 text-slate-400" />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer"
                />
             </div>
          </div>
        </div>
        <button
          onClick={() => setShowInModal(true)}
          className="flex items-center gap-4 px-10 py-5 bg-emerald-600 text-white rounded-2xl shadow-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-5 h-5" /> REGISTRAR ENTRADA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl group">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entradas (Realizadas)</span>
          </div>
          <p className="text-4xl font-black tracking-tighter text-emerald-600">{formatCurrency(stats.realIn)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl group">
          <div className="flex items-center gap-3 mb-2">
            <ArrowDownCircle className="w-5 h-5 text-[#E30613]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saídas (Pagas)</span>
          </div>
          <p className="text-4xl font-black tracking-tighter text-[#E30613]">{formatCurrency(stats.realOut)}</p>
        </div>
        <div className={`rounded-[2.5rem] p-8 text-white shadow-2xl transition-colors duration-500 ${stats.realizado >= 0 ? 'bg-[#0A1121]' : 'bg-red-950'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className={`w-5 h-5 ${stats.realizado >= 0 ? 'text-[#E30613]' : 'text-white'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Saldo em Caixa</span>
          </div>
          <p className="text-4xl font-black tracking-tighter">{formatCurrency(stats.realizado)}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-emerald-50/20 flex items-center justify-between">
           <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Histórico de Recebimentos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-10 py-6">Data</th>
                <th className="px-10 py-6">Origem / Cliente</th>
                <th className="px-10 py-6 text-right">Valor</th>
                <th className="px-10 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recebimentos.filter(r => r.dataRecebimento.startsWith(selectedMonth)).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhuma entrada registrada para este mês</p>
                  </td>
                </tr>
              ) : (
                recebimentos.filter(r => r.dataRecebimento.startsWith(selectedMonth)).map(r => (
                  <tr key={r.id} className={`group hover:bg-slate-50 transition-all ${r.recebido ? '' : 'opacity-60 italic'}`}>
                    <td className="px-10 py-6 text-xs font-black text-slate-900">{new Date(r.dataRecebimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-10 py-6 text-xs font-bold text-slate-600 uppercase">{r.origem}</td>
                    <td className="px-10 py-6 text-right font-black text-slate-900">{formatCurrency(r.valor)}</td>
                    <td className="px-10 py-6 text-center">
                      <button 
                        onClick={() => toggleInStatus(r.id)}
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${r.recebido ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                      >
                        {r.recebido ? 'Recebido' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <button onClick={() => deleteIn(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 space-y-8 animate-in zoom-in-95 duration-300 border border-emerald-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Registrar Entrada</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Lançamento de Receita no Caixa</p>
                 </div>
                 <button onClick={() => setShowInModal(false)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <X className="w-8 h-8" />
                 </button>
              </div>

              <form onSubmit={handleAddIn} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Data do Recebimento</label>
                       <input 
                         type="date" 
                         required 
                         value={newIn.dataRecebimento} 
                         onChange={e => setNewIn({...newIn, dataRecebimento: e.target.value})} 
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Valor (R$)</label>
                       <input 
                         type="number" 
                         step="0.01" 
                         required 
                         placeholder="0,00"
                         value={newIn.valor || ''} 
                         onChange={e => setNewIn({...newIn, valor: parseFloat(e.target.value)})} 
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-right text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Origem / Nome do Cliente</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: Venda à vista, Aporte, Recebimento PIX..."
                      value={newIn.origem} 
                      onChange={e => setNewIn({...newIn, origem: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                    />
                 </div>

                 <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <input 
                      type="checkbox" 
                      id="isConfirmed"
                      checked={newIn.recebido} 
                      onChange={e => setNewIn({...newIn, recebido: e.target.checked})}
                      className="w-5 h-5 rounded accent-emerald-600"
                    />
                    <label htmlFor="isConfirmed" className="text-[10px] font-black text-emerald-900 uppercase tracking-widest cursor-pointer">Confirmar recebimento imediato no caixa</label>
                 </div>

                 <div className="pt-4 flex flex-col gap-3">
                    <button 
                      type="submit" 
                      className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                    >
                      <Save className="w-4 h-4" /> GRAVAR ENTRADA
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowInModal(false)} 
                      className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
