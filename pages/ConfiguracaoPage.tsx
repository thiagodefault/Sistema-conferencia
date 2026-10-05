
import React, { useState } from 'react';
import { Database, AlertTriangle, Trash2, Check, X, Users, Truck, Plus, Save, CloudDownload, CloudUpload, Info, ToggleLeft, ToggleRight, ShieldCheck, Percent, Calculator } from 'lucide-react';
import { AppConfig } from '../types';

interface ConfiguracaoPageProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  onClearDatabase: () => void;
}

export const ConfiguracaoPage: React.FC<ConfiguracaoPageProps> = ({ config, setConfig, onClearDatabase }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [mappingInput, setMappingInput] = useState({ id: '', name: '' });

  const addMapping = () => {
    if (!mappingInput.id || !mappingInput.name) return;
    setConfig(prev => ({
      ...prev,
      vendedoresMap: { ...prev.vendedoresMap, [mappingInput.id]: mappingInput.name }
    }));
    setMappingInput({ id: '', name: '' });
  };

  const removeMapping = (id: string) => {
    const newMap = { ...config.vendedoresMap };
    delete newMap[id];
    setConfig(prev => ({ ...prev, vendedoresMap: newMap }));
  };

  const toggleConfig = (key: keyof Pick<AppConfig, 'autoIgnoreDuplicates' | 'strictMarginAlert' | 'allowHistoricalLogisticsUpdate' | 'autoDetectStatusOnImport'>) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportBackup = () => {
    const allData = {
      config,
      history: localStorage.getItem('abc_gestao_vendas_history_v10'),
      contas: localStorage.getItem('abc_gestao_contas_pagar_v10'),
      recebimentos: localStorage.getItem('abc_gestao_recebimentos_v10'),
      ponto: localStorage.getItem('abc_ponto_v10')
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ABC_ITU_MASTER_DB_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    alert("Master Database Gerado. Salve este arquivo na sua pasta do Google Drive.");
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.config) setConfig(data.config);
        if (data.history) localStorage.setItem('abc_gestao_vendas_history_v10', data.history);
        if (data.contas) localStorage.setItem('abc_gestao_contas_pagar_v10', data.contas);
        if (data.recebimentos) localStorage.setItem('abc_gestao_recebimentos_v10', data.recebimentos);
        if (data.ponto) localStorage.setItem('abc_ponto_v10', data.ponto);
        
        alert("Restauração concluída! O sistema foi atualizado com os dados do Google Drive.");
        window.location.reload();
      } catch (err) {
        alert("Erro ao ler backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Configurações</h2>
          <p className="text-[#E30613] font-bold mt-2 uppercase text-[11px] tracking-[0.3em]">Gestão Master e Sincronismo Cloud</p>
        </div>
        <div className="flex gap-4">
           <label className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:border-blue-500 cursor-pointer transition-all active:scale-95">
              <CloudUpload className="w-4 h-4 text-blue-500" /> RESTAURAR DO DRIVE
              <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
           </label>
           <button onClick={exportBackup} className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
             <CloudDownload className="w-4 h-4" /> SALVAR MASTER NO DRIVE
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          {/* Parâmetros de Cálculo */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-8">
             <div className="flex items-center gap-4">
                <Calculator className="w-8 h-8 text-[#E30613]" />
                <h3 className="text-xl font-black uppercase tracking-tight">Parâmetros de Custo (Auditoria)</h3>
             </div>
             <p className="text-xs text-slate-400">Estes valores são usados exclusivamente na aba "Raio-X Custos" para simular a composição de preço.</p>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Imposto Padrão (%)</label>
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                      <Percent className="w-4 h-4 text-slate-300 mr-2" />
                      <input 
                        type="number" step="0.1" 
                        value={config.defaultTaxRate || 18}
                        onChange={(e) => setConfig({...config, defaultTaxRate: parseFloat(e.target.value)})}
                        className="w-full bg-transparent font-black text-slate-900 outline-none"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Royalties Padrão (%)</label>
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                      <Percent className="w-4 h-4 text-slate-300 mr-2" />
                      <input 
                        type="number" step="0.1" 
                        value={config.defaultRoyaltyRate || 3}
                        onChange={(e) => setConfig({...config, defaultRoyaltyRate: parseFloat(e.target.value)})}
                        className="w-full bg-transparent font-black text-slate-900 outline-none"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Custo Frete Médio (R$/Kg)</label>
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                      <span className="text-xs font-black text-slate-400 mr-2">R$</span>
                      <input 
                        type="number" step="0.1" 
                        value={config.fretePorKg || 1.5}
                        onChange={(e) => setConfig({...config, fretePorKg: parseFloat(e.target.value)})}
                        className="w-full bg-transparent font-black text-slate-900 outline-none"
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Mapeamento */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-8">
             <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-[#E30613]" />
                <h3 className="text-xl font-black uppercase tracking-tight">Mapeamento de Vendedores</h3>
             </div>
             
             <div className="flex gap-4">
                <input 
                  type="text" placeholder="ID Planilha" 
                  value={mappingInput.id} onChange={e => setMappingInput({...mappingInput, id: e.target.value})}
                  className="flex-1 px-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none text-xs"
                />
                <input 
                  type="text" placeholder="Nome Exibição" 
                  value={mappingInput.name} onChange={e => setMappingInput({...mappingInput, name: e.target.value})}
                  className="flex-1 px-6 py-4 bg-slate-50 border rounded-2xl font-bold outline-none text-xs"
                />
                <button onClick={addMapping} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg"><Plus /></button>
             </div>

             <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(config.vendedoresMap).map(([id, name]) => (
                  <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                     <div className="flex gap-4 items-center">
                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border">ID: {id}</span>
                        <span className="text-xs font-black uppercase text-slate-900">{name}</span>
                     </div>
                     <button onClick={() => removeMapping(id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Toggles de Inteligência */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-6">
             <div className="flex items-center gap-4 mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
                <h3 className="text-xl font-black uppercase tracking-tight">Inteligência Comercial</h3>
             </div>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Auto-Detectar Cancelados/Devolvidos</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Identifica status na importação base.</p>
                   </div>
                   <button onClick={() => toggleConfig('autoDetectStatusOnImport')}>
                      {config.autoDetectStatusOnImport ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                   </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Deduplicação Automática (MU)</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ignora MUs repetidas no faturamento.</p>
                   </div>
                   <button onClick={() => toggleConfig('autoIgnoreDuplicates')}>
                      {config.autoIgnoreDuplicates ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                   </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Retroatividade Logística</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Permite atualizar MUs de meses passados.</p>
                   </div>
                   <button onClick={() => toggleConfig('allowHistoricalLogisticsUpdate')}>
                      {config.allowHistoricalLogisticsUpdate ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                   </button>
                </div>
             </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-[3rem] p-10 flex flex-col items-center text-center">
             <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
             <h4 className="text-lg font-black text-red-900 uppercase tracking-tight mb-2">Zona Crítica</h4>
             <p className="text-red-800/70 text-xs font-medium mb-6 leading-relaxed">Apagar todos os dados locais e histórico consolidado. Certifique-se de ter salvo o Master no Drive.</p>
             <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-5 bg-[#E30613] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all"
             >RESETAR BASE DE DADOS</button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Confirmar Limpeza Total?</h3>
            <p className="text-slate-500 text-sm font-medium">Esta ação é irreversível.</p>
            <div className="flex flex-col gap-3">
               <button onClick={onClearDatabase} className="py-5 bg-[#E30613] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Sim, Apagar Definitivamente</button>
               <button onClick={() => setShowConfirm(false)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
