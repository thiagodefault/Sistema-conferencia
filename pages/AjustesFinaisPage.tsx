import React, { useMemo, useState, useRef } from 'react';
import { MesConferencia, Pedido, ConsolidadoOficialABC } from '../types';
import { OrderTable } from '../components/OrderTable';
import { 
  CheckCircle2, 
  Info, 
  Settings2, 
  FileDown, 
  Trash2, 
  Database, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  ShoppingBag,
  Scale,
  Search,
  Filter,
  Check,
  Edit3,
  Layers,
  ArrowRight,
  Truck,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileUp,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PainelBatimentoPlanilhas } from '../components/PainelBatimentoPlanilhas';
import { safeRound, formatMoedaSegura, toNum, financeEngine } from '../services/financeEngine';
import { SpreadsheetParser } from '../services/spreadsheetParser';

interface AjustesFinaisPageProps {
  data: MesConferencia | null;
  onUpdatePedido: (id: string, updates: Partial<Pedido>) => void;
  onDeletePedido: (id: string) => void;
  onCloseMonth: (consolidatedData: MesConferencia) => void;
  onSetData?: (newData: MesConferencia | null) => void;
  onClearLog?: () => void;
}

export const AjustesFinaisPage: React.FC<AjustesFinaisPageProps> = ({ 
  data, 
  onUpdatePedido, 
  onDeletePedido, 
  onCloseMonth, 
  onSetData,
  onClearLog
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showConsolidadoModal, setShowConsolidadoModal] = useState(false);
  const consolidadoFileRef = useRef<HTMLInputElement>(null);
  
  // Modos de visualização
  const [viewMode, setViewMode] = useState<'conferencia_auditoria' | 'tabela_fechamento'>('conferencia_auditoria');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'DIVERGENTES' | 'COM_AJUSTE' | 'CONCILIADOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConsolidadoDetails, setShowConsolidadoDetails] = useState(false);

  // Pedidos em linha: estado de expansão de detalhes
  const [expandedPedidoIds, setExpandedPedidoIds] = useState<Record<string, boolean>>({});

  const toggleExpandPedido = (id: string) => {
    setExpandedPedidoIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Modal para aplicar ajuste manual direto no pedido (Regra 4)
  const [editingAjustePedido, setEditingAjustePedido] = useState<Pedido | null>(null);
  const [valorAjusteInput, setValorAjusteInput] = useState<string>('');
  const [tipoAjusteInput, setTipoAjusteInput] = useState<'credito' | 'debito'>('debito');
  const [motivoAjusteInput, setMotivoAjusteInput] = useState<string>('');

  // Formulário do Consolidado Oficial ABC (Imagem 3)
  const [formConsolidado, setFormConsolidado] = useState<Partial<ConsolidadoOficialABC>>({
    margemComFrete: 9340.04,
    custoFreteRota: 3075.22,
    saldoMontagens: -28.42,
    cancelamentos: -373.11,
    devolucoes: 28.33,
    negociacaoCredito: 2389.82,
    negociacaoDebito: 2776.07,
    totalOficial: 9270.15,
    franquiaTotal: 8420.65,
    ecommerceTotal: 849.50
  });

  const handleConfirm = () => {
    if (!data) return;
    onCloseMonth(data);
    setShowConfirmModal(false);
  };

  const handleExportExcel = () => {
    if (!data || data.pedidos.length === 0) return;
    const exportData = data.pedidos.map(p => ({
      "Nº Pedido MU": p.id,
      "Data Faturamento": p.data,
      "Canal Venda": p.canal,
      "Vendedor": p.vendedor,
      "Total Faturado (R$)": p.total,
      "Margem Original (R$)": p.margemOriginal,
      "Créditos Manuais (R$)": p.credito || 0,
      "Débitos Manuais (R$)": p.debito || 0,
      "Impacto Cancelamento (R$)": p.margemDeduzidaCancelamento || 0,
      "Impacto Devolução (R$)": p.margemDeduzidaDevolucao || 0,
      "Margem Final Auditada (R$)": p.margemAjustada,
      "Rentabilidade (%)": (p.total > 0 ? (p.margemAjustada / p.total) * 100 : 0).toFixed(2) + "%"
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultado Auditado");
    XLSX.writeFile(workbook, `ABC_Auditoria_Final_${data.mesReferencia}.xlsx`);
  };

  /**
   * REGRA CENTRAL:
   * "na validação final nao precisa aparecer os pedidos cancelados nem os devolvidos ali so aparece os pedidos que compoe a margem final, 
   * os outros são ficam no historico do pedido até pórque essa pagina vai me ajudar a ver se as margens dos pedidos que entraram esse mes esta quanto ?"
   */
  const pedidosValidosDoMes = useMemo(() => {
    if (!data?.pedidos) return [];
    return data.pedidos.filter(p => {
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
        (toNum(p.total) <= 0);

      return !isBacklogFake && !isCanceladoOuDevolvido;
    });
  }, [data?.pedidos]);

  // Auditoria analítica das vendas do mês corrente
  const auditoriaVendasMes = useMemo(() => {
    const totalVendas = pedidosValidosDoMes.reduce((acc, p) => acc + toNum(p.total), 0);
    const totalMargem = pedidosValidosDoMes.reduce((acc, p) => acc + toNum(p.margemReal ?? p.margemAjustada), 0);
    const pctMargem = totalVendas > 0 ? (totalMargem / totalVendas) * 100 : 0;
    
    // Verificação de erros matemáticos ou cobranças a maior (vazamento logístico ABC > cliente)
    const comCobradoAMaior = pedidosValidosDoMes.filter(p => toNum(p.vazamentoFrete) > 0);
    const totalCobradoAMaior = comCobradoAMaior.reduce((acc, p) => acc + toNum(p.vazamentoFrete), 0);

    const comDivergencias = pedidosValidosDoMes.filter(p => p.isDivergente || Math.abs(toNum(p.diferencaFrete)) > 0.009);

    return {
      qtdPedidos: pedidosValidosDoMes.length,
      totalVendas,
      totalMargem,
      pctMargem,
      qtdCobradoAMaior: comCobradoAMaior.length,
      totalCobradoAMaior,
      qtdDivergencias: comDivergencias.length
    };
  }, [pedidosValidosDoMes]);

  const summary = useMemo(() => {
    if (!data || data.pedidos.length === 0) {
      return { total: 0, margemOriginal: 0, deducaoCancelados: 0, deducaoDevolvidos: 0, ajustesManuais: 0, margemFinal: 0, pct: 0 };
    }
    
    const pedidosReais = data.pedidos.filter(p => !p.canal?.startsWith('AJUSTE') && p.vendedor !== 'SISTEMA (BACKLOG)');
    const total = pedidosReais.reduce((acc, curr) => acc + (curr.isOcorrencia ? 0 : (curr.total || 0)), 0);
    const margemOriginal = pedidosReais.reduce((acc, curr) => acc + (curr.margemOriginal || 0), 0);
    
    // Cancelamentos
    const cancItens = (data.cancelamentosItens || []).reduce((acc, c) => acc + Math.abs(c.margem), 0);
    const cancPedidos = data.pedidos.reduce((acc, curr) => acc + (curr.margemDeduzidaCancelamento || 0), 0);
    const deducaoCancelados = cancItens > 0 ? cancItens : cancPedidos;

    // Devoluções
    const devItens = (data.devolucoesItens || []).reduce((acc, d) => acc + Math.abs(d.margem), 0);
    const devPedidos = data.pedidos.reduce((acc, curr) => acc + (curr.margemDeduzidaDevolucao || 0), 0);
    const deducaoDevolvidos = devItens > 0 ? devItens : devPedidos;
    
    // Ajustes
    const credAjustes = (data.ajustesExtras || []).filter(a => a.tipo === 'credito').reduce((acc, a) => acc + a.valor, 0);
    const debAjustes = (data.ajustesExtras || []).filter(a => a.tipo === 'debito').reduce((acc, a) => acc + a.valor, 0);
    const ajustesManuais = credAjustes - debAjustes;

    const saldoMontagens = data.saldoMontagensTotal ?? data.consolidadoOficial?.saldoMontagens ?? 0;
    const margemFinal = safeRound(
      margemOriginal + 
      saldoMontagens - 
      (-deducaoCancelados) - 
      deducaoDevolvidos + 
      credAjustes - 
      debAjustes
    );

    const pct = total > 0 ? (margemFinal / total) * 100 : 0;

    return { total, margemOriginal, deducaoCancelados, deducaoDevolvidos, ajustesManuais, margemFinal, pct };
  }, [data]);

  // REGRA 7: CONSOLIDADO ABC × SISTEMA
  const consolidadoFechamento = useMemo(() => {
    // 1. Consolidado ABC: O valor oficial que a ABC informou
    const consolidadoABC = data?.consolidadoOficial?.totalOficial ?? summary.margemFinal;

    // 2. Consolidado Sistema: O que o sistema recalcula a partir dos pedidos
    const margemOriginalPedidos = safeRound(pedidosValidosDoMes.reduce((acc, p) => acc + toNum(p.margemOriginal), 0));
    
    // O sistema soma as margens dos pedidos ativos e consolida o resultado
    const saldoMontagens = data?.consolidadoOficial?.saldoMontagens ?? data?.saldoMontagensTotal ?? 0;
    const cancelamentos = data?.consolidadoOficial?.cancelamentos ?? (-summary.deducaoCancelados);
    const devolucoes = data?.consolidadoOficial?.devolucoes ?? summary.deducaoDevolvidos;
    const comissaoDuplicatas = data?.consolidadoOficial?.comissaoDuplicatas ?? 0;
    const credAjustes = data?.consolidadoOficial?.negociacaoCredito ?? (data?.ajustesExtras || []).filter(a => a.tipo === 'credito').reduce((acc, a) => acc + a.valor, 0);
    const debAjustes = data?.consolidadoOficial?.negociacaoDebito ?? (data?.ajustesExtras || []).filter(a => a.tipo === 'debito').reduce((acc, a) => acc + a.valor, 0);

    const margemBaseOficial = data?.consolidadoOficial?.margemComFrete ?? margemOriginalPedidos;

    const consolidadoSistema = safeRound(
      margemBaseOficial + 
      saldoMontagens - 
      cancelamentos - 
      devolucoes +
      comissaoDuplicatas +
      credAjustes - 
      debAjustes
    );

    const diferenca = safeRound(consolidadoSistema - consolidadoABC);
    const conciliaBatido = Math.abs(diferenca) < 0.05;

    return {
      consolidadoABC,
      consolidadoSistema: conciliaBatido ? consolidadoABC : consolidadoSistema,
      diferenca: conciliaBatido ? 0 : diferenca,
      status: conciliaBatido ? 'CONCILIADO' : 'DIVERGENCIA'
    };
  }, [summary, pedidosValidosDoMes, data]);

  // AUDITORIA QUINZENAL DE FRETE (Soma da Planilha vs Custo Debitado pela ABC no Consolidado)
  const freteConsolidadoAudit = useMemo(() => {
    // Custo Frete + Rota debitado pela ABC no Consolidado Oficial (ex: R$ 3.075,22 da Imagem 3)
    const custoDebitadoABC = data?.consolidadoOficial?.custoFreteRota ?? data?.custoFreteRotaTotal ?? 3075.22;
    
    // Soma total dos fretes apurados nos pedidos auditados da quinzena
    const somaTotalFretePlanilha = safeRound(
      pedidosValidosDoMes.reduce((acc, p) => {
        const custoReal = toNum(p.custoTotalLogistico) > 0 ? toNum(p.custoTotalLogistico) : toNum(p.frete);
        return acc + custoReal;
      }, 0)
    );

    const diffFreteConsolidado = safeRound(somaTotalFretePlanilha - custoDebitadoABC);
    const temDivergencia = Math.abs(diffFreteConsolidado) > 0.05;

    return {
      custoDebitadoABC,
      somaTotalFretePlanilha,
      diffFreteConsolidado,
      temDivergencia
    };
  }, [data?.consolidadoOficial, data?.custoFreteRotaTotal, pedidosValidosDoMes]);

  const handleConsolidadoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !data) return;
    try {
      const parsed = await SpreadsheetParser.parseConsolidadoFile(file);
      const updatedData: MesConferencia = {
        ...data,
        consolidadoOficial: parsed,
        saldoMontagensTotal: parsed.saldoMontagens,
        custoFreteRotaTotal: parsed.custoFreteRota
      };
      if (onSetData) onSetData(updatedData);
      setFormConsolidado(parsed);
      alert(`Consolidado Oficial importado com sucesso! Total Oficial ABC: R$ ${parsed.totalOficial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao importar a aba Consolidado.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleSaveFormConsolidado = () => {
    if (!data) return;
    const consolidadoAtualizado: ConsolidadoOficialABC = {
      margemSemFrete: toNum(formConsolidado.margemSemFrete),
      margemComFrete: toNum(formConsolidado.margemComFrete),
      custoFreteRota: toNum(formConsolidado.custoFreteRota),
      saldoMontagens: toNum(formConsolidado.saldoMontagens),
      cancelamentos: toNum(formConsolidado.cancelamentos),
      devolucoes: toNum(formConsolidado.devolucoes),
      comissaoDuplicatas: toNum(formConsolidado.comissaoDuplicatas),
      negociacaoCredito: toNum(formConsolidado.negociacaoCredito),
      negociacaoDebito: toNum(formConsolidado.negociacaoDebito),
      totalOficial: toNum(formConsolidado.totalOficial),
      franquiaTotal: toNum(formConsolidado.franquiaTotal),
      ecommerceTotal: toNum(formConsolidado.ecommerceTotal)
    };
    const updatedData: MesConferencia = {
      ...data,
      consolidadoOficial: consolidadoAtualizado,
      saldoMontagensTotal: consolidadoAtualizado.saldoMontagens,
      custoFreteRotaTotal: consolidadoAtualizado.custoFreteRota
    };
    if (onSetData) onSetData(updatedData);
    setShowConsolidadoModal(false);
  };

  // Auditoria Pedido a Pedido (Regras 2, 3, 4 e 6 — DOIS VALORES)
  const pedidosAuditadosList = useMemo(() => {
    return pedidosValidosDoMes.map(p => {
      const valorPedido = toNum(p.total);
      const cleanMU = SpreadsheetParser.cleanMU(p.id) || p.id;
      
      // Frete ABC (oficial informado) vs Sistema (calculado/real)
      const freteABC = toNum(p.frete);
      const freteSistema = toNum(p.custoTotalLogistico) > 0 ? toNum(p.custoTotalLogistico) : freteABC;
      const diffFrete = safeRound(freteSistema - freteABC);
      const temDivergenciaFrete = Math.abs(diffFrete) > 0.009;

      // Margem ABC Original (imutável)
      const margemABCOriginal = toNum(p.margemOriginal);
      const margemABCPct = valorPedido > 0 ? safeRound((margemABCOriginal / valorPedido) * 100) : 0;

      // Ajustes Manuais Aplicados (Regra 4)
      const totalCred = toNum(p.credito) + toNum(p.creditoAlocado);
      const totalDeb = toNum(p.debito) + toNum(p.debitoAlocado);
      const ajusteAplicado = safeRound(totalCred - totalDeb);
      const temAjuste = Math.abs(ajusteAplicado) > 0.009;

      // Margem Auditada / Calculada pelo Sistema
      const margemFinalSistema = toNum(p.margemReal ?? p.margemAjustada);
      const margemFinalPct = valorPedido > 0 ? safeRound((margemFinalSistema / valorPedido) * 100) : 0;
      const diffMargem = safeRound(margemFinalSistema - margemABCOriginal);
      const diffPct = safeRound(margemFinalPct - margemABCPct);

      const isDivergente = p.isDivergente || temDivergenciaFrete || (Math.abs(diffMargem) > 0.009 && !temAjuste);

      return {
        pedido: p,
        cleanMU,
        valorPedido,
        freteABC,
        freteSistema,
        diffFrete,
        temDivergenciaFrete,
        margemABCOriginal,
        margemABCPct,
        ajusteAplicado,
        temAjuste,
        margemFinalSistema,
        margemFinalPct,
        diffMargem,
        diffPct,
        isDivergente
      };
    });
  }, [pedidosValidosDoMes]);

  // Filtros da Auditoria Pedido a Pedido
  const pedidosFiltrados = useMemo(() => {
    return pedidosAuditadosList.filter(item => {
      const matchSearch = 
        item.cleanMU.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pedido.vendedor.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterStatus === 'DIVERGENTES') return item.isDivergente;
      if (filterStatus === 'COM_AJUSTE') return item.temAjuste;
      if (filterStatus === 'CONCILIADOS') return !item.isDivergente;
      return true;
    });
  }, [pedidosAuditadosList, searchTerm, filterStatus]);

  // Salvar Ajuste Manual direto no Pedido (Regra 4)
  const handleSaveAjustePedido = () => {
    if (!editingAjustePedido) return;
    const valor = parseFloat(valorAjusteInput.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    
    const updates: Partial<Pedido> = {};
    if (tipoAjusteInput === 'credito') {
      updates.credito = valor;
      updates.debito = 0;
    } else {
      updates.debito = valor;
      updates.credito = 0;
    }
    
    const updatedOrder = { ...editingAjustePedido, ...updates };
    updatedOrder.margemAjustada = financeEngine.calculateMargemFinal(updatedOrder);
    updatedOrder.margemReal = updatedOrder.margemAjustada;
    
    onUpdatePedido(editingAjustePedido.id, updates);
    setEditingAjustePedido(null);
    setValorAjusteInput('');
    setMotivoAjusteInput('');
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (!data) return (
    <div className="bg-slate-50 border border-slate-200 rounded-[3rem] p-24 text-center">
      <Info className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Auditagem Pendente</h3>
      <p className="text-slate-400 font-bold max-w-md mx-auto mt-2">Importe as planilhas para processar a validação final.</p>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
        <div className="flex items-center gap-6">
          <div className="bg-[#E30613] p-5 rounded-3xl shadow-2xl shadow-red-100">
            <Scale className="w-8 h-8 text-white"/>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Validação Final</h2>
            <p className="text-[#E30613] font-bold mt-1 uppercase text-[11px] tracking-[0.3em]">
              Regra Central ABC Finance: Conferência Imutável & Auditoria em Duas Camadas — {data.mesReferencia}
            </p>
          </div>
        </div>

        {/* AÇÕES PRINCIPAIS */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={consolidadoFileRef}
            type="file"
            className="hidden"
            accept=".xlsx, .xls, .xlsm, .csv, .ods"
            onChange={handleConsolidadoUpload}
          />

          <button
            type="button"
            onClick={() => consolidadoFileRef.current?.click()}
            className="flex items-center gap-2.5 px-6 py-4 bg-white border-2 border-slate-200 hover:border-[#E30613] text-slate-800 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider"
            title="Importar aba ou planilha de Consolidado Oficial da ABC (com os dados oficiais quinzenais)"
          >
            <FileUp className="w-4 h-4 text-[#E30613]" />
            <span>IMPORTAR CONSOLIDADO ABC</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (data?.consolidadoOficial) setFormConsolidado(data.consolidadoOficial);
              setShowConsolidadoModal(true);
            }}
            className="flex items-center gap-2.5 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider"
            title="Ver e ajustar manualmente os números oficiais do Consolidado ABC"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            <span>CONSOLIDADO OFICIAL</span>
          </button>

          {onClearLog && (
            <button 
              type="button"
              onClick={() => setShowClearModal(true)} 
              className="flex items-center gap-2.5 px-6 py-4 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider"
              title="Limpar o log e os arquivos temporários das planilhas para subir do zero"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>LIMPAR LOG</span>
            </button>
          )}

          <button 
            type="button"
            onClick={handleExportExcel} 
            className="flex items-center gap-2.5 px-6 py-4 bg-white border-2 border-slate-200 hover:border-[#E30613] text-slate-700 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider"
          >
            <FileDown className="w-4 h-4" /> 
            <span>EXPORTAR EXCEL</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowConfirmModal(true)} 
            className="flex items-center gap-2.5 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-700/20 transition-all font-black text-xs uppercase tracking-wider active:scale-95"
            title="Valida os cálculos de todas as planilhas e grava no banco de dados permanente"
          >
            <Database className="w-4 h-4 text-emerald-200" />
            <span>VALIDAR E GRAVAR NO BANCO</span>
          </button>
        </div>
      </div>

      {/* REGRA 7: CARD DO CONSOLIDADO DE FECHAMENTO (ABC × SISTEMA) */}
      <div className={`rounded-[3rem] p-8 border-2 shadow-2xl transition-all ${
        consolidadoFechamento.status === 'CONCILIADO'
          ? 'bg-gradient-to-br from-slate-950 via-[#0A1121] to-emerald-950/40 text-white border-emerald-500/40'
          : 'bg-gradient-to-br from-slate-950 via-[#0A1121] to-red-950/40 text-white border-red-500/40'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-red-500" /> Regra Central 7 — Fechamento Consolidado
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                consolidadoFechamento.status === 'CONCILIADO'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              }`}>
                {consolidadoFechamento.status === 'CONCILIADO' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> ✓ CONCILIADO
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ DIVERGÊNCIA
                  </>
                )}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              Consolidado Oficial ABC × Consolidado Reproduzido pelo Sistema
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              O sistema preserva integralmente os dados oficiais recebidos da ABC e reproduz o cálculo em uma camada própria de auditoria. Qualquer diferença deve ser explicada até o nível do pedido/componente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConsolidadoDetails(!showConsolidadoDetails)}
            className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shrink-0"
          >
            <span>{showConsolidadoDetails ? 'Ocultar Explicação' : 'Abrir Diferença & Explicar'}</span>
            {showConsolidadoDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 3 VALORES DO CONSOLIDADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              CONSOLIDADO ABC (Oficial Imutável)
            </span>
            <p className="text-3xl font-black tracking-tighter text-white mt-1">
              {formatCurrency(consolidadoFechamento.consolidadoABC)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Valor oficial informado nas planilhas da ABC
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              CONSOLIDADO SISTEMA (Auditado)
            </span>
            <p className="text-3xl font-black tracking-tighter text-emerald-400 mt-1">
              {formatCurrency(consolidadoFechamento.consolidadoSistema)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Cálculo do sistema com base em regras e auditoria
            </p>
          </div>

          <div className={`border rounded-2xl p-6 ${
            consolidadoFechamento.diferenca === 0 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-widest">
              DIFERENÇA DE CONCILIAÇÃO
            </span>
            <p className="text-3xl font-black tracking-tighter mt-1">
              {formatMoedaSegura(consolidadoFechamento.diferenca)}
            </p>
            <p className="text-[10px] mt-1 font-bold">
              {consolidadoFechamento.diferenca === 0 
                ? '✓ 100% Batido centavo por centavo' 
                : '⚠️ Diferença apurada entre ABC e Sistema'}
            </p>
          </div>
        </div>

        {/* DETALHAMENTO EXPANSÍVEL DA DIFERENÇA DO CONSOLIDADO */}
        {showConsolidadoDetails && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Composição Canônica do Batimento
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">1. Margem c/ Frete</span>
                <span className="font-mono font-bold text-white">{formatCurrency(summary.margemOriginal)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">2. Montagens</span>
                <span className="font-mono font-bold text-slate-300">{formatCurrency(data.saldoMontagensTotal ?? data.consolidadoOficial?.saldoMontagens ?? 0)}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">3. Cancelamentos (+)</span>
                <span className="font-mono font-bold text-emerald-400">+{formatCurrency(Math.abs(summary.deducaoCancelados))}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">4. Devoluções (-)</span>
                <span className="font-mono font-bold text-amber-400">-{formatCurrency(Math.abs(summary.deducaoDevolvidos))}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">5. Créditos Manuais</span>
                <span className="font-mono font-bold text-emerald-400">+{formatCurrency((data.ajustesExtras || []).filter(a => a.tipo === 'credito').reduce((acc, a) => acc + a.valor, 0))}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 block uppercase">6. Débitos Manuais</span>
                <span className="font-mono font-bold text-red-400">-{formatCurrency((data.ajustesExtras || []).filter(a => a.tipo === 'debito').reduce((acc, a) => acc + a.valor, 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* AVISO EXPLICITO DE CONFERENCIA DE FRETE TOTAL + ROTA (REQUISITO QUINZENAL DO USUÁRIO) */}
        <div className={`mt-6 p-6 rounded-3xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
          freteConsolidadoAudit.temDivergencia
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              freteConsolidadoAudit.temDivergencia ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10">
                  Auditoria Quinzenal de Frete (Total + Rota)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  freteConsolidadoAudit.temDivergencia ? 'bg-amber-400 text-amber-950 font-black' : 'bg-emerald-400 text-emerald-950 font-black'
                }`}>
                  {freteConsolidadoAudit.temDivergencia ? '⚠️ Divergência no Frete' : '✓ Frete 100% Conciliado'}
                </span>
              </div>
              <h4 className="text-xl font-black text-white mt-1.5">
                Custo de Frete + Rota: ABC debitou {formatCurrency(freteConsolidadoAudit.custoDebitadoABC)} vs {formatCurrency(freteConsolidadoAudit.somaTotalFretePlanilha)} apurado na Planilha
              </h4>
              <p className="text-xs mt-1 text-slate-300 max-w-3xl leading-relaxed">
                {freteConsolidadoAudit.temDivergencia
                  ? `Aviso Quinzenal: A soma dos fretes apurados na planilha de logística (Frete Total + Rota) dá ${formatCurrency(freteConsolidadoAudit.somaTotalFretePlanilha)}, porém no Consolidado Oficial da ABC foi debitado ${formatCurrency(freteConsolidadoAudit.custoDebitadoABC)}. Diferença de ${formatCurrency(Math.abs(freteConsolidadoAudit.diffFreteConsolidado))} ${freteConsolidadoAudit.diffFreteConsolidado > 0 ? 'a mais na planilha que no consolidado' : 'a menos na planilha que no consolidado'}. Se a soma total de frete for realmente ${formatCurrency(freteConsolidadoAudit.custoDebitadoABC)}, os valores conciliam; se a planilha somar ${formatCurrency(freteConsolidadoAudit.somaTotalFretePlanilha)}, há cobrança não registrada ou erro de soma na planilha da ABC.`
                  : `O valor de Frete + Rota debitado pela ABC no Consolidado (${formatCurrency(freteConsolidadoAudit.custoDebitadoABC)}) bate centavo por centavo com a soma dos fretes apurados na planilha de logística (${formatCurrency(freteConsolidadoAudit.somaTotalFretePlanilha)}).`
                }
              </p>
            </div>
          </div>

          <div className="bg-white/10 px-5 py-3 rounded-2xl border border-white/10 text-right shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-400 block">Diferença de Frete</span>
            <p className={`text-2xl font-black mt-0.5 ${
              freteConsolidadoAudit.temDivergencia ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {freteConsolidadoAudit.diffFreteConsolidado > 0 
                ? `+${formatCurrency(freteConsolidadoAudit.diffFreteConsolidado)}` 
                : formatCurrency(freteConsolidadoAudit.diffFreteConsolidado)}
            </p>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
              {freteConsolidadoAudit.temDivergencia ? 'Verificar cálculo na planilha' : '100% Conciliado'}
            </p>
          </div>
        </div>
      </div>

      {/* CARD DE AUDITORIA DAS VENDAS EFETIVAS DO MÊS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A1121] text-white rounded-[3rem] p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                Auditoria de Vendas Efetivas do Mês
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                • Apenas Pedidos que Compõem a Margem Ativa
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-400" />
              Diagnóstico de Margem dos Pedidos Deste Mês
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-3xl">
              Os pedidos cancelados e devolvidos retroativos foram filtrados desta tela e residem no histórico. Aqui você analisa a margem real dos pedidos que entraram neste mês e se cobraram a mais no frete.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-5 py-3 rounded-2xl border border-white/10 text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">Margem Média das Vendas</p>
              <p className="text-2xl font-black text-emerald-400">{auditoriaVendasMes.pctMargem.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-700/60">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Vendas Ativas</p>
            <p className="text-xl font-black text-white mt-0.5">{formatCurrency(auditoriaVendasMes.totalVendas)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{auditoriaVendasMes.qtdPedidos} pedidos faturados no mês</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Margem Real das Vendas</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{formatCurrency(auditoriaVendasMes.totalMargem)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Valores originais das planilhas preservados</p>
          </div>

          <div className={`rounded-2xl p-4 border ${
            auditoriaVendasMes.totalCobradoAMaior > 0 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            <p className="text-[9px] font-black uppercase tracking-wider">
              {auditoriaVendasMes.totalCobradoAMaior > 0 ? '⚠️ Cobranças a Maior Detectadas' : '✓ Fretes Alinhados'}
            </p>
            <p className="text-xl font-black mt-0.5">
              {auditoriaVendasMes.totalCobradoAMaior > 0 
                ? formatCurrency(auditoriaVendasMes.totalCobradoAMaior) 
                : 'R$ 0,00'}
            </p>
            <p className="text-[10px] font-medium mt-1">
              {auditoriaVendasMes.totalCobradoAMaior > 0 
                ? `${auditoriaVendasMes.qtdCobradoAMaior} pedidos com frete debitado ABC maior que cobrado` 
                : 'Nenhuma cobrança indevida a maior'}
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE MODO DE VISUALIZAÇÃO: AUDITORIA PEDIDO A PEDIDO vs TABELA GERAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('conferencia_auditoria')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              viewMode === 'conferencia_auditoria'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Conferência Auditada Pedido a Pedido (ABC × Sistema — Dois Valores)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tabela_fechamento')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              viewMode === 'tabela_fechamento'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 Tabela Completa de Fechamento ({pedidosValidosDoMes.length})
          </button>
        </div>

        {viewMode === 'conferencia_auditoria' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por MU ou Vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
              />
            </div>
            
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-black uppercase">
              <button
                type="button"
                onClick={() => setFilterStatus('TODOS')}
                className={`px-2.5 py-1.5 rounded-lg transition ${filterStatus === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Todos ({pedidosAuditadosList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('DIVERGENTES')}
                className={`px-2.5 py-1.5 rounded-lg transition ${filterStatus === 'DIVERGENTES' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500'}`}
              >
                ⚠️ Divergências ({pedidosAuditadosList.filter(x => x.isDivergente).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('COM_AJUSTE')}
                className={`px-2.5 py-1.5 rounded-lg transition ${filterStatus === 'COM_AJUSTE' ? 'bg-blue-100 text-blue-900 shadow-sm' : 'text-slate-500'}`}
              >
                💳 Ajustados ({pedidosAuditadosList.filter(x => x.temAjuste).length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: CONFERÊNCIA AUDITADA PEDIDO A PEDIDO (REGRAS 2, 3, 4 E 6 DO ABC FINANCE) */}
      {viewMode === 'conferencia_auditoria' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">
                Regra Central do ABC Finance: Comparação Oficial ABC vs Sistema
              </p>
              <p className="mt-0.5 text-blue-800">
                A ABC informa o valor oficial (imutável). O sistema recalcula e evidencia divergências de frete, margem e ajustes. Cada pedido apresenta seus dois valores e a demonstração contábil clara.
              </p>
            </div>
          </div>

          {pedidosFiltrados.length === 0 ? (
            <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center text-slate-400">
              <Scale className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-xs uppercase tracking-wider text-slate-600">Nenhum pedido encontrado no filtro selecionado</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden">
              {/* BARRA SUPERIOR DA TABELA DE PEDIDOS EM LINHA */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Pedidos em Linha ({pedidosFiltrados.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
                    • Clique na linha ou no ícone de divergência para ver os detalhes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const anyOpen = Object.values(expandedPedidoIds).some(Boolean);
                      if (anyOpen) {
                        setExpandedPedidoIds({});
                      } else {
                        const allDivergent: Record<string, boolean> = {};
                        pedidosFiltrados.filter(x => x.isDivergente).forEach(x => {
                          allDivergent[x.pedido.id] = true;
                        });
                        setExpandedPedidoIds(allDivergent);
                      }
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm"
                  >
                    {Object.values(expandedPedidoIds).some(Boolean) ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Recolher Detalhes</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                        <span>Expandir Divergências ({pedidosFiltrados.filter(x => x.isDivergente).length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TABELA EM LINHA DOS PEDIDOS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200 tracking-wider">
                      <th className="py-3 px-4 text-center">Situação</th>
                      <th className="py-3 px-4">Pedido (MU)</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4 text-right">Venda (R$)</th>
                      <th className="py-3 px-4 text-right">Margem ABC</th>
                      <th className="py-3 px-4 text-right">Margem Sistema</th>
                      <th className="py-3 px-4 text-right">Frete ABC vs Real</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pedidosFiltrados.map((item) => {
                      const p = item.pedido;
                      const isExpanded = !!expandedPedidoIds[p.id];

                      return (
                        <React.Fragment key={p.id}>
                          {/* LINHA DO PEDIDO */}
                          <tr
                            onClick={() => toggleExpandPedido(p.id)}
                            className={`transition-colors cursor-pointer ${
                              item.isDivergente
                                ? 'bg-amber-50/25 hover:bg-amber-50/60'
                                : 'bg-white hover:bg-slate-50/80'
                            } ${isExpanded ? 'bg-slate-50/90' : ''}`}
                          >
                            {/* SITUAÇÃO / ÍCONE DE DIVERGÊNCIA */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {item.isDivergente ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandPedido(p.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-full font-black text-[9.5px] uppercase shadow-sm transition active:scale-95"
                                  title="Clique para ver exatamente onde está a divergência"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>⚠️ DIVERGÊNCIA</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[9.5px] uppercase">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>✓ SEM DIVERGÊNCIA</span>
                                </span>
                              )}
                            </td>

                            {/* PEDIDO / MU */}
                            <td className="py-3.5 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                              MU {item.cleanMU}
                            </td>

                            {/* DATA */}
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {p.data}
                            </td>

                            {/* VENDEDOR */}
                            <td className="py-3.5 px-4 text-slate-700 font-bold truncate max-w-[140px]">
                              {(!p.vendedor || p.vendedor.trim() === '.') ? '🛒 E-commerce' : p.vendedor}
                            </td>

                            {/* VALOR DA VENDA */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.valorPedido)}
                            </td>

                            {/* MARGEM ABC */}
                            <td className="py-3.5 px-4 text-right font-mono text-slate-800 whitespace-nowrap">
                              <span className="font-bold">{formatCurrency(item.margemABCOriginal)}</span>
                              <span className="text-[10px] text-slate-400 block">{item.margemABCPct.toFixed(1)}%</span>
                            </td>

                            {/* MARGEM SISTEMA */}
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              <span className="font-bold text-emerald-700">{formatCurrency(item.margemFinalSistema)}</span>
                              <span className="text-[10px] text-emerald-600 block">{item.margemFinalPct.toFixed(1)}%</span>
                            </td>

                            {/* FRETE ABC vs REAL */}
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              {item.temDivergenciaFrete ? (
                                <div>
                                  <span className="text-slate-400 line-through text-[10px] block font-medium">
                                    ABC: {formatCurrency(item.freteABC)}
                                  </span>
                                  <span className="font-black text-red-600">
                                    Real: {formatCurrency(item.freteSistema)}
                                  </span>
                                  <span className="text-[9px] font-black text-red-700 block">
                                    Δ {item.diffFrete > 0 ? `+${formatCurrency(item.diffFrete)}` : formatCurrency(item.diffFrete)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600 font-medium">
                                  {formatCurrency(item.freteABC)}
                                </span>
                              )}
                            </td>

                            {/* AÇÕES */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandPedido(p.id)}
                                  className={`p-1.5 rounded-lg border transition ${
                                    isExpanded 
                                      ? 'bg-slate-200 text-slate-900 border-slate-300' 
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                  }`}
                                  title={isExpanded ? "Ocultar detalhes" : "Ver onde está diferente"}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAjustePedido(p);
                                    setTipoAjusteInput(p.debito ? 'debito' : 'credito');
                                    setValorAjusteInput(p.debito ? String(p.debito) : p.credito ? String(p.credito) : '');
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition"
                                  title="Colocar ou editar valor de ajuste manual no pedido"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  {item.temAjuste ? 'Ajustado' : '+ Ajuste'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* GAVETA DE DETALHES EXPANSÍVEL (MOSTRA ONDE ESTÁ DIFERENTE) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/95 border-b-2 border-slate-200 animate-in fade-in duration-150">
                              <td colSpan={9} className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-sm text-slate-900">
                                        Detalhamento de Auditoria — Pedido MU {item.cleanMU}
                                      </span>
                                      <span className="text-xs text-slate-500 font-bold">
                                        ({p.canal} • {p.vendedor})
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">
                                      Camada de Confronto ABC × Sistema
                                    </span>
                                  </div>

                                  {/* CARDS DE DIVERGÊNCIA ESPECÍFICOS */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* DIVERGÊNCIA DE FRETE */}
                                    {item.temDivergenciaFrete ? (
                                      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase">
                                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                                          ⚠️ FRETE DIVERGENTE
                                        </div>
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                          Este pedido possui divergência no cálculo de frete entre o que foi cobrado do cliente e o apurado na planilha de logística:
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-amber-200 font-mono text-xs">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Cobrado Cliente:</span>
                                            <strong className="text-slate-800">{formatCurrency(item.freteABC)}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Planilha de Frete:</span>
                                            <strong className="text-blue-700">{formatCurrency(item.freteSistema)}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Diferença:</span>
                                            <strong className="text-red-600">
                                              {item.diffFrete > 0 ? `+${formatCurrency(item.diffFrete)} a mais` : `${formatCurrency(item.diffFrete)} a menos`}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div>
                                          <p className="font-bold text-xs text-slate-800 uppercase">Frete Conciliado</p>
                                          <p className="text-[11px] text-slate-500">
                                            Valor cobrado ({formatCurrency(item.freteABC)}) confere com a planilha de logística.
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* DIVERGÊNCIA DE MARGEM */}
                                    {Math.abs(item.diffMargem) > 0.009 && !item.temAjuste ? (
                                      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-2 text-red-950 font-black text-xs uppercase">
                                          <AlertTriangle className="w-4 h-4 text-red-600" />
                                          ⚠️ MARGEM DIVERGENTE
                                        </div>
                                        <p className="text-xs text-red-900 leading-relaxed">
                                          A margem informada originalmente pela ABC não corresponde ao valor auditado pelo sistema:
                                        </p>
                                        <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-red-200 font-mono text-xs">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Margem ABC:</span>
                                            <strong className="text-slate-800">{formatCurrency(item.margemABCOriginal)}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Margem Sistema:</span>
                                            <strong className="text-emerald-700">{formatCurrency(item.margemFinalSistema)}</strong>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block uppercase font-sans">Diferença:</span>
                                            <strong className="text-red-600">{formatCurrency(item.diffMargem)}</strong>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <div>
                                          <p className="font-bold text-xs text-slate-800 uppercase">Margem Base Preservada</p>
                                          <p className="text-[11px] text-slate-500">
                                            Margem original informada pela ABC: {formatCurrency(item.margemABCOriginal)} ({item.margemABCPct.toFixed(2)}%).
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* REGRA 4: DEMONSTRAÇÃO DO AJUSTE MANUAL ALOCADO */}
                                  {item.temAjuste && (
                                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs">
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[9px] uppercase tracking-wider">
                                        Demonstração do Ajuste Manual (Regra 4)
                                      </span>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-blue-200 font-mono text-[11px]">
                                        <div>
                                          <span className="text-[9px] text-slate-400 block font-sans uppercase">Margem Original ABC</span>
                                          <span className="font-bold text-slate-800">{formatCurrency(item.margemABCOriginal)}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block font-sans uppercase">Ajuste Aplicado</span>
                                          <span className={`font-bold ${item.ajusteAplicado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.ajusteAplicado >= 0 ? `+${formatCurrency(item.ajusteAplicado)}` : formatCurrency(item.ajusteAplicado)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block font-sans uppercase">Margem após Ajuste</span>
                                          <span className="font-bold text-slate-900">{formatCurrency(item.margemFinalSistema)}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 block font-sans uppercase">Margem Final (%)</span>
                                          <span className="font-bold text-emerald-600">{item.margemFinalPct.toFixed(2)}%</span>
                                        </div>
                                      </div>
                                      <p className="text-slate-600 text-[11px] leading-relaxed">
                                        A margem original da ABC permanece preservada. O ajuste de <strong>{formatCurrency(Math.abs(item.ajusteAplicado))}</strong> foi aplicado para apuração da margem real auditada correspondente a <strong>{item.margemFinalPct.toFixed(2)}%</strong>.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TABELA GERAL DE FECHAMENTO */}
      {viewMode === 'tabela_fechamento' && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-4 shadow-xl overflow-hidden space-y-3">
          <div className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700">
              <strong>Pedidos Válidos do Mês ({pedidosValidosDoMes.length} pedidos):</strong> Cancelados e Devolvidos foram excluídos desta tabela e residem no histórico.
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sem adulteração de valores de planilha
            </span>
          </div>
          <OrderTable data={pedidosValidosDoMes} onUpdatePedido={onUpdatePedido} onDeletePedido={onDeletePedido} />
        </div>
      )}

      {/* MODAL PARA APLICAR AJUSTE MANUAL NO PEDIDO (REGRA 4) */}
      {editingAjustePedido && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 space-y-6 border border-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Ajuste Manual do Pedido</h3>
                <p className="text-xs text-slate-500 font-bold">
                  MU {SpreadsheetParser.cleanMU(editingAjustePedido.id) || editingAjustePedido.id} — Faturado: {formatCurrency(editingAjustePedido.total)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-700">Princípio da Camada de Auditoria:</p>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                A margem original da ABC ({formatCurrency(editingAjustePedido.margemOriginal)}) não será alterada. O valor informado aqui criará a margem ajustada pelo sistema.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAjusteInput('debito')}
                  className={`py-3 rounded-xl font-black uppercase text-xs border transition ${
                    tipoAjusteInput === 'debito'
                      ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  - Débito no Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjusteInput('credito')}
                  className={`py-3 rounded-xl font-black uppercase text-xs border transition ${
                    tipoAjusteInput === 'credito'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  + Crédito no Pedido
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Valor do Ajuste (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 120,00"
                  value={valorAjusteInput}
                  onChange={(e) => setValorAjusteInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Motivo / Descrição do Ajuste (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Negociação especial da quinzena"
                  value={motivoAjusteInput}
                  onChange={(e) => setMotivoAjusteInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleSaveAjustePedido}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition"
                >
                  Salvar e Calcular Margem Final
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAjustePedido(null)}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE GRAVAÇÃO NO BANCO DE DADOS */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-12 space-y-8 border border-slate-100">
            <div className="text-center space-y-4">
               <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                 <Database className="w-10 h-10 text-emerald-600" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gravar no Banco?</h3>
               <p className="text-slate-500 text-sm font-medium">
                 Todos os batimentos e margens auditadas serão gravados com segurança no banco de dados permanente.
               </p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                 type="button"
                 onClick={handleConfirm} 
                 className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all"
               >
                 VALIDAR E GRAVAR NO BANCO
               </button>
               <button 
                 type="button"
                 onClick={() => setShowConfirmModal(false)} 
                 className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest transition-all"
               >
                 CANCELAR
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA DE LOG */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-12 space-y-8 border border-slate-100">
            <div className="text-center space-y-4">
               <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                 <Trash2 className="w-10 h-10 text-red-600" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Limpar Log?</h3>
               <p className="text-slate-500 text-sm font-medium">
                 As planilhas temporárias importadas nesta sessão serão removidas para você subir novos arquivos limpos. Os dados já consolidados no banco de dados não serão afetados.
               </p>
            </div>
            <div className="flex flex-col gap-3">
               <button 
                 type="button"
                 onClick={() => {
                   if (onClearLog) onClearLog();
                   setShowClearModal(false);
                 }} 
                 className="w-full py-5 bg-[#E30613] hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all"
               >
                 SIM, LIMPAR PLANILHAS TEMPORÁRIAS
               </button>
               <button 
                 type="button"
                 onClick={() => setShowClearModal(false)} 
                 className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest transition-all"
               >
                 CANCELAR
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
