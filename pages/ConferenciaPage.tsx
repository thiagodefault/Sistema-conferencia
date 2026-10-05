import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Pedido, MesConferencia } from '../types';
import { OrderTable } from '../components/OrderTable';
import { 
  FileUp, 
  CheckCircle2, 
  DatabaseBackup, 
  Calendar, 
  AlertCircle, 
  FileSearch, 
  ShieldCheck, 
  RotateCcw, 
  Search, 
  Sparkles, 
  FileSpreadsheet, 
  PlusSquare, 
  ArrowRight,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react';
import { SpreadsheetParser } from '../services/spreadsheetParser';
import { financeEngine } from '../services/financeEngine';
import { PainelBatimentoPlanilhas } from '../components/PainelBatimentoPlanilhas';

interface ConferenciaPageProps {
  data: MesConferencia | null;
  onSetData: (newData: MesConferencia | null, multiMonthData?: Record<string, Pedido[]>) => void;
  onUpdatePedido: (id: string, updates: Partial<Pedido>) => void;
  onDeletePedido: (id: string) => void;
  onNavigateToAjustes: () => void;
  onNavigateToOcorrencias: () => void;
  config: any;
  onClearLog?: () => void;
}

export const ConferenciaPage: React.FC<ConferenciaPageProps> = ({ 
  data, 
  onSetData, 
  onUpdatePedido, 
  onDeletePedido,
  onNavigateToAjustes,
  onNavigateToOcorrencias,
  config,
  onClearLog
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(data?.mesReferencia || new Date().toISOString().slice(0, 7));

  const vendasInputRef = useRef<HTMLInputElement>(null);
  const ajustesInputRef = useRef<HTMLInputElement>(null);
  const apoioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data?.mesReferencia) {
      setSelectedMonth(data.mesReferencia);
    }
  }, [data?.mesReferencia]);

  // Importação de Vendas Base (Planilha Principal)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await SpreadsheetParser.parseVendasBase(file, config.autoIgnoreDuplicates);
      const firstMonth = result.primeiroMes;

      // Preserva os ajustes manuais já existentes na sessão
      const ajustesAtuais = data?.ajustesExtras || [];

      onSetData({
        mesReferencia: firstMonth,
        pedidos: result.pedidos,
        ajustesExtras: ajustesAtuais,
        consolidadoOficial: result.consolidadoOficial || data?.consolidadoOficial,
        saldoMontagensTotal: result.consolidadoOficial?.saldoMontagens ?? data?.saldoMontagensTotal,
        custoFreteRotaTotal: result.consolidadoOficial?.custoFreteRota ?? data?.custoFreteRotaTotal
      }, result.multiMonthData);

      setSelectedMonth(firstMonth);
      setSuccessMsg(`Sucesso! Planilha de Vendas Base "${file.name}" importada com ${result.pedidos.length} pedidos em ${result.resumo.mesesIdentificados.length} competência(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar a planilha de vendas.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  // Importação direta de Planilha de Ajustes Manuais
  const handleAjustesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const parsed = await SpreadsheetParser.parseAjustes(file);
      const mesRef = data?.mesReferencia || selectedMonth || new Date().toISOString().slice(0, 7);
      
      const currentPedidos = data?.pedidos ? [...data.pedidos] : [];
      const currentAjustes = data?.ajustesExtras ? [...data.ajustesExtras] : [];

      // Aplica vínculos em pedidos existentes se houver
      parsed.ajustes.forEach(ajuste => {
        if (ajuste.pedidoMU) {
          const normMU = String(ajuste.pedidoMU).trim().replace(/^0+/, '').toLowerCase();
          const pIdx = currentPedidos.findIndex(p => String(p.id).trim().replace(/^0+/, '').toLowerCase() === normMU || (p.idPedidoMestre && String(p.idPedidoMestre).trim().replace(/^0+/, '').toLowerCase() === normMU));
          if (pIdx !== -1) {
            if (ajuste.tipo === 'credito') {
              currentPedidos[pIdx].credito = (currentPedidos[pIdx].credito || 0) + ajuste.valor;
            } else {
              currentPedidos[pIdx].debito = (currentPedidos[pIdx].debito || 0) + ajuste.valor;
            }
            currentPedidos[pIdx].margemAjustada = financeEngine.calculateMargemFinal(currentPedidos[pIdx]);
            currentPedidos[pIdx].margemReal = currentPedidos[pIdx].margemAjustada;
          }
        }
      });

      const finalAjustes = [...currentAjustes, ...parsed.ajustes];

      onSetData({
        mesReferencia: mesRef,
        pedidos: currentPedidos,
        ajustesExtras: finalAjustes
      });

      setSuccessMsg(
        `Sucesso! ${parsed.ajustes.length} ajustes manuais da planilha "${file.name}" importados (+R$ ${parsed.resumo.totalCreditos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / -R$ ${parsed.resumo.totalDebitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar a planilha de ajustes manuais.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  // Importação de Apoio / Conferência de Valores
  const handleComparisonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !data) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const sheet = SpreadsheetParser.findBestSheet(workbook);
      const { headers, rows } = SpreadsheetParser.extractRowsWithSmartHeader(sheet);

      const keyMU = SpreadsheetParser.findColumnKey(headers, ["nº pedido mu", "pedido mu", "mu", "pedido", "nota"]);
      const keyTotal = SpreadsheetParser.findColumnKey(headers, ["total pedido (r$)", "total pedido", "valor total", "total"]);

      if (!keyMU || !keyTotal) {
        throw new Error("Não foi possível encontrar as colunas de MU e Valor Total na planilha de conferência de apoio.");
      }

      const updatedPedidos = [...data.pedidos];
      let discrepancies = 0;

      rows.forEach(r => {
        const mu = String(r[keyMU] || "").trim();
        if (!mu) return;
        const valorApoio = SpreadsheetParser.parseNumber(r[keyTotal]);

        const index = updatedPedidos.findIndex(p => p.id === mu);
        if (index !== -1) {
          const originalTotal = updatedPedidos[index].total;
          if (Math.abs(originalTotal - valorApoio) > 0.05) {
            updatedPedidos[index].isDivergente = true;
            updatedPedidos[index].valorApoio = valorApoio;
            discrepancies++;
          } else {
            updatedPedidos[index].isDivergente = false;
          }
        }
      });

      onSetData({ ...data, pedidos: updatedPedidos });
      setSuccessMsg(`Validação de apoio concluída: ${discrepancies} divergências encontradas.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cruzar planilhas.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const summary = useMemo(() => {
    if (!data || data.pedidos.length === 0) return { total: 0, margem: 0, pct: 0, divergentes: 0, ajustesCount: 0 };
    const total = data.pedidos.reduce((acc, curr) => acc + (curr.isOcorrencia ? 0 : curr.total), 0);
    const margem = data.pedidos.reduce((acc, curr) => acc + curr.margemAjustada, 0);
    const pct = total > 0 ? (margem / total) * 100 : 0;
    const divergentes = data.pedidos.filter(p => p.isDivergente).length;
    const ajustesCount = data.ajustesExtras?.length || 0;
    return { total, margem, pct, divergentes, ajustesCount };
  }, [data]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-12">
      {/* INPUTS OCULTOS DE ARQUIVO */}
      <input 
        ref={vendasInputRef} 
        type="file" 
        className="hidden" 
        accept=".xlsx, .xls, .xlsm, .csv, .ods" 
        onChange={handleFileUpload} 
      />
      <input 
        ref={ajustesInputRef} 
        type="file" 
        className="hidden" 
        accept=".xlsx, .xls, .xlsm, .csv, .ods" 
        onChange={handleAjustesUpload} 
      />
      <input 
        ref={apoioInputRef} 
        type="file" 
        className="hidden" 
        accept=".xlsx, .xls, .xlsm, .csv, .ods" 
        onChange={handleComparisonUpload} 
      />

      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex flex-col gap-2">
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Vendas Base</h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[#E30613] font-bold uppercase text-[11px] tracking-[0.3em]">Auditoria e Conciliação:</p>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm group">
               <Calendar className="w-4 h-4 text-[#E30613]" />
               <input 
                 type="month" 
                 value={selectedMonth} 
                 onChange={(e) => setSelectedMonth(e.target.value)} 
                 className="bg-transparent text-xs font-black uppercase text-slate-700 outline-none cursor-pointer" 
               />
            </div>
            {data?.ajustesExtras && data.ajustesExtras.length > 0 && (
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <PlusSquare className="w-3.5 h-3.5 text-amber-600" />
                {data.ajustesExtras.length} Ajustes Manuais Vinculados
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data && (
            <>
              {onClearLog && (
                <button 
                  type="button"
                  onClick={onClearLog} 
                  className="flex items-center gap-2 px-5 py-4 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider active:scale-95"
                  title="Limpar planilhas temporárias e log"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>LIMPAR LOG</span>
                </button>
              )}

              <button 
                onClick={onNavigateToOcorrencias} 
                className="flex items-center gap-2.5 px-6 py-4 bg-white border-2 border-slate-200 hover:border-[#E30613] text-slate-700 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-red-500" /> OCORRÊNCIAS
              </button>

              <button 
                onClick={() => apoioInputRef.current?.click()} 
                disabled={loading}
                className="flex items-center gap-2.5 px-6 py-4 bg-slate-50 border-2 border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl shadow-sm transition-all font-black text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
              >
                <FileSearch className="w-4 h-4 text-blue-600" />
                <span>2. CONFERIR (APOIO)</span>
              </button>

              <button 
                onClick={onNavigateToAjustes} 
                className="flex items-center gap-2.5 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-700/20 transition-all active:scale-95 font-black text-xs uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" /> VALIDAR MÊS
              </button>
            </>
          )}

          {/* BOTÃO IMPORTAR AJUSTES MANUAIS */}
          <button 
            onClick={() => ajustesInputRef.current?.click()} 
            disabled={loading}
            className="flex items-center gap-2.5 px-6 py-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 rounded-2xl shadow-sm active:scale-95 transition-all font-black text-xs uppercase tracking-wider disabled:opacity-50"
            title="Importar planilha com créditos e débitos de ajustes manuais"
          >
            <PlusSquare className="w-4 h-4 text-amber-600" />
            <span>+ PLANILHA DE AJUSTES</span>
          </button>

          {/* BOTÃO PRINCIPAL PLANILHA OFICIAL */}
          <button 
            onClick={() => vendasInputRef.current?.click()} 
            disabled={loading}
            className="flex items-center gap-2.5 px-8 py-4 bg-[#E30613] hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-700/20 active:scale-95 transition-all font-black text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            <span>1. PLANILHA OFICIAL</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE ERRO OU SUCESSO */}
      {error && (
        <div className="p-5 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-3.5 text-xs text-red-950 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black text-sm uppercase tracking-wide">Falha na Leitura da Planilha</p>
            <p className="mt-1 font-medium leading-relaxed">{error}</p>
            <p className="mt-2 text-[11px] text-red-800 font-medium">
              💡 <strong>Dica:</strong> Certifique-se de que a planilha possui as colunas necessárias (como <em>Nº Pedido MU</em>, <em>Total</em>, <em>Margem</em> ou <em>Descrição</em>, <em>Valor</em>). Suporta arquivos <strong>.xlsx, .xls, .xlsm, .csv</strong>.
            </p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 font-black text-sm p-1">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-200 rounded-3xl flex items-start gap-3.5 text-xs text-emerald-950 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold leading-relaxed">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700 font-black text-sm p-1">✕</button>
        </div>
      )}

      {/* CARDS DE RESUMO QUANDO HÁ DADOS */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-[#0A1121] rounded-[2.5rem] p-8 text-white shadow-2xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Faturamento Líquido</span>
            <p className="text-3xl font-black tracking-tighter">{formatCurrency(summary.total)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Margem R$ Auditada</span>
            <p className="text-3xl font-black tracking-tighter text-slate-900">{formatCurrency(summary.margem)}</p>
          </div>
          {summary.divergentes > 0 ? (
            <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-8 shadow-xl">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Divergências de Valor</span>
              <p className="text-3xl font-black tracking-tighter text-[#E30613]">{summary.divergentes}</p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 shadow-xl">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Integridade de Dados</span>
              <p className="text-3xl font-black tracking-tighter text-emerald-600 flex items-center gap-2">
                 <ShieldCheck className="w-8 h-8" /> 100% OK
              </p>
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center">
             <DatabaseBackup className="w-8 h-8 text-slate-300 mb-2" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros no Mês</p>
             <p className="text-lg font-black text-slate-600">{data.pedidos.length}</p>
             {data.ajustesExtras && data.ajustesExtras.length > 0 && (
               <p className="text-[10px] text-amber-700 font-bold mt-1">+{data.ajustesExtras.length} ajustes extras</p>
             )}
          </div>
        </div>
      )}
      
      {/* PAINEL DE UPLOAD DUPLO INTERATIVO QUANDO NÃO HÁ DADOS */}
      {!data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CARD 1: SUBIR PLANILHA OFICIAL DE VENDAS */}
            <div 
              onClick={() => vendasInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-red-300 hover:border-red-600 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50/20 transition-all duration-300 group shadow-lg shadow-slate-100"
            >
              <div className="w-20 h-20 rounded-3xl bg-red-100/70 text-red-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all">
                <FileUp className="w-10 h-10" />
              </div>
              <span className="px-3.5 py-1 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                1. Planilha Principal
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Subir Vendas Base Oficial</h3>
              <p className="text-slate-500 text-xs font-medium mt-2 max-w-sm leading-relaxed">
                Importe o arquivo do ERP com pedidos, MUs, faturamento e margens originais. Formatos: <strong>.xlsx, .xls, .xlsm, .csv</strong>.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-600 group-hover:gap-3 transition-all">
                <span>Clique para selecionar arquivo</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: SUBIR PLANILHA DE AJUSTES MANUAIS */}
            <div 
              onClick={() => ajustesInputRef.current?.click()}
              className="bg-white border-2 border-dashed border-amber-300 hover:border-amber-600 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-amber-50/20 transition-all duration-300 group shadow-lg shadow-slate-100"
            >
              <div className="w-20 h-20 rounded-3xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <PlusSquare className="w-10 h-10" />
              </div>
              <span className="px-3.5 py-1 bg-amber-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                2. Lançamentos & Créditos
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Subir Planilha de Ajustes</h3>
              <p className="text-slate-500 text-xs font-medium mt-2 max-w-sm leading-relaxed">
                Importe créditos (+) e débitos (-) manuais com descrição e valor. Aplica-se diretamente ao Consolidado Master.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 group-hover:gap-3 transition-all">
                  <span>Clique para selecionar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    SpreadsheetParser.downloadModeloAjustes();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition"
                  title="Baixar planilha modelo no formato Excel com as colunas corretas"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Modelo
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Parser Universal Ativo:</strong> Suporta pontuação brasileira (1.234,56), cabeçalhos em qualquer linha inicial e formatos variados de colunas.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <PainelBatimentoPlanilhas data={data} onSetData={onSetData} />
          <OrderTable data={data.pedidos} onUpdatePedido={onUpdatePedido} onDeletePedido={onDeletePedido} />
        </div>
      )}
    </div>
  );
};
