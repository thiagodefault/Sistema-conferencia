
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { ContaPagar } from '../types';

interface ContasPagarPageProps {
  contas: ContaPagar[];
  setContas: React.Dispatch<React.SetStateAction<ContaPagar[]>>;
}

export const ContasPagarPage: React.FC<ContasPagarPageProps> = ({ contas, setContas }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [newConta, setNewConta] = useState<Partial<ContaPagar>>({
    dataPagamento: new Date().toISOString().split('T')[0],
    beneficiario: '',
    valor: 0,
    pago: false
  });

  const filteredData = useMemo(() => {
    return contas
      .filter(c => c.dataPagamento.startsWith(selectedMonth))
      .filter(c => c.beneficiario.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.dataPagamento.localeCompare(b.dataPagamento));
  }, [contas, selectedMonth, searchTerm]);

  const stats = useMemo(() => {
    const monthContas = contas.filter(c => c.dataPagamento.startsWith(selectedMonth));
    const total = monthContas.reduce((acc, c) => acc + c.valor, 0);
    const pago = monthContas.filter(c => c.pago).reduce((acc, c) => acc + c.valor, 0);
    const pendente = total - pago;
    return { total, pago, pendente, count: monthContas.length };
  }, [contas, selectedMonth]);

  const handleAddConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConta.beneficiario || !newConta.valor) return;

    const conta: ContaPagar = {
      id: crypto.randomUUID(),
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      dataPagamento: newConta.dataPagamento || '',
      beneficiario: newConta.beneficiario || '',
      valor: newConta.valor || 0,
      pago: newConta.pago || false
    };

    setContas(prev => [...prev, conta]);
    setShowModal(false);
    setNewConta({
      dataPagamento: new Date().toISOString().split('T')[0],
      beneficiario: '',
      valor: 0,
      pago: false
    });
  };

  const toggleStatus = (id: string) => {
    setContas(prev => prev.map(c => c.id === id ? { ...c, pago: !c.pago } : c));
  };

  const deleteConta = (id: string) => {
    if (window.confirm('Deseja realmente remover este lançamento?')) {
      setContas(prev => prev.filter(c => c.id !== id));
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Financeiro</h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[#E30613] font-black uppercase text-[10px] tracking-[0.3em]">Gestão de Contas a Pagar</p>
             <input 
               type="month" 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase outline-none cursor-pointer border border-slate-200"
             />
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-4 px-10 py-5 bg-[#E30613] text-white rounded-2xl shadow-xl hover:bg-red-700 transition-all font-black text-xs uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" /> ADICIONAR CONTA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#0A1121] rounded-[2.5rem] p-8 text-white shadow-2xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total no Período</span>
          <p className="text-4xl font-black tracking-tighter mt-1">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Pendente</span>
          <p className="text-4xl font-black tracking-tighter text-[#E30613] mt-1">{formatCurrency(stats.pendente)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Pago</span>
          <p className="text-4xl font-black tracking-tighter text-emerald-600 mt-1">{formatCurrency(stats.pago)}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Listagem de Compromissos</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Filtrar beneficiário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none focus:ring-2 focus:ring-red-500/10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-10 py-6">Vencimento</th>
                <th className="px-10 py-6">Beneficiário</th>
                <th className="px-10 py-6 text-right">Valor</th>
                <th className="px-10 py-6 text-center">Status</th>
                <th className="px-10 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                    Nenhum compromisso para este filtro.
                  </td>
                </tr>
              ) : (
                filteredData.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-all ${c.pago ? 'opacity-50' : ''}`}>
                    <td className="px-10 py-6 text-xs font-black text-slate-900">{new Date(c.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-10 py-6 text-xs font-bold text-slate-600 uppercase">{c.beneficiario}</td>
                    <td className="px-10 py-6 text-right font-black text-slate-900">{formatCurrency(c.valor)}</td>
                    <td className="px-10 py-6 text-center">
                      <button 
                        onClick={() => toggleStatus(c.id)}
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${c.pago ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-[#E30613] border-red-100'}`}
                      >
                        {c.pago ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <button onClick={() => deleteConta(c.id)} className="p-2 text-slate-300 hover:text-[#E30613] transition-all">
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

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-12 space-y-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Novo Lançamento</h3>
              <form onSubmit={handleAddConta} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Vencimento</label>
                       <input type="date" required value={newConta.dataPagamento} onChange={e => setNewConta({...newConta, dataPagamento: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Valor (R$)</label>
                       <input type="number" step="0.01" required value={newConta.valor || ''} onChange={e => setNewConta({...newConta, valor: parseFloat(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-right outline-none" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Beneficiário</label>
                    <input type="text" required value={newConta.beneficiario} onChange={e => setNewConta({...newConta, beneficiario: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase outline-none" />
                 </div>
                 <button type="submit" className="w-full py-5 bg-[#E30613] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">GRAVAR CONTA</button>
                 <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
