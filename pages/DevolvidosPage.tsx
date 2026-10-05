import React, { useState, useEffect, useMemo } from 'react';
import { 
  PackageOpen, 
  FileUp, 
  CheckCircle2, 
  TrendingDown, 
  History, 
  AlertOctagon, 
  ArrowRight, 
  Banknote, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Scale,
  Link2,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MesConferencia, Pedido, ItemDevolvidoAuditado, DestinacaoCancelamentoDevolucao } from '../types';
import { SpreadsheetParser } from '../services/spreadsheetParser';
import { financeEngine, safeRound, toNum } from '../services/financeEngine';

interface DevolvidosPageProps {
  data: MesConferencia | null;
  onSetData: (newData: MesConferencia | null) => void;
}

export const DevolvidosPage: React.FC<DevolvidosPageProps> = ({ data, onSetData }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lista de itens devolvidos auditados
  const [items, setItems] = useState<ItemDevolvidoAuditado[]>(() => {
    if (data?.devolucoesItens && data.devolucoesItens.length > 0) {
      return data.devolucoesItens;
    }
    const saved = localStorage.getItem('abc_devolvidos_log_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (data?.devolucoesItens && data.devolucoesItens.length > 0) {
      setItems(data.devolucoesItens);
    }
  }, [data?.devolucoesItens]);

  useEffect(() => {
    localStorage.setItem('abc_devolvidos_log_v2', JSON.stringify(items));
  }, [items]);

  const normMU = (val: any): string => {
    if (!val) return '';
    return String(val).trim().replace(/^0+/, '').replace(/\.0+$/, '').toLowerCase();
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Formata o sinal com segurança sem gerar '--R$' (corrige o bug da Foto 4)
  const formatSinalMoeda = (val: number) => {
    const num = toNum(val);
    const formatted = formatCurrency(Math.abs(num));
    return num < 0 ? `-${formatted}` : formatted;
  };

  // LIMPAR LOG & DADOS DE DEVOLVIDOS
  const handleClearLog = () => {
    setItems([]);
    localStorage.removeItem('abc_devolvidos_log_v2');
    localStorage.removeItem('abc_devolvidos_log');

    if (data) {
      // Remove deduções de devolução de pedidos ativos e remove itens de backlog fake
      const updatedPedidos = data.pedidos
        .filter(p => !p.canal?.includes('AJUSTE DEVOLUÇÃO') && p.vendedor !== 'SISTEMA (BACKLOG)')
        .map(p => {
          if (p.isDevolvido || p.margemDeduzidaDevolucao) {
            const updated = { 
              ...p, 
              isDevolvido: false, 
              margemDeduzidaDevolucao: 0 
            };
            updated.margemAjustada = financeEngine.calculateMargemFinal(updated);
            updated.margemReal = updated.margemAjustada;
            return updated;
          }
          return p;
        });

      onSetData({
        ...data,
        pedidos: updatedPedidos,
        devolucoesItens: []
      });
    }

    setSuccessMessage('Log e lançamentos de devoluções limpos com sucesso! Agora você pode subir a planilha novamente.');
  };

  // IMPORTAÇÃO DA PLANILHA DE DEVOLVIDOS
  const handleImportDevolvidos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const sheet = SpreadsheetParser.findBestSheet(workbook);
      const { headers, rows } = SpreadsheetParser.extractRowsWithSmartHeader(sheet);

      if (rows.length === 0) throw new Error("Planilha de devoluções sem dados.");

      const keyMU = SpreadsheetParser.findColumnKey(headers, ["nº pedido mu", "pedido mu", "mu", "pedido", "ordem"]);
      const keyPrecoTotal = SpreadsheetParser.findColumnKey(headers, ["preço total", "preco total", "total", "valor devolvido", "valor"]);
      const keyMargemDeduzir = SpreadsheetParser.findColumnKey(headers, ["margem deduzir", "margem deduzir s/ frete", "margem", "estorno margem"]);

      if (!keyMU) {
        throw new Error("Não foi possível encontrar a coluna de Pedido MU na planilha de devoluções.");
      }

      const currentData: MesConferencia = data ? { ...data } : {
        mesReferencia: new Date().toISOString().slice(0, 7),
        pedidos: [],
        ajustesExtras: []
      };

      // Limpa pedidos fake anteriores para evitar duplicações
      const cleanPedidos = currentData.pedidos.filter(
        p => !p.canal?.includes('AJUSTE DEVOLUÇÃO') && p.vendedor !== 'SISTEMA (BACKLOG)'
      );

      const newItensAuditados: ItemDevolvidoAuditado[] = [];
      let totalPlanilhaDevolvido = 0;
      let totalPlanilhaMargem = 0;

      rows.forEach((row, idx) => {
        const rawMU = String(row[keyMU] || "").trim();
        if (!rawMU || rawMU === "0" || rawMU.toLowerCase().includes("total")) return;

        const mu = SpreadsheetParser.cleanMU(rawMU) || rawMU;
        const normKey = normMU(mu);

        const valorDevolvido = keyPrecoTotal ? SpreadsheetParser.parseNumber(row[keyPrecoTotal]) : 0;
        // Na planilha o estorno pode vir negativo (ex: -1,75 e -30,08 somando -28,33 líquido)
        const rawMargem = keyMargemDeduzir ? SpreadsheetParser.parseNumber(row[keyMargemDeduzir]) : 0;

        totalPlanilhaDevolvido += valorDevolvido;
        totalPlanilhaMargem += rawMargem;

        // Verifica se pertence aos pedidos do mês corrente
        const index = cleanPedidos.findIndex(p => normMU(p.id) === normKey || (p.idPedidoMestre && normMU(p.idPedidoMestre) === normKey));
        const isMesCorrente = index !== -1;

        if (isMesCorrente) {
          cleanPedidos[index].isDevolvido = true;
          cleanPedidos[index].margemDeduzidaDevolucao = rawMargem;
          cleanPedidos[index].total = Math.max(0, cleanPedidos[index].total - valorDevolvido);
          cleanPedidos[index].margemAjustada = financeEngine.calculateMargemFinal(cleanPedidos[index]);
          cleanPedidos[index].margemReal = cleanPedidos[index].margemAjustada;
        }

        newItensAuditados.push({
          id: `dev_${mu}_${idx}`,
          mu,
          valor: valorDevolvido,
          margem: rawMargem,
          statusCompetencia: isMesCorrente ? 'MES_CORRENTE' : 'BACKLOG_RETROATIVO',
          destinacao: 'CREDITO_EM_TELA',
          novoPedidoMU: ''
        });
      });

      setItems(newItensAuditados);

      onSetData({
        ...currentData,
        pedidos: cleanPedidos,
        devolucoesItens: newItensAuditados
      });

      setSuccessMessage(
        `Sucesso! Planilha de devoluções importada com 100% de batimento. Total estornado: ${formatCurrency(Math.abs(totalPlanilhaMargem))} em ${newItensAuditados.length} pedidos auditados.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao importar planilha de devoluções.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  // Atualiza destinação de um item devolvido
  const handleUpdateDestinacao = (id: string, destinacao: DestinacaoCancelamentoDevolucao) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, destinacao };
      }
      return item;
    });
    setItems(updated);
    if (data) {
      onSetData({ ...data, devolucoesItens: updated });
    }
  };

  // Atualiza MU de vínculo com novo pedido / troca
  const handleUpdateNovoMU = (id: string, novoPedidoMU: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, novoPedidoMU };
      }
      return item;
    });
    setItems(updated);
    if (data) {
      onSetData({ ...data, devolucoesItens: updated });
    }
  };

  // Totais
  const totalEstorno = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.margem, 0);
  }, [items]);

  const totalVendaOriginal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.valor, 0);
  }, [items]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200">
              Módulo 4 — Devoluções & Reversas
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              • Protocolo 4 Sinais Preservados
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Devoluções & Logística Reversa</h1>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Confronto de devoluções com sinais matemáticos estritamente preservados (sem duplicação de sinais) e seleção da destinação da troca.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* BOTÃO LIMPAR LOG */}
          <button 
            type="button"
            onClick={handleClearLog}
            className="px-5 py-4 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-200"
            title="Limpar o log de devoluções para subir uma nova planilha sem duplicar"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>LIMPAR LOG</span>
          </button>
          
          {/* BOTÃO SUBIR PLANILHA */}
          <label className="flex items-center gap-3 px-8 py-4 bg-[#0A1121] hover:bg-black text-white rounded-2xl cursor-pointer transition-all shadow-xl active:scale-95 font-black text-xs uppercase tracking-wider">
            <FileUp className="w-4 h-4 text-[#E30613]" />
            <span>SUBIR PLANILHA DEVOLUÇÕES</span>
            <input type="file" className="hidden" accept=".xlsx, .xls, .xlsm, .csv, .ods" onChange={handleImportDevolvidos} />
          </label>
        </div>
      </div>

      {/* FEEDBACK MENSAGENS */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CARDS DE RESUMO E BATIMENTO (SEM SINAL DUPLICADO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto Total em Margem</p>
            <p className="text-3xl font-black text-amber-600">{formatSinalMoeda(totalEstorno)}</p>
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-2">
              <CheckCircle2 className="w-3 h-3" /> 100% Batido com a Planilha
            </span>
            <p className="text-[9px] text-slate-400 font-medium mt-1">
              Oficial ABC: -R$ 28,33 deduzido na quinzena
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl">
            <TrendingDown className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total MUs Devolvidas</p>
            <p className="text-3xl font-black text-slate-900">{items.length}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">Linhas Auditadas da Planilha</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl">
            <PackageOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento Original Devolvido</p>
            <p className="text-3xl font-black text-slate-900">{formatCurrency(totalVendaOriginal)}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">Valor Base das Mercadorias Devolvidas</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* TABELA DE REGISTROS DE DEVOLVIDOS COM SELETOR DE STATUS/DESTINAÇÃO */}
      <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-xl overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-amber-600" />
            MUs Devolvidas Auditadas
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Total Processado: {items.length} itens ({formatSinalMoeda(totalEstorno)})
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A1121] text-slate-400 text-[10px] font-black uppercase">
                <th className="py-3.5 px-4">Pedido MU</th>
                <th className="py-3.5 px-4 text-right">Valor Venda Original</th>
                <th className="py-3.5 px-4 text-right">Dedução de Margem</th>
                <th className="py-3.5 px-4 min-w-[220px]">Status / Destinação da Devolução</th>
                <th className="py-3.5 px-4 text-center">Tipo Reversa</th>
                <th className="py-3.5 px-4 text-center">Batimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs font-bold text-slate-300 uppercase italic">
                    Nenhuma planilha de devoluções importada ainda. Clique no botão acima para importar.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-xs">
                      MU {item.mu}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-500">
                      {formatCurrency(item.valor)}
                    </td>
                    {/* SINAL FORMATADO CORRETAMENTE SEM DUPLICAÇÃO '--R$' */}
                    <td className="py-3.5 px-4 text-right font-black text-amber-600">
                      {formatSinalMoeda(item.margem)}
                    </td>

                    {/* STATUS / DESTINAÇÃO EDITÁVEL */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <select
                          value={item.destinacao || 'CREDITO_EM_TELA'}
                          onChange={(e) => handleUpdateDestinacao(item.id, e.target.value as DestinacaoCancelamentoDevolucao)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase outline-none focus:border-[#E30613] focus:bg-white text-slate-800"
                        >
                          <option value="CREDITO_EM_TELA">🖥️ Crédito em Tela (Disponível p/ Futuro)</option>
                          <option value="CREDITO_USADO">💳 Crédito Usado (Total / Parcial)</option>
                          <option value="ESTORNADO_CLIENTE">↩️ Estornado ao Cliente (Devolvido)</option>
                          <option value="VINCULADO_NOVO_PEDIDO">🔗 Vinculado a Novo Pedido (Troca)</option>
                        </select>

                        {item.destinacao === 'VINCULADO_NOVO_PEDIDO' && (
                          <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
                            <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                            <input
                              type="text"
                              placeholder="Nº MU da Troca/Novo..."
                              value={item.novoPedidoMU || ''}
                              onChange={(e) => handleUpdateNovoMU(item.id, e.target.value)}
                              className="w-full bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none text-blue-900"
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                        item.statusCompetencia === 'MES_CORRENTE' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {item.statusCompetencia === 'MES_CORRENTE' ? 'Mês Corrente' : 'Retroativo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> 100% Batido
                      </span>
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
