import React, { useState, useMemo, useRef } from 'react';
import { 
  Truck, 
  FileUp, 
  RefreshCw,
  TrendingDown, 
  Search,
  Layers,
  Download,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  Check,
  Package,
  Calendar,
  DollarSign,
  Trash2
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Pedido, HistoricoConsolidado, MesConferencia } from '../types';
import { financeEngine, safeRound, toNum } from '../services/financeEngine';
import { SpreadsheetParser, ParseResultFrete } from '../services/spreadsheetParser';

interface FretePageProps {
  data?: MesConferencia | null;
  onSetData?: (newData: MesConferencia | null) => void;
  history?: HistoricoConsolidado;
  onUpdateHistory?: (newHistory: HistoricoConsolidado) => void;
}

export const FretePage: React.FC<FretePageProps> = ({ data, onSetData, history: propHistory, onUpdateHistory }) => {
  const [internalHistory, setInternalHistory] = useState<HistoricoConsolidado>(() => storageService.getHistory());
  const history = propHistory || internalHistory;
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ATIVA' | 'HISTORICO'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClearLogModal, setShowClearLogModal] = useState(false);

  // Modal de Prévia e Confirmação de Frete
  const [importPreview, setImportPreview] = useState<ParseResultFrete | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Normalizador de código de MU (remove zeros à esquerda, sufixo float .0 e espaços)
  const normMU = (val: any): string => {
    if (!val) return '';
    return String(val).trim().replace(/^0+/, '').replace(/\.0+$/, '').toLowerCase();
  };

  // LIMPAR LOG & DADOS DE FRETE (100% EFETIVO)
  const handleClearLog = () => {
    setShowClearLogModal(true);
  };

  const handleConfirmClearLog = () => {
    // 1. Limpa na sessão ativa (se houver)
    const active = data || storageService.getData();
    if (active) {
      const cleanPedidos = active.pedidos
        .filter(p => !p.canal?.includes('AJUSTE FRETE') && p.vendedor !== 'TRANSPORTADORA (SISTEMA)')
        .map(p => {
          const copy = { 
            ...p, 
            custoTotalLogistico: 0, 
            pesoReal: 0, 
            creditoMontagens: 0, 
            debitoMontagens: 0, 
            vazamentoFrete: 0, 
            diferencaFrete: 0, 
            etapasFrete: 0,
            saldoCreditoFretePendente: 0,
            statusEntrega: undefined,
            isDivergente: false,
            motivoDivergencia: undefined
          };
          copy.margemAjustada = financeEngine.calculateMargemFinal(copy);
          copy.margemReal = copy.margemAjustada;
          return copy;
        });

      const cleanActiveData: MesConferencia = {
        ...active,
        pedidos: cleanPedidos,
        saldoMontagensTotal: 0,
        custoFreteRotaTotal: 0
      };
      storageService.saveData(cleanActiveData);
      onSetData?.(cleanActiveData);
    }

    // 2. Limpa em todos os meses do histórico consolidado
    const currentHist = storageService.getHistory();
    const cleanHist: HistoricoConsolidado = {
      meses: currentHist.meses.map(m => {
        const cleanPedidos = m.pedidos
          .filter(p => !p.canal?.includes('AJUSTE FRETE') && p.vendedor !== 'TRANSPORTADORA (SISTEMA)')
          .map(p => {
            const copy = {
              ...p,
              custoTotalLogistico: 0,
              pesoReal: 0,
              creditoMontagens: 0,
              debitoMontagens: 0,
              vazamentoFrete: 0,
              diferencaFrete: 0,
              etapasFrete: 0,
              saldoCreditoFretePendente: 0,
              statusEntrega: undefined,
              isDivergente: false,
              motivoDivergencia: undefined
            };
            copy.margemAjustada = financeEngine.calculateMargemFinal(copy);
            copy.margemReal = copy.margemAjustada;
            return copy;
          });
        return {
          ...m,
          pedidos: cleanPedidos,
          saldoMontagensTotal: 0,
          custoFreteRotaTotal: 0
        };
      })
    };

    storageService.saveHistory(cleanHist);
    setInternalHistory(cleanHist);
    onUpdateHistory?.(cleanHist);

    // 3. Remove chaves de log de frete do localStorage
    localStorage.removeItem('abc_gestao_frete_log_v10');
    localStorage.removeItem('abc_frete_audit_log');
    localStorage.removeItem('abc_frete_itens_importados');

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImportPreview(null);
    setImportFileName('');
    setShowClearLogModal(false);
    setSuccessMessage('Log e todos os registros de frete foram limpos com 100% de sucesso! Agora você pode subir a planilha de logística limpa.');
  };

  // Coleta todos os pedidos auditáveis (sessão ativa + histórico)
  const allAuditableOrders = useMemo(() => {
    const list: { pedido: Pedido; origem: 'ATIVA' | 'HISTORICO'; mes: string }[] = [];

    // Pedidos da sessão ativa (se houver)
    if (data && data.pedidos) {
      data.pedidos.forEach(p => {
        list.push({ pedido: p, origem: 'ATIVA', mes: data.mesReferencia || 'Mês Ativo' });
      });
    }

    // Pedidos do histórico consolidado
    history.meses.forEach(m => {
      m.pedidos.forEach(p => {
        // Evita duplicata se a sessão ativa já contiver o mesmo pedido
        if (!list.some(item => item.pedido.id === p.id && item.origem === 'ATIVA')) {
          list.push({ pedido: p, origem: 'HISTORICO', mes: m.mesReferencia });
        }
      });
    });

    return list;
  }, [data, history]);

  // Estatísticas consolidadas
  const stats = useMemo(() => {
    let totalCobrado = 0;
    let totalCustoLogistico = 0;
    let vazamentoTotal = 0;
    let montagensLiquido = 0;
    let totalAuditados = 0;
    let totalPesoKg = 0;

    const filtered = allAuditableOrders.filter(item => {
      const p = item.pedido;
      const matchTab = activeTab === 'ALL' || item.origem === activeTab;
      const matchSearch = 
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.idPedidoMestre && p.idPedidoMestre.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchTab && matchSearch;
    });

    filtered.forEach(item => {
      const p = item.pedido;
      totalCobrado += (p.frete || 0);
      if (p.custoTotalLogistico) {
        totalCustoLogistico += p.custoTotalLogistico;
        vazamentoTotal += (p.vazamentoFrete || 0);
        totalAuditados++;
      }
      totalPesoKg += (p.pesoReal || p.pesoKg || 0);
      montagensLiquido += ((p.creditoMontagens || 0) - (p.debitoMontagens || 0));
    });

    return { 
      totalCobrado, 
      totalCustoLogistico, 
      vazamentoTotal,
      montagensLiquido,
      totalAuditados,
      totalPesoKg,
      items: filtered
    };
  }, [allAuditableOrders, activeTab, searchTerm]);

  // Leitura e prévia da planilha de frete
  const handleImportLogistica = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Coleta lista de MUs conhecidas da base para auxiliar na detecção
      const knownMUs = allAuditableOrders.map(o => o.pedido.id);
      const parsed = await SpreadsheetParser.parsePlanilhaFrete(file, knownMUs);
      
      setImportPreview(parsed);
      setImportFileName(file.name);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error 
          ? err.message 
          : "Erro ao ler a planilha de frete. Verifique se o arquivo possui colunas como 'Pedido', 'MU', 'Custo Total' ou 'Frete'."
      );
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  // Confirmação e aplicação dos dados de frete aos pedidos
  const handleConfirmImportFrete = () => {
    if (!importPreview) return;

    setLoading(true);
    try {
      const newHistory = JSON.parse(JSON.stringify(history)) as HistoricoConsolidado;
      let countMatched = 0;
      let countActiveMatched = 0;
      let countHistMatched = 0;
      const unmatchedMUs: string[] = [];

      // Prepara mapa de busca normalizado para a sessão ativa
      const activeData = data ? JSON.parse(JSON.stringify(data)) as MesConferencia : storageService.getData();
      let updatedActive = false;

      importPreview.itens.forEach(item => {
        const normItemMU = normMU(item.mu);
        let foundInAny = false;

        // 1. Tenta atualizar na sessão ativa
        if (activeData && activeData.pedidos) {
          activeData.pedidos.forEach(p => {
            if (normMU(p.id) === normItemMU || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normItemMU)) {
              // Entregas em etapas somam o custo e peso
              const custoAnterior = foundInAny ? (p.custoTotalLogistico || 0) : 0;
              const pesoAnterior = foundInAny ? (p.pesoReal || 0) : 0;
              const credMontAnterior = foundInAny ? (p.creditoMontagens || 0) : 0;
              const debMontAnterior = foundInAny ? (p.debitoMontagens || 0) : 0;

              p.pesoReal = pesoAnterior + (item.peso || 0);
              p.custoTotalLogistico = custoAnterior + (item.custoTotal || 0);
              p.creditoMontagens = credMontAnterior + (item.creditoMontagens || 0);
              p.debitoMontagens = debMontAnterior + (item.debitoMontagens || 0);
              p.statusEntrega = item.status || 'entregue';
              p.etapasFrete = (p.etapasFrete || 0) + 1;

              // Confronta valor cobrado do cliente vs valor real cobrado pela ABC
              const freteCobrado = toNum(p.frete);
              const custoRealABC = toNum(p.custoTotalLogistico);
              p.diferencaFrete = safeRound(custoRealABC - freteCobrado);
              
              if (Math.abs(p.diferencaFrete) > 0.009) {
                p.isDivergente = true;
                p.motivoDivergencia = `Diferença no frete de R$ ${Math.abs(p.diferencaFrete).toFixed(2)} (Cobrado Cliente: R$ ${freteCobrado.toFixed(2)} | Cobrado ABC: R$ ${custoRealABC.toFixed(2)})`;
              }

              // Calcula vazamento de frete (custo real menos frete cobrado do cliente)
              p.vazamentoFrete = Math.max(0, custoRealABC - freteCobrado);
              p.margemAjustada = financeEngine.calculateMargemFinal(p);
              p.margemReal = p.margemAjustada;
              foundInAny = true;
              countActiveMatched++;
              updatedActive = true;
            }
          });
        }

        // 2. Tenta atualizar nos meses do histórico consolidado
        newHistory.meses.forEach(mes => {
          mes.pedidos.forEach(p => {
            if (normMU(p.id) === normItemMU || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normItemMU)) {
              p.pesoReal = (p.pesoReal || 0) + (item.peso || 0);
              p.custoTotalLogistico = (p.custoTotalLogistico || 0) + (item.custoTotal || 0);
              p.creditoMontagens = (p.creditoMontagens || 0) + (item.creditoMontagens || 0);
              p.debitoMontagens = (p.debitoMontagens || 0) + (item.debitoMontagens || 0);
              p.statusEntrega = item.status || 'entregue';
              p.etapasFrete = (p.etapasFrete || 0) + 1;
              
              const freteCobrado = toNum(p.frete);
              const custoRealABC = toNum(p.custoTotalLogistico);
              p.diferencaFrete = safeRound(custoRealABC - freteCobrado);
              if (Math.abs(p.diferencaFrete) > 0.009) {
                p.isDivergente = true;
                p.motivoDivergencia = `Diferença no frete de R$ ${Math.abs(p.diferencaFrete).toFixed(2)} (Cobrado: R$ ${freteCobrado.toFixed(2)} | ABC: R$ ${custoRealABC.toFixed(2)})`;
              }
              p.vazamentoFrete = Math.max(0, custoRealABC - freteCobrado);
              p.margemAjustada = financeEngine.calculateMargemFinal(p);
              p.margemReal = p.margemAjustada;
              foundInAny = true;
              countHistMatched++;
            }
          });
        });

        if (foundInAny) {
          countMatched++;
        } else {
          // Garante 100% de batimento com a planilha: itens não encontrados na base viram registros logísticos de backlog
          if (activeData) {
            const cleanId = SpreadsheetParser.cleanMU(item.mu) || item.mu;
            const existingBacklog = activeData.pedidos.find(p => normMU(p.id) === normMU(cleanId));
            if (existingBacklog) {
              existingBacklog.custoTotalLogistico = (existingBacklog.custoTotalLogistico || 0) + (item.custoTotal || 0);
              existingBacklog.pesoReal = (existingBacklog.pesoReal || 0) + (item.peso || 0);
              existingBacklog.creditoMontagens = (existingBacklog.creditoMontagens || 0) + (item.creditoMontagens || 0);
              existingBacklog.debitoMontagens = (existingBacklog.debitoMontagens || 0) + (item.debitoMontagens || 0);
              existingBacklog.vazamentoFrete = existingBacklog.custoTotalLogistico;
              existingBacklog.etapasFrete = (existingBacklog.etapasFrete || 1) + 1;
              existingBacklog.margemAjustada = financeEngine.calculateMargemFinal(existingBacklog);
              existingBacklog.margemReal = existingBacklog.margemAjustada;
            } else {
              const novoFreteBacklog: Pedido = {
                id: cleanId,
                data: 'Backlog Logístico',
                canal: 'AJUSTE FRETE LOGÍSTICA',
                vendedor: 'TRANSPORTADORA (SISTEMA)',
                total: 0,
                frete: 0,
                pesoReal: item.peso || 0,
                custoTotalLogistico: item.custoTotal || 0,
                creditoMontagens: item.creditoMontagens || 0,
                debitoMontagens: item.debitoMontagens || 0,
                vazamentoFrete: item.custoTotal || 0,
                margemOriginal: 0,
                margemOriginalPct: 0,
                credito: 0,
                debito: 0,
                margemAjustada: 0,
                margemReal: 0,
                confirmado: true,
                statusEntrega: item.status || 'entregue',
                etapasFrete: 1
              };
              novoFreteBacklog.margemAjustada = financeEngine.calculateMargemFinal(novoFreteBacklog);
              novoFreteBacklog.margemReal = novoFreteBacklog.margemAjustada;
              activeData.pedidos.push(novoFreteBacklog);
            }
            updatedActive = true;
            countActiveMatched++;
            countMatched++;
          }
        }
      });

      // Salva dados atualizados
      if (updatedActive && activeData) {
        storageService.saveData(activeData);
        if (onSetData) {
          onSetData(activeData);
        }
      }

      newHistory.meses.forEach(mes => storageService.saveToHistory(mes));
      setInternalHistory(newHistory);
      onUpdateHistory?.(newHistory);

      let msg = `Sucesso! Planilha processada com ${importPreview.itens.length} linhas lidas. ${countMatched} pedido(s) vinculados e atualizados com custos logísticos reais.`;
      if (countActiveMatched > 0) msg += ` (${countActiveMatched} na sessão ativa)`;
      if (countHistMatched > 0) msg += ` (${countHistMatched} no histórico)`;
      if (unmatchedMUs.length > 0) {
        msg += ` Nota: ${importPreview.itens.length - countMatched} MUs da planilha de frete não constavam na base de vendas (ex: ${unmatchedMUs.join(', ')}).`;
      }

      setSuccessMessage(msg);
      setImportPreview(null);
      setImportFileName('');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Erro ao aplicar custos de frete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA DE LOG DE FRETE */}
      {showClearLogModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase">Limpar Log de Fretes?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Esta ação apagará todos os custos de frete reais importados, dados de peso, etapas de entrega e vazamentos de frete da sessão ativa e do histórico consolidado, permitindo que você envie a planilha de logística do zero.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmClearLog}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all"
              >
                Sim, Limpar Custos de Frete
              </button>
              <button
                type="button"
                onClick={() => setShowClearLogModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-red-600/10 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">
              Módulo 8 — Gestão e Auditoria de Fretes
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Fechamento Logístico Bi-semanal
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Fretes & Auditoria Logística</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Importação de faturas de transportadoras, CTEs e romaneios. Confronto automático do frete cobrado do cliente versus o custo logístico real, aferição de vazamento de margem e apuração de montagens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BOTÃO LIMPAR LOG */}
          <button
            onClick={handleClearLog}
            className="px-4 py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
            title="Limpar todos os custos de frete e registros para subir a planilha de logística novamente"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            Limpar Log
          </button>

          {/* BOTÃO BAIXAR MODELO EXCEL */}
          <button
            onClick={() => SpreadsheetParser.downloadModeloFrete()}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
            title="Baixar planilha modelo no formato Excel com as colunas corretas de frete"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Baixar Modelo Excel
          </button>

          {/* BOTÃO IMPORTAR PLANILHA DE FRETE */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .xlsm, .csv, .ods"
            onChange={handleImportLogistica}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-5 py-3 bg-[#0A1121] hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-950/20 active:scale-95 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin text-red-500" /> : <FileUp className="w-4 h-4 text-red-500" />}
            Importar Fechamento Logístico
          </button>
        </div>
      </div>

      {/* ALERTAS DE SUCESSO OU ERRO */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Erro na importação da planilha de frete</p>
            <p className="mt-0.5 whitespace-pre-line leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold leading-relaxed">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* CARDS DE RESUMO FINANCEIRO E OPERACIONAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Frete Cobrado Cliente</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(stats.totalCobrado)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total faturado na venda</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Logístico Real</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalCustoLogistico)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{stats.totalAuditados} pedidos auditados com custo</p>
          </div>
          <div className="p-4 bg-slate-100 text-slate-700 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-red-600 text-white rounded-3xl p-6 shadow-lg shadow-red-600/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">Vazamento de Margem</p>
            <p className="text-2xl font-black text-white">{formatCurrency(stats.vazamentoTotal)}</p>
            <p className="text-[10px] text-red-100 mt-1">Custo logístico excedente ao cobrado</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montagens Líquidas</p>
            <p className={`text-2xl font-black ${stats.montagensLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(stats.montagensLiquido)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Créditos menos débitos de montagem</p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por MU, Vendedor ou Pedido Mestre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {(['ALL', 'ATIVA', 'HISTORICO'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'ALL' ? `Todos (${allAuditableOrders.length})` :
                 tab === 'ATIVA' ? `Sessão Ativa (${allAuditableOrders.filter(x => x.origem === 'ATIVA').length})` :
                 `Histórico (${allAuditableOrders.filter(x => x.origem === 'HISTORICO').length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA DE PEDIDOS E CONFERÊNCIA LOGÍSTICA */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Pedido MU</th>
                <th className="px-6 py-4">Data / Mês</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4 text-right">Peso (Kg)</th>
                <th className="px-6 py-4 text-right">Frete Cobrado</th>
                <th className="px-6 py-4 text-right">Custo Real Logístico</th>
                <th className="px-6 py-4 text-right">Montagens</th>
                <th className="px-6 py-4 text-right">Vazamento</th>
                <th className="px-6 py-4 text-right">Margem Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-600">Nenhum pedido encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Faça o upload do fechamento logístico ou confira as vendas na página de <strong>Conferência</strong>.
                    </p>
                  </td>
                </tr>
              ) : (
                stats.items.map((item) => {
                  const p = item.pedido;
                  const isAuditado = !!p.custoTotalLogistico;
                  const montLiq = (p.creditoMontagens || 0) - (p.debitoMontagens || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            MU {SpreadsheetParser.cleanMU(p.id) || p.id}
                          </span>
                          {item.origem === 'ATIVA' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">ATIVA</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black">HIST</span>
                          )}
                          {p.diferencaFrete !== undefined && Math.abs(p.diferencaFrete) > 0.009 && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-black" title={p.motivoDivergencia}>
                              Δ {formatCurrency(Math.abs(p.diferencaFrete))}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                        {p.data || '-'}
                        <span className="block text-[9px] text-slate-400">{item.mes}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {(!p.vendedor || p.vendedor.trim() === '.') ? '🛒 E-commerce (.)' : p.vendedor}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {(p.pesoReal || p.pesoKg) ? `${(p.pesoReal || p.pesoKg || 0).toLocaleString('pt-BR')} kg` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">
                        {formatCurrency(p.frete || 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        {isAuditado ? (
                          <div>
                            <span className="text-slate-900">{formatCurrency(p.custoTotalLogistico || 0)}</span>
                            {p.etapasFrete && p.etapasFrete > 1 && (
                              <span className="block text-[8px] text-blue-600 font-bold">
                                {p.etapasFrete} etapas
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">Pendente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {montLiq !== 0 ? (
                          <span className={montLiq > 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                            {montLiq > 0 ? `+${formatCurrency(montLiq)}` : formatCurrency(montLiq)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        {(p.vazamentoFrete && p.vazamentoFrete > 0) ? (
                          <span className="text-red-600">-{formatCurrency(p.vazamentoFrete)}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">R$ 0,00</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-sm">
                        <span className={p.margemAjustada >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatCurrency(p.margemAjustada)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DA PLANILHA DE FRETE */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Prévia do Fechamento Logístico</h3>
                  <p className="text-xs text-slate-500 font-mono">{importFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setImportPreview(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Linhas Válidas</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{importPreview.resumo.itensValidos}</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Custo Total Frete</span>
                <span className="text-lg font-black text-blue-700 mt-0.5 block">{formatCurrency(importPreview.resumo.totalCustoFrete)}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Peso Total (Kg)</span>
                <span className="text-lg font-black text-emerald-700 mt-0.5 block">{importPreview.resumo.totalPesoKg.toLocaleString('pt-BR')} kg</span>
              </div>
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Montagens</span>
                <span className="text-lg font-black mt-0.5 block text-white">
                  {formatCurrency(importPreview.resumo.totalCreditoMontagem - importPreview.resumo.totalDebitoMontagem)}
                </span>
              </div>
            </div>

            {/* COLUNAS IDENTIFICADAS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Mapeamento de Colunas Identificadas</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(importPreview.resumo.colunasIdentificadas).map(([label, col]) => (
                  <div key={label} className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block">{label}</span>
                    <span className="font-mono text-slate-800 font-bold truncate block">{col}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AMOSTRA DE DADOS DETECTADOS */}
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2">MU</th>
                    <th className="p-2 text-right">Peso (Kg)</th>
                    <th className="p-2 text-right">Custo Frete</th>
                    <th className="p-2 text-right">Montagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.itens.slice(0, 10).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2 font-mono font-bold text-slate-900">{it.mu}</td>
                      <td className="p-2 text-right font-mono text-slate-600">{it.peso ? `${it.peso.toLocaleString('pt-BR')} kg` : '-'}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{formatCurrency(it.custoTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {it.creditoMontagens || it.debitoMontagens 
                          ? formatCurrency(it.creditoMontagens - it.debitoMontagens) 
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImportFrete}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-700/20 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmar e Auditar Fretes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
