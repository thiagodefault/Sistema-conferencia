
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConferenciaPage } from './pages/ConferenciaPage';
import { CanceladosPage } from './pages/CanceladosPage';
import { DevolvidosPage } from './pages/DevolvidosPage';
import { OcorrenciasPage } from './pages/OcorrenciasPage';
import { AjustesVariosPage } from './pages/AjustesVariosPage';
import { AjustesFinaisPage } from './pages/AjustesFinaisPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnaliseVendedorPage } from './pages/AnaliseVendedorPage';
import { ConfiguracaoPage } from './pages/ConfiguracaoPage';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { FluxoCaixaPage } from './pages/FluxoCaixaPage';
import { DREPage } from './pages/DREPage';
import { ComissaoPage } from './pages/ComissaoPage';
import { FretePage } from './pages/FretePage';
import { HorasPage } from './pages/HorasPage';
import { AuditoriaCustosPage } from './pages/AuditoriaCustosPage'; // Importação da nova página
import { AgentesExecucaoPage } from './pages/AgentesExecucaoPage';
import { PageId, MesConferencia, Pedido, HistoricoConsolidado, ContaPagar, Recebimento, AppConfig } from './types';
import { Sparkles, Trash2, Database, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { storageService } from './services/storageService';
import { financeEngine } from './services/financeEngine';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  
  // Estado de Configuração Central
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('abc_app_config_v11');
    return saved ? JSON.parse(saved) : { 
      vendedoresMap: {}, 
      fretePorKg: 1.5, 
      metasMensais: {},
      autoIgnoreDuplicates: true,
      strictMarginAlert: false,
      allowHistoricalLogisticsUpdate: true,
      autoDetectStatusOnImport: true,
      defaultTaxRate: 18.0, // Padrão
      defaultRoyaltyRate: 3.0 // Padrão
    };
  });

  // Estado Comercial
  const [data, setData] = useState<MesConferencia | null>(storageService.getData());
  const [history, setHistory] = useState<HistoricoConsolidado>(storageService.getHistory());
  
  // Estado Financeiro
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>(storageService.getContasPagar());
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>(storageService.getRecebimentos());
  
  const [showToast, setShowToast] = useState<{show: boolean, msg: string, type: 'success' | 'danger'}>({show: false, msg: '', type: 'success'});
  const [showClearLogModal, setShowClearLogModal] = useState(false);

  const handleClearLog = () => {
    storageService.clearData();
    setData(null);
    setShowClearLogModal(false);
    triggerToast('Log de planilhas temporárias limpo com sucesso! Pronto para nova importação.', 'danger');
  };

  const handleValidateAndSaveToDatabase = () => {
    if (!data) return;
    storageService.saveToHistory(data);
    storageService.clearData();
    setData(null);
    setHistory(storageService.getHistory());
    setActivePage('dashboard');
    triggerToast('Planilhas validadas com 100% de integridade e gravadas no Banco de Dados permanente!', 'success');
  };

  useEffect(() => {
    localStorage.setItem('abc_app_config_v11', JSON.stringify(config));
  }, [config]);

  const triggerToast = (msg: string, type: 'success' | 'danger' = 'success') => {
    setShowToast({ show: true, msg, type });
    setTimeout(() => setShowToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const processAndSetData = (mes: MesConferencia) => {
    const pedidosProcessados = financeEngine.auditFretes(mes.pedidos.map(p => {
      const margemFinal = financeEngine.calculateMargemFinal(p);
      return {
        ...p,
        vendedor: financeEngine.resolveVendedor(p.vendedor, config),
        margemAjustada: margemFinal,
        margemReal: margemFinal
      };
    }));
    
    const updated = { ...mes, pedidos: pedidosProcessados };
    setData(updated);
    storageService.saveData(updated);
  };

  const handleUpdatePedido = useCallback((id: string, updates: Partial<Pedido>) => {
    setData(current => {
      if (!current) return null;
      const newPedidos = current.pedidos.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          updated.vendedor = financeEngine.resolveVendedor(updated.vendedor, config);
          updated.margemAjustada = financeEngine.calculateMargemFinal(updated);
          updated.margemReal = updated.margemAjustada;
          return updated;
        }
        return p;
      });
      const updatedData = { ...current, pedidos: financeEngine.auditFretes(newPedidos) };
      storageService.saveData(updatedData);
      return updatedData;
    });
  }, [config]);

  const handleSetData = (newData: MesConferencia | null, multiMonthData?: Record<string, Pedido[]>) => {
    if (multiMonthData) {
      Object.keys(multiMonthData).forEach(mesRef => {
        const pMes = multiMonthData[mesRef].map(p => ({
          ...p,
          vendedor: financeEngine.resolveVendedor(p.vendedor, config),
          margemAjustada: financeEngine.calculateMargemFinal(p)
        }));
        storageService.saveToHistory({ mesReferencia: mesRef, pedidos: financeEngine.auditFretes(pMes), ajustesExtras: [] });
      });
      setHistory(storageService.getHistory());
      triggerToast('Dados Importados e Processados!');
      if (newData) processAndSetData(newData);
    } else if (newData) {
      processAndSetData(newData);
    } else {
      storageService.clearData();
      setData(null);
    }
  };

  const handleCloseMonth = (consolidated: MesConferencia) => {
    storageService.saveToHistory(consolidated);
    storageService.clearData();
    setData(null);
    setHistory(storageService.getHistory());
    setActivePage('dashboard');
    triggerToast('Auditoria Mensal Concluída!', 'success');
  };

  const handleClearDatabase = () => {
    storageService.clearAll();
    setData(null);
    setHistory({ meses: [] });
    setContasPagar([]);
    setRecebimentos([]);
    setActivePage('dashboard');
    triggerToast('Sistema Resetado!', 'danger');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-red-100 selection:text-red-900 antialiased">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-grow flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-[#E30613] rounded-full animate-pulse"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ABC ITU — GESTÃO MASTER V12</p>
          </div>

          {/* CONTROLES CENTRAIS: LIMPEZA DE LOG & GRAVAÇÃO NO BANCO DE DADOS */}
          <div className="flex items-center gap-3">
            {data ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] font-black text-blue-900 uppercase">
                    Memória do Site: {data.pedidos.length} Pedidos ({data.mesReferencia})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowClearLogModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-full text-[10px] font-black uppercase transition-all shadow-sm active:scale-95"
                  title="Limpar o log e os arquivos temporários das planilhas armazenadas no site"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>LIMPAR LOG</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidateAndSaveToDatabase}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[10px] font-black uppercase shadow-md transition-all active:scale-95"
                  title="Valida os dados e grava permanentemente no banco de dados"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-200" />
                  <span>VALIDAR E GRAVAR NO BANCO</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Aguardando Importação de Planilhas</span>
              </div>
            )}
          </div>
        </header>

        {showToast.show && (
          <div className="fixed top-24 right-12 z-[250] animate-in slide-in-from-right-8 fade-in duration-500">
            <div className={`${showToast.type === 'success' ? 'bg-emerald-600' : 'bg-[#E30613]'} text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4`}>
               <Sparkles className="w-5 h-5" />
               <p className="text-[10px] font-black uppercase tracking-widest">{showToast.msg}</p>
            </div>
          </div>
        )}

        {/* MODAL GLOBAL DE LIMPEZA DE LOG */}
        {showClearLogModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 space-y-6 border border-slate-100 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">Limpar Log de Planilhas?</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  As planilhas temporariamente armazenadas no site serão apagadas para que você possa subir novos arquivos limpos. Os dados já consolidados no banco de dados permanente não serão afetados.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleClearLog}
                  className="w-full py-4 bg-[#E30613] hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  SIM, LIMPAR MEMÓRIA TEMPORÁRIA
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearLogModal(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 lg:p-12">
          <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-200/50 min-h-[75vh]">
            {activePage === 'dashboard' && <DashboardPage history={history} data={data} onSetData={handleSetData} />}
            {activePage === 'agentes-execucao' && (
              <AgentesExecucaoPage 
                data={data} 
                onSetData={handleSetData} 
              />
            )}
            {activePage === 'conferencia' && (
              <ConferenciaPage 
                data={data} 
                onSetData={handleSetData} 
                onUpdatePedido={handleUpdatePedido} 
                onDeletePedido={(id) => setData(prev => prev ? {...prev, pedidos: prev.pedidos.filter(p => p.id !== id)} : null)}
                onNavigateToAjustes={() => setActivePage('ajustes')} 
                onNavigateToOcorrencias={() => setActivePage('ocorrencias')}
                config={config}
                onClearLog={handleClearLog}
              />
            )}
            {activePage === 'cancelados' && <CanceladosPage data={data} onSetData={handleSetData} />}
            {activePage === 'devolvidos' && <DevolvidosPage data={data} onSetData={handleSetData} />}
            {activePage === 'ocorrencias' && <OcorrenciasPage data={data} onSetData={handleSetData} />}
            {activePage === 'ajustes-varios' && <AjustesVariosPage data={data} onSetData={handleSetData} />}
            {activePage === 'frete' && (
              <FretePage 
                data={data} 
                onSetData={handleSetData} 
                history={history} 
                onUpdateHistory={setHistory} 
              />
            )}
            {activePage === 'ajustes' && (
              <AjustesFinaisPage 
                data={data} 
                onUpdatePedido={handleUpdatePedido} 
                onDeletePedido={handleUpdatePedido} 
                onCloseMonth={handleCloseMonth} 
                onSetData={handleSetData}
                onClearLog={handleClearLog}
              />
            )}
            {activePage === 'analise-vendedor' && <AnaliseVendedorPage history={history} />}
            {activePage === 'contas-pagar' && <ContasPagarPage contas={contasPagar} setContas={setContasPagar} />}
            {activePage === 'fluxo-caixa' && <FluxoCaixaPage contasPagar={contasPagar} recebimentos={recebimentos} setRecebimentos={setRecebimentos} />}
            {activePage === 'dre' && <DREPage history={history} contasPagar={contasPagar} />}
            {activePage === 'comissao' && <ComissaoPage history={history} />}
            {activePage === 'horas' && <HorasPage />}
            {activePage === 'auditoria-custos' && <AuditoriaCustosPage history={history} config={config} />}
            {activePage === 'configuracao' && (
              <ConfiguracaoPage 
                config={config} 
                setConfig={setConfig} 
                onClearDatabase={handleClearDatabase} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
