import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Link as LinkIcon, 
  Database, 
  CheckCircle2, 
  Info, 
  FileUp, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  Sparkles,
  Edit2,
  Unlink,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { MesConferencia, AjusteExtra, Pedido } from '../types';
import { SpreadsheetParser, ParseResultAjustes } from '../services/spreadsheetParser';
import { AgentOperationsEngine } from '../services/agentOperations';
import { financeEngine } from '../services/financeEngine';
import { PainelBatimentoPlanilhas } from '../components/PainelBatimentoPlanilhas';

interface AjustesVariosPageProps {
  data: MesConferencia | null;
  onSetData: (newData: MesConferencia | null) => void;
}

export const AjustesVariosPage: React.FC<AjustesVariosPageProps> = ({ data, onSetData }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'credito' | 'debito' | 'vinculado' | 'sem_vinculo'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de Prévia de Importação de Planilha
  const [importPreview, setImportPreview] = useState<ParseResultAjustes | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');

  // Estado para Edição Rápida de Vínculo de MU por Linha
  const [editingAjusteId, setEditingAjusteId] = useState<string | null>(null);
  const [manualMUInput, setManualMUInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // LIMPAR LOG & AJUSTES MANUAIS
  const handleClearLog = () => {
    if (!data) return;
    const cleanPedidos = data.pedidos.map(p => {
      const copy = { 
        ...p, 
        credito: 0, 
        debito: 0, 
        creditoAlocado: 0, 
        debitoAlocado: 0 
      };
      copy.margemAjustada = financeEngine.calculateMargemFinal(copy);
      copy.margemReal = copy.margemAjustada;
      return copy;
    });

    onSetData({
      ...data,
      pedidos: cleanPedidos,
      ajustesExtras: []
    });

    setImportPreview(null);
    setSuccessMessage('Log e planilha de ajustes limpos com sucesso! Agora você pode subir a planilha novamente sem duplicar valores.');
  };

  const [newAjuste, setNewAjuste] = useState<Partial<AjusteExtra>>({
    descricao: '',
    valor: 0,
    tipo: 'credito',
    pedidoMU: ''
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const normMU = (val: any): string => {
    if (!val) return '';
    return String(val).trim().replace(/^0+/, '').replace(/\.0+$/, '').toLowerCase();
  };

  // Inicializa sessão se estiver nula
  const ensureActiveData = (): MesConferencia => {
    if (data) return data;
    const mesAtual = new Date().toISOString().slice(0, 7);
    const novo: MesConferencia = {
      mesReferencia: mesAtual,
      pedidos: [],
      ajustesExtras: []
    };
    return novo;
  };

  // Mapa rápido de pedidos por ID normalizado
  const pedidosMap = useMemo(() => {
    const map = new Map<string, Pedido>();
    if (data?.pedidos) {
      data.pedidos.forEach(p => {
        map.set(normMU(p.id), p);
        if (p.idPedidoMestre) {
          map.set(normMU(p.idPedidoMestre), p);
        }
      });
    }
    return map;
  }, [data?.pedidos]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const knownMUs = data?.pedidos.map(p => p.id) || [];
      const parsed = await SpreadsheetParser.parseAjustes(file, knownMUs);
      setImportPreview(parsed);
      setImportFileName(file.name);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao processar planilha de ajustes.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const currentData = ensureActiveData();
    let currentAjustes = importMode === 'replace' ? [] : [...(currentData.ajustesExtras || [])];
    const novosAjustes = importPreview.ajustes;

    // Se for modo substituir ('replace'), zera créditos/débitos anteriores nos pedidos para não duplicar valores
    const updatedPedidos = currentData.pedidos.map(p => {
      if (importMode === 'replace') {
        const copy = { 
          ...p, 
          credito: 0, 
          debito: 0, 
          creditoAlocado: 0, 
          debitoAlocado: 0 
        };
        copy.margemAjustada = financeEngine.calculateMargemFinal(copy);
        copy.margemReal = copy.margemAjustada;
        return copy;
      }
      return { ...p };
    });

    novosAjustes.forEach(ajuste => {
      if (ajuste.pedidoMU) {
        const normKey = normMU(ajuste.pedidoMU);
        const pIdx = updatedPedidos.findIndex(p => normMU(p.id) === normKey || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normKey));
        if (pIdx !== -1) {
          // Atualiza para o ID oficial do pedido
          ajuste.pedidoMU = updatedPedidos[pIdx].id;

          if (ajuste.tipo === 'credito') {
            updatedPedidos[pIdx].credito = (updatedPedidos[pIdx].credito || 0) + ajuste.valor;
          } else {
            updatedPedidos[pIdx].debito = (updatedPedidos[pIdx].debito || 0) + ajuste.valor;
          }
          updatedPedidos[pIdx].margemAjustada = financeEngine.calculateMargemFinal(updatedPedidos[pIdx]);
          updatedPedidos[pIdx].margemReal = updatedPedidos[pIdx].margemAjustada;
        }
      }
    });

    const finalAjustes = [...currentAjustes, ...novosAjustes];

    onSetData({
      ...currentData,
      pedidos: updatedPedidos,
      ajustesExtras: finalAjustes
    });

    let msg = `Sucesso! ${novosAjustes.length} ajustes importados (${formatCurrency(importPreview.resumo.totalCreditos)} em créditos e ${formatCurrency(importPreview.resumo.totalDebitos)} em débitos).`;
    if (importPreview.resumo.vinculadosPorDescricao > 0) {
      msg += ` ${importPreview.resumo.vinculadosPorDescricao} MUs foram extraídos automaticamente do texto das descrições.`;
    }
    setSuccessMessage(msg);
    setImportPreview(null);
    setImportFileName('');
  };

  // OPERAÇÃO DIRETA COM AGENTE: Vincular MUs das Descrições aos Pedidos
  const handleVincularMUsDescricao = () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = AgentOperationsEngine.vincularMUsDeDescricoesEmAjustes(data, onSetData);
      if (res.sucesso) {
        setSuccessMessage(res.mensagem);
      } else {
        setErrorMessage(res.mensagem);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao executar vinculação com agente.");
    } finally {
      setLoading(false);
    }
  };

  // ALOCAÇÃO DIRETA NOS PEDIDOS PARA APURAÇÃO DA MARGEM REAL (100% BATIMENTO)
  const handleAlocarTodosValoresNosPedidos = () => {
    if (!data) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = financeEngine.alocarDebitosECreditos(data.pedidos, data.ajustesExtras || []);
      onSetData({
        ...data,
        pedidos: res.pedidosAtualizados
      });
      setSuccessMessage(
        `Sucesso! Todos os débitos e créditos da planilha foram distribuídos nos pedidos (${formatCurrency(res.totalCreditosAlocados)} em créditos e ${formatCurrency(res.totalDebitosAlocados)} em débitos). A Margem Real de cada pedido foi apurada com 100% de batimento consolidado!`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao alocar débitos e créditos.");
    } finally {
      setLoading(false);
    }
  };

  // Vínculo manual ou alteração de MU em um ajuste existente
  const handleSaveManualLink = (ajusteId: string) => {
    if (!data) return;
    const currentData = ensureActiveData();
    const ajuste = currentData.ajustesExtras?.find(a => a.id === ajusteId);
    if (!ajuste) return;

    const oldMU = ajuste.pedidoMU;
    const newMU = manualMUInput.trim();

    const updatedPedidos = [...currentData.pedidos];

    // Remove efeito do pedido antigo
    if (oldMU) {
      const oldIdx = updatedPedidos.findIndex(p => normMU(p.id) === normMU(oldMU));
      if (oldIdx !== -1) {
        if (ajuste.tipo === 'credito') updatedPedidos[oldIdx].credito -= ajuste.valor;
        else updatedPedidos[oldIdx].debito -= ajuste.valor;
        updatedPedidos[oldIdx].margemAjustada = financeEngine.calculateMargemFinal(updatedPedidos[oldIdx]);
      }
    }

    // Aplica no novo pedido
    let targetMUToSave = newMU || undefined;
    if (newMU) {
      const newIdx = updatedPedidos.findIndex(p => normMU(p.id) === normMU(newMU) || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normMU(newMU)));
      if (newIdx !== -1) {
        targetMUToSave = updatedPedidos[newIdx].id;
        if (ajuste.tipo === 'credito') updatedPedidos[newIdx].credito += ajuste.valor;
        else updatedPedidos[newIdx].debito += ajuste.valor;
        updatedPedidos[newIdx].margemAjustada = financeEngine.calculateMargemFinal(updatedPedidos[newIdx]);
      }
    }

    const updatedAjustes = (currentData.ajustesExtras || []).map(a => {
      if (a.id === ajusteId) {
        return { ...a, pedidoMU: targetMUToSave };
      }
      return a;
    });

    onSetData({
      ...currentData,
      pedidos: updatedPedidos,
      ajustesExtras: updatedAjustes
    });

    setEditingAjusteId(null);
    setManualMUInput('');
    setSuccessMessage(`Vínculo do ajuste atualizado com sucesso!`);
  };

  const handleAddAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAjuste.descricao || !newAjuste.valor) return;

    const currentData = ensureActiveData();
    const rawMU = newAjuste.pedidoMU?.trim() || "";
    
    // Tenta também extrair MU da descrição se não preenchido
    let muToUse = rawMU;
    if (!muToUse && newAjuste.descricao) {
      const known = currentData.pedidos.map(p => p.id);
      const extracted = SpreadsheetParser.extractMUFromText(newAjuste.descricao, known);
      if (extracted) muToUse = extracted;
    }

    const ajuste: AjusteExtra = {
      id: crypto.randomUUID(),
      descricao: newAjuste.descricao,
      valor: Math.abs(newAjuste.valor),
      tipo: newAjuste.tipo as 'credito' | 'debito',
      pedidoMU: muToUse || undefined,
      data: new Date().toLocaleDateString('pt-BR')
    };

    const newPedidos = [...currentData.pedidos];
    if (ajuste.pedidoMU) {
      const idx = newPedidos.findIndex(p => normMU(p.id) === normMU(ajuste.pedidoMU) || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normMU(ajuste.pedidoMU)));
      if (idx !== -1) {
        ajuste.pedidoMU = newPedidos[idx].id;
        if (ajuste.tipo === 'credito') newPedidos[idx].credito += ajuste.valor;
        else newPedidos[idx].debito += ajuste.valor;
        newPedidos[idx].margemAjustada = financeEngine.calculateMargemFinal(newPedidos[idx]);
      }
    }

    onSetData({
      ...currentData,
      pedidos: newPedidos,
      ajustesExtras: [...(currentData.ajustesExtras || []), ajuste]
    });

    setShowForm(false);
    setNewAjuste({ descricao: '', valor: 0, tipo: 'credito', pedidoMU: '' });
    setSuccessMessage('Ajuste cadastrado com sucesso!');
  };

  const deleteAjuste = (id: string) => {
    if (!data) return;
    const a = data.ajustesExtras?.find(x => x.id === id);
    const newExtras = (data.ajustesExtras || []).filter(x => x.id !== id);
    
    const newPedidos = [...data.pedidos];
    if (a?.pedidoMU) {
      const idx = newPedidos.findIndex(p => normMU(p.id) === normMU(a.pedidoMU));
      if (idx !== -1) {
        if (a.tipo === 'credito') newPedidos[idx].credito -= a.valor;
        else newPedidos[idx].debito -= a.valor;
        newPedidos[idx].margemAjustada = financeEngine.calculateMargemFinal(newPedidos[idx]);
      }
    }

    onSetData({ ...data, pedidos: newPedidos, ajustesExtras: newExtras });
  };

  const handleClearAllAjustes = () => {
    if (!data || !data.ajustesExtras || data.ajustesExtras.length === 0) return;
    if (!window.confirm("Deseja realmente remover todos os ajustes manuais lançados?")) return;

    const cleanPedidos = data.pedidos.map(p => ({
      ...p,
      credito: 0,
      debito: 0,
      margemAjustada: financeEngine.calculateMargemFinal({ ...p, credito: 0, debito: 0 })
    }));

    onSetData({
      ...data,
      pedidos: cleanPedidos,
      ajustesExtras: []
    });
    setSuccessMessage('Todos os ajustes foram removidos.');
  };

  // Cálculos de resumo
  const ajustes = data?.ajustesExtras || [];
  const totalCreditos = useMemo(() => 
    ajustes.filter(x => x.tipo === 'credito').reduce((a, b) => a + b.valor, 0), [ajustes]);
  const totalDebitos = useMemo(() => 
    ajustes.filter(x => x.tipo === 'debito').reduce((a, b) => a + b.valor, 0), [ajustes]);
  const saldoLiquido = totalCreditos - totalDebitos;

  const countVinculados = useMemo(() => 
    ajustes.filter(a => !!a.pedidoMU).length, [ajustes]);
  const countSemVinculo = ajustes.length - countVinculados;

  const filteredAjustes = useMemo(() => {
    return ajustes.filter(a => {
      const matchType = 
        filterType === 'ALL' || 
        (filterType === 'vinculado' ? !!a.pedidoMU : 
         filterType === 'sem_vinculo' ? !a.pedidoMU : 
         a.tipo === filterType);

      const matchSearch = 
        a.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.pedidoMU && a.pedidoMU.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchType && matchSearch;
    });
  }, [ajustes, filterType, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-red-600/10 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">
              Módulo 7 — Ajustes Manuais
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Regra Algébrica Canônica Ativa
            </span>
            {countSemVinculo > 0 && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {countSemVinculo} Ajustes sem Vínculo de MU
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ajustes Vários e Lançamentos Extras</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Importação em lote de planilhas e lançamentos avulsos de créditos (+) e débitos (-). Os ajustes compõem diretamente o Consolidado Master (+3.904,88 - 3.656,78 = +248,10). Identificação e vinculação de MUs a pedidos para apuração exata da Margem Final.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BOTÃO OPERAÇÃO DIRETA COM AGENTE: VINCULAR MUs */}
          <button
            onClick={handleVincularMUsDescricao}
            disabled={loading || ajustes.length === 0}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-700/20 active:scale-95 transition disabled:opacity-50"
            title="Agente MOD-007-AJU varre o texto das descrições, identifica números de MU e vincula aos pedidos para calcular margem final"
          >
            <Zap className="w-4 h-4 fill-white" />
            Vincular MUs das Descrições
          </button>

          {/* BOTÃO ALOCAR DÉBITOS E CRÉDITOS PARA MARGEM REAL */}
          <button
            onClick={handleAlocarTodosValoresNosPedidos}
            disabled={loading || !data || data.pedidos.length === 0}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            title="Aloca todos os débitos e créditos gerais da planilha dentro dos pedidos para cálculo da Margem Real de cada pedido"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            Alocar nos Pedidos (Margem Real)
          </button>

          {/* BOTÃO LIMPAR LOG */}
          <button
            onClick={handleClearLog}
            className="px-4 py-3 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
            title="Limpar todos os ajustes importados para subir a planilha novamente sem duplicar valores"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            Limpar Log
          </button>

          {/* BOTÃO BAIXAR MODELO EXCEL */}
          <button
            onClick={() => SpreadsheetParser.downloadModeloAjustes()}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
            title="Baixar planilha modelo no formato Excel com as colunas corretas"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Baixar Modelo Excel
          </button>

          {/* BOTÃO IMPORTAR PLANILHA */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .xlsm, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-700/20 active:scale-95 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Importar Planilha de Ajustes
          </button>

          {/* BOTÃO LANÇAMENTO MANUAL */}
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            Novo Ajuste Manual
          </button>
        </div>
      </div>

      {/* PAINEL DE BATIMENTO GERAL DE TODAS AS PLANILHAS */}
      <PainelBatimentoPlanilhas data={data} onSetData={onSetData} />

      {/* ALERTAS DE SUCESSO OU ERRO */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Aviso / Erro no Processamento</p>
            <p className="mt-0.5 whitespace-pre-line">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Créditos (+)</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalCreditos)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{ajustes.filter(x => x.tipo === 'credito').length} lançamentos de acréscimo</p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Plus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Débitos (-)</p>
            <p className="text-2xl font-black text-red-600">{formatCurrency(totalDebitos)}</p>
            <p className="text-[10px] text-slate-400 mt-1">{ajustes.filter(x => x.tipo === 'debito').length} lançamentos de dedução</p>
          </div>
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
            <Minus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Líquido dos Ajustes</p>
            <p className={`text-2xl font-black ${saldoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(saldoLiquido)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Impacto direto no Consolidado Master</p>
          </div>
          <div className="p-4 bg-slate-800 text-slate-300 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MUs Vinculados</p>
            <p className="text-2xl font-black text-blue-600">{countVinculados} / {ajustes.length}</p>
            <p className="text-[10px] text-slate-400 mt-1">{countSemVinculo} sem vínculo específico</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <LinkIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição ou número do MU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {(['ALL', 'credito', 'debito', 'vinculado', 'sem_vinculo'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  filterType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'ALL' ? `Todos (${ajustes.length})` : 
                 type === 'credito' ? 'Créditos' : 
                 type === 'debito' ? 'Débitos' : 
                 type === 'vinculado' ? `Com MU (${countVinculados})` : `Sem MU (${countSemVinculo})`}
              </button>
            ))}
          </div>

          {ajustes.length > 0 && (
            <button
              onClick={handleClearAllAjustes}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
              title="Excluir todos os ajustes"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar Todos
            </button>
          )}
        </div>
      </div>

      {/* TABELA DE AJUSTES E MARGEM FINAL DOS PEDIDOS */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição do Lançamento</th>
                <th className="px-6 py-4">Vínculo Pedido / MU</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-right">Valor Ajuste</th>
                <th className="px-6 py-4 text-right">Margem Final Pedido</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAjustes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <Database className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-600">Nenhum ajuste encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Clique em <strong>"Importar Planilha de Ajustes"</strong> ou <strong>"Novo Ajuste Manual"</strong> para lançar.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAjustes.map((a) => {
                  const linkedPedido = a.pedidoMU ? pedidosMap.get(normMU(a.pedidoMU)) : undefined;
                  const isEditingThis = editingAjusteId === a.id;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">{a.data || '-'}</td>
                      
                      {/* DESCRIÇÃO DO LANÇAMENTO */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{a.descricao}</span>
                        {/* Se não tinha vínculo explícito mas tem padrão no texto */}
                        {!a.pedidoMU && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Info className="w-3 h-3 text-slate-400" /> Clique no botão Vincular para associar a um pedido.
                          </span>
                        )}
                      </td>

                      {/* VÍNCULO PEDIDO / MU */}
                      <td className="px-6 py-4">
                        {isEditingThis ? (
                          <div className="flex flex-col gap-1.5 min-w-[200px] animate-in fade-in">
                            <div className="flex items-center gap-1.5">
                              <input
                                list="pedidos-ajustes-datalist"
                                type="text"
                                placeholder="Selecione ou digite o MU..."
                                value={manualMUInput}
                                onChange={(e) => setManualMUInput(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveManualLink(a.id)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                                title="Salvar e colocar valor dentro do pedido"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setEditingAjusteId(null); setManualMUInput(''); }}
                                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </div>
                            <datalist id="pedidos-ajustes-datalist">
                              {data?.pedidos.map(p => (
                                <option key={p.id} value={p.id}>
                                  MU {p.id} — {p.vendedor} — {formatCurrency(p.total || 0)} (Margem: {formatCurrency(p.margemReal || p.margemAjustada || 0)})
                                </option>
                              ))}
                            </datalist>
                            <span className="text-[8px] text-slate-400">
                              Escolha o pedido da lista para colocar o valor e apurar a margem final.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {a.pedidoMU ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black border border-blue-100 font-mono">
                                <LinkIcon className="w-3 h-3" /> {a.pedidoMU}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Global (Sem MU)</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingAjusteId(a.id);
                                setManualMUInput(a.pedidoMU || '');
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition"
                              title="Editar ou vincular MU manualmente"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* TIPO */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          a.tipo === 'credito' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {a.tipo === 'credito' ? '+ Crédito' : '- Débito'}
                        </span>
                      </td>

                      {/* VALOR DO AJUSTE */}
                      <td className={`px-6 py-4 text-right font-black font-mono text-sm ${
                        a.tipo === 'credito' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {a.tipo === 'credito' ? `+${formatCurrency(a.valor)}` : `-${formatCurrency(a.valor)}`}
                      </td>

                      {/* MARGEM FINAL DO PEDIDO VINCULADO */}
                      <td className="px-6 py-4 text-right">
                        {linkedPedido ? (
                          <div>
                            <span className={`font-mono font-black text-sm block ${
                              linkedPedido.margemAjustada >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(linkedPedido.margemAjustada)}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-mono">
                              Orig: {formatCurrency(linkedPedido.margemOriginal)} ({linkedPedido.vendedor})
                            </span>
                          </div>
                        ) : a.pedidoMU ? (
                          <div>
                            <span className="text-[10px] text-amber-600 font-bold block">MU fora do mês ativo</span>
                            <span className="text-[9px] text-slate-400">Impacta Consolidado</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Ajuste Master</span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteAjuste(a.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Excluir este ajuste"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE IMPORTAÇÃO */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Prévia da Planilha de Ajustes</h3>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Ajustes</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{importPreview.resumo.totalLidos}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Créditos (+)</span>
                <span className="text-lg font-black text-emerald-700 mt-0.5 block">{formatCurrency(importPreview.resumo.totalCreditos)}</span>
              </div>
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block">Débitos (-)</span>
                <span className="text-lg font-black text-red-700 mt-0.5 block">{formatCurrency(importPreview.resumo.totalDebitos)}</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">MUs Detectados</span>
                <span className="text-lg font-black text-blue-700 mt-0.5 block">{importPreview.resumo.vinculadosMU}</span>
              </div>
            </div>

            {importPreview.resumo.vinculadosPorDescricao > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <p>
                  <strong>{importPreview.resumo.vinculadosPorDescricao} MUs</strong> foram identificados e extraídos automaticamente do texto das descrições.
                </p>
              </div>
            )}

            {/* OPÇÕES DE MESCLAGEM OU SUBSTITUIÇÃO */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Opção de Ingestão</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Adicionar aos ajustes atuais (Mesclar)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>Substituir lista de ajustes anterior</span>
                </label>
              </div>
            </div>

            {/* AMOSTRA DE LINHAS DETECTADAS */}
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">MU Identificado</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.ajustes.slice(0, 10).map((aj, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium text-slate-800">{aj.descricao}</td>
                      <td className="p-2 font-mono text-slate-700 font-bold">{aj.pedidoMU || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          aj.tipo === 'credito' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {aj.tipo}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(aj.valor)}</td>
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
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-700/20 transition"
              >
                <Check className="w-4 h-4" /> Confirmar e Aplicar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO MANUAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Novo Lançamento Manual</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddAjuste} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewAjuste({ ...newAjuste, tipo: 'credito' })}
                  className={`p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition ${
                    newAjuste.tipo === 'credito' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  + Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setNewAjuste({ ...newAjuste, tipo: 'debito' })}
                  className={`p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider border-2 transition ${
                    newAjuste.tipo === 'debito' 
                      ? 'bg-red-600 text-white border-red-600 shadow-md' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  - Débito
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Descrição / Motivo do Ajuste *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bonificação excepcional ref MU 00049281..."
                  value={newAjuste.descricao}
                  onChange={(e) => setNewAjuste({ ...newAjuste, descricao: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Dica: Se citar o MU na descrição, o sistema vinculará automaticamente ao pedido.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newAjuste.valor || ''}
                    onChange={(e) => setNewAjuste({ ...newAjuste, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Pedido MU (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 00049281"
                    value={newAjuste.pedidoMU || ''}
                    onChange={(e) => setNewAjuste({ ...newAjuste, pedidoMU: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm"
                >
                  Gravar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
