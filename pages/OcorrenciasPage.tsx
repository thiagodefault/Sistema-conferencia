import React, { useState, useMemo, useEffect } from 'react';
import { MesConferencia, Pedido } from '../types';
import { 
  FileUp, 
  CheckCircle2, 
  RotateCcw, 
  Calendar, 
  AlertCircle, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp,
  Link2,
  RefreshCw,
  ArrowRight,
  ArrowDown,
  Info,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SpreadsheetParser } from '../services/spreadsheetParser';
import { toNum, safeRound, formatMoedaSegura } from '../services/financeEngine';

interface OcorrenciasPageProps {
  data: MesConferencia | null;
  onSetData: (newData: MesConferencia | null) => void;
}

export const OcorrenciasPage: React.FC<OcorrenciasPageProps> = ({ data, onSetData }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(data?.mesReferencia || new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (data?.mesReferencia) {
      setSelectedMonth(data.mesReferencia);
    }
  }, [data?.mesReferencia]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleUpdateMestre = (muId: string, mestreId: string) => {
    if (!data) return;
    const newPedidos = data.pedidos.map(p => {
      if (p.id === muId) return { ...p, idPedidoMestre: mestreId };
      return p;
    });
    onSetData({ ...data, pedidos: newPedidos });
  };

  const handleImportOcorrencias = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const sheet = SpreadsheetParser.findBestSheet(workbook);
      const { headers, rows } = SpreadsheetParser.extractRowsWithSmartHeader(sheet);

      if (rows.length === 0) throw new Error("Planilha de ocorrências sem linhas legíveis.");

      const keyNovo = SpreadsheetParser.findColumnKey(headers, ["novo pedido", "pedido", "mu", "mu nova", "novo", "pedido novo"]);
      const keyOriginal = SpreadsheetParser.findColumnKey(headers, ["pedido original", "mu mestre", "pedido mestre", "original", "mestre"]);
      const keyFilial = SpreadsheetParser.findColumnKey(headers, ["filial", "loja", "unidade"]);
      const keyStatus = SpreadsheetParser.findColumnKey(headers, ["status", "situacao", "situação"]);
      const keyTipo = SpreadsheetParser.findColumnKey(headers, ["status tipo", "tipo", "tipo ocorrencia", "tipo ocorrência"]);

      if (!keyNovo) {
        throw new Error("Não foi possível encontrar a coluna com o Pedido/MU novo na planilha.");
      }

      const currentData: MesConferencia = data ? { ...data } : {
        mesReferencia: selectedMonth,
        pedidos: [],
        ajustesExtras: []
      };

      const newPedidos = [...currentData.pedidos];
      let vinculadosCount = 0;

      rows.forEach((r: any) => {
        const muNovo = String(r[keyNovo] || "").trim();
        const muOriginal = keyOriginal ? String(r[keyOriginal] || "").trim() : "";
        
        if (!muNovo) return;

        const index = newPedidos.findIndex(p => p.id === muNovo);
        if (index !== -1) {
          newPedidos[index].idPedidoMestre = muOriginal;
          newPedidos[index].filial = keyFilial ? (r[keyFilial] || "F - ITU") : "F - ITU";
          newPedidos[index].statusOcorrencia = keyStatus ? (r[keyStatus] || "Finalizado Reposição") : "Finalizado Reposição";
          newPedidos[index].tipoOcorrencia = keyTipo ? (r[keyTipo] || "Reposição - Entrega ao Cliente") : "Reposição - Entrega ao Cliente";
          newPedidos[index].isOcorrencia = true;
          vinculadosCount++;
        }
      });

      onSetData({ ...currentData, pedidos: newPedidos });
      alert(`Sucesso! ${vinculadosCount} pedidos vinculados como ocorrências/reposições a partir de "${file.name}".`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao processar planilha de ocorrências.");
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  /**
   * REGRA CENTRAL: Ocorrência Financeira e Direção Financeira
   * Pedido original: -R$ 10,00
   * Novo pedido: +R$ 20,00
   * Diferença: +R$ 10,00
   * Se Diferença > 0: Você deve R$ 10,00 à ABC.
   * Se Diferença === 0: Sem divergência -> Não exibir alerta.
   */
  const auditData = useMemo(() => {
    if (!data) return [];
    
    return data.pedidos
      .filter(p => p.isOcorrencia || (p.idPedidoMestre && p.idPedidoMestre !== p.id))
      .map(p => {
        const mestre = data.pedidos.find(m => m.id === p.idPedidoMestre);
        const valorOriginal = mestre?.total || 0;
        const margemEstornadaOriginal = mestre?.margemOriginal || 0;
        const valorNovo = p.total || 0;
        const margemNova = p.margemReal ?? p.margemAjustada;

        // Diferença financeira: Novo Pedido (+) - Pedido Original (-)
        const diferencaFinanceira = safeRound(valorNovo - valorOriginal);
        const diferencaMargem = safeRound(margemNova - margemEstornadaOriginal);

        // Direção financeira explícita:
        let direcao: 'DEVE_ABC' | 'RECEBER_ABC' | 'EQUILIBRADO' = 'EQUILIBRADO';
        if (diferencaFinanceira > 0.009) {
          direcao = 'DEVE_ABC';
        } else if (diferencaFinanceira < -0.009) {
          direcao = 'RECEBER_ABC';
        } else {
          direcao = 'EQUILIBRADO';
        }

        return {
          id: p.id,
          data: p.data,
          filial: p.filial || 'F - ITU',
          status: p.statusOcorrencia || 'Finalizado Reposição',
          tipo: p.tipoOcorrencia || 'Reposição',
          pedidoOriginal: p.idPedidoMestre || '',
          valorPedidoOriginal: valorOriginal,
          margemEstornada: margemEstornadaOriginal,
          valorPedidoNovo: valorNovo,
          margemNova,
          diferencaFinanceira,
          diferencaMargem,
          direcao,
          temDivergencia: direcao !== 'EQUILIBRADO'
        };
      });
  }, [data]);

  const summary = useMemo(() => {
    let totalReposicao = 0;
    let totalOriginal = 0;
    let totalDiferenca = 0;
    let pendentes = 0;
    let countDivergentes = 0;

    auditData.forEach(curr => {
      totalReposicao += curr.valorPedidoNovo;
      totalOriginal += curr.valorPedidoOriginal;
      totalDiferenca += curr.diferencaFinanceira;
      if (!curr.pedidoOriginal) pendentes++;
      if (curr.temDivergencia) countDivergentes++;
    });

    return { 
      totalReposicao: safeRound(totalReposicao), 
      totalOriginal: safeRound(totalOriginal), 
      totalDiferenca: safeRound(totalDiferenca), 
      count: auditData.length, 
      pendentes,
      countDivergentes
    };
  }, [auditData]);

  return (
    <div className="space-y-12">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200">
              Regra 5 — Ocorrências Visuais
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              • História Financeira & Direção de Saldo
            </span>
          </div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Ocorrências & Reposições</h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[#E30613] font-bold uppercase text-[11px] tracking-[0.3em]">Competência:</p>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm group">
               <Calendar className="w-4 h-4 text-[#E30613]" />
               <input 
                 type="month" 
                 value={selectedMonth} 
                 onChange={(e) => setSelectedMonth(e.target.value)} 
                 className="bg-transparent text-xs font-black uppercase text-slate-700 outline-none cursor-pointer" 
               />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 px-8 py-4 bg-[#E30613] hover:bg-red-700 text-white rounded-2xl cursor-pointer shadow-xl active:scale-95 font-black text-xs uppercase tracking-wider transition-all">
            <FileUp className="w-4 h-4" />
            <span>IMPORTAR PLANILHA OCORRÊNCIAS</span>
            <input type="file" className="hidden" accept=".xlsx, .xls, .xlsm, .csv, .ods" onChange={handleImportOcorrencias} />
          </label>
        </div>
      </div>

      {/* CARDS KPI SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0A1121] rounded-[2.5rem] p-8 text-white shadow-2xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Novos Pedidos (Reposições)</span>
          <p className="text-3xl font-black tracking-tighter mt-1">{formatCurrency(summary.totalReposicao)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">{summary.count} ocorrências registradas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Pedidos Originais Estornados</span>
          <p className="text-3xl font-black tracking-tighter text-slate-900 mt-1">{formatCurrency(summary.totalOriginal)}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Base original de devolução</p>
        </div>

        <div className={`rounded-[2.5rem] p-8 shadow-xl border ${
          summary.totalDiferenca > 0 
            ? 'bg-red-50/70 border-red-200 text-red-950' 
            : summary.totalDiferenca < 0 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diferença Financeira Líquida</span>
          <p className={`text-3xl font-black tracking-tighter mt-1 ${
            summary.totalDiferenca > 0 ? 'text-[#E30613]' : summary.totalDiferenca < 0 ? 'text-emerald-600' : 'text-slate-800'
          }`}>
            {summary.totalDiferenca > 0 ? `+${formatCurrency(summary.totalDiferenca)}` : formatCurrency(summary.totalDiferenca)}
          </p>
          <p className="text-[10px] font-bold mt-2">
            {summary.totalDiferenca > 0 ? '🔴 Você deve para a ABC' : summary.totalDiferenca < 0 ? '🟢 A receber da ABC' : '✓ Equilibrado'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Situação de Conferência</span>
          {summary.countDivergentes > 0 ? (
             <p className="text-xl font-black text-amber-600 flex items-center gap-2 mt-1">
                <AlertTriangle className="w-5 h-5" /> {summary.countDivergentes} com Diferença
             </p>
          ) : (
             <p className="text-xl font-black text-emerald-600 flex items-center gap-2 mt-1">
                <ShieldCheck className="w-5 h-5" /> Sem Divergências
             </p>
          )}
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
            {summary.pendentes > 0 ? `${summary.pendentes} sem vínculo mestre` : '100% Auditado'}
          </p>
        </div>
      </div>

      {/* HISTÓRIA FINANCEIRA VISUAL DA OCORRÊNCIA (REGRA 5 EXATA DO USUÁRIO) */}
      <div className="bg-slate-50 border border-slate-200 rounded-[3rem] p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#E30613]" />
            História Financeira das Ocorrências
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Visualização didática: <strong>Pedido Original (Devolução -R$) ➔ Novo Pedido (+R$) ➔ Diferença</strong>. A direção financeira fica clara: "Você deve à ABC" ou "A receber da ABC". Quando a diferença for R$ 0,00, nenhum alerta é exibido.
          </p>
        </div>

        {auditData.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-bold text-xs uppercase italic">
            Nenhuma ocorrência registrada no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditData.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">
                      OCORRÊNCIA — {item.id}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      ({item.tipo})
                    </span>
                  </div>
                  {/* ALERTA CONDICIONAL: Só mostra aviso quando houver diferença financeira */}
                  {item.direcao === 'DEVE_ABC' && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-black text-[9px] uppercase border border-red-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                      Você deve {formatCurrency(item.diferencaFinanceira)} à ABC
                    </span>
                  )}
                  {item.direcao === 'RECEBER_ABC' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] uppercase border border-emerald-200 flex items-center gap-1">
                      A receber {formatCurrency(Math.abs(item.diferencaFinanceira))} da ABC
                    </span>
                  )}
                  {item.direcao === 'EQUILIBRADO' && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[9px] uppercase">
                      ✓ Sem divergência (Zero)
                    </span>
                  )}
                </div>

                {/* FLUXO VISUAL PEDIDO ORIGINAL ➔ DEVOLUÇÃO ➔ NOVO PEDIDO ➔ DIFERENÇA */}
                <div className="grid grid-cols-4 gap-2 items-center text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">Pedido Original</span>
                    <span className="font-mono font-black text-xs text-slate-700 block mt-0.5">
                      {item.pedidoOriginal || 'Não informado'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      -{formatCurrency(item.valorPedidoOriginal)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                    <span className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Devolução</span>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    <span className="text-[8px] font-black text-emerald-700 block uppercase">Novo Pedido (MU)</span>
                    <span className="font-mono font-black text-xs text-emerald-900 block mt-0.5">
                      MU {item.id}
                    </span>
                    <span className="text-[9px] font-black text-emerald-700">
                      +{formatCurrency(item.valorPedidoNovo)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    item.direcao === 'DEVE_ABC'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : item.direcao === 'RECEBER_ABC'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-[8px] font-black block uppercase opacity-75">Diferença</span>
                    <span className="font-mono font-black text-sm block mt-0.5">
                      {item.diferencaFinanceira > 0 ? `+${formatCurrency(item.diferencaFinanceira)}` : formatCurrency(item.diferencaFinanceira)}
                    </span>
                    <span className="text-[7.5px] font-bold uppercase block mt-0.5">
                      {item.direcao === 'DEVE_ABC' ? 'Deve à ABC' : item.direcao === 'RECEBER_ABC' ? 'Crédito Loja' : 'Neutro'}
                    </span>
                  </div>
                </div>

                {/* INTERPRETAÇÃO REGRA CONFIRMADA */}
                <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-600 flex items-start gap-2 border border-slate-100">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Interpretação Financeira:</strong> {
                      item.direcao === 'DEVE_ABC'
                        ? `A ocorrência gerou uma diferença positiva de ${formatCurrency(item.diferencaFinanceira)} em favor da ABC. O valor de ${formatCurrency(item.diferencaFinanceira)} é devido à ABC.`
                        : item.direcao === 'RECEBER_ABC'
                        ? `A devolução superou a reposição em ${formatCurrency(Math.abs(item.diferencaFinanceira))}. Há crédito a receber da ABC.`
                        : `A ocorrência fechou em zero (${formatCurrency(0)}). Nenhuma divergência financeira gerada.`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TABELA DE AUDITORIA COMPLETA */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#E30613]" />
            Listagem de Ocorrências e Mestre
          </h3>
          <span className="text-xs text-slate-400 font-bold">
            Total Auditado: {auditData.length} registros
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A1121] text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-800">
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Status / Tipo</th>
                <th className="px-5 py-4 text-center">MU Original (Mestre)</th>
                <th className="px-5 py-4 text-right">Valor Original</th>
                <th className="px-5 py-4 text-center text-emerald-400">Novo Pedido</th>
                <th className="px-5 py-4 text-right">Valor Novo</th>
                <th className="px-5 py-4 text-right">Diferença Financeira</th>
                <th className="px-5 py-4 text-center">Direção Financeira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {auditData.length === 0 ? (
                <tr>
                   <td colSpan={8} className="py-24 text-center text-slate-300 font-bold uppercase italic">
                      Nenhuma ocorrência identificada no mês.
                   </td>
                </tr>
              ) : (
                auditData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600">{item.data}</td>
                    <td className="px-5 py-3.5">
                       <span className="text-[10px] font-black uppercase text-slate-900 block">{item.status}</span>
                       <span className="text-[8px] font-bold text-slate-400 uppercase">{item.tipo}</span>
                    </td>
                    
                    {/* VÍNCULO MESTRE */}
                    <td className="px-5 py-3.5 text-center">
                       <input 
                         type="text" 
                         defaultValue={item.pedidoOriginal} 
                         onBlur={(e) => handleUpdateMestre(item.id, e.target.value)} 
                         placeholder="Vincular MU..." 
                         className="w-28 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-center font-mono font-black text-xs text-slate-800 focus:bg-white focus:border-red-500 outline-none transition" 
                       />
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-600">
                      {formatCurrency(item.valorPedidoOriginal)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-black text-emerald-700">
                      MU {item.id}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      {formatCurrency(item.valorPedidoNovo)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-black font-mono ${
                      item.diferencaFinanceira > 0 ? 'text-red-600' : item.diferencaFinanceira < 0 ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      {item.diferencaFinanceira > 0 ? `+${formatCurrency(item.diferencaFinanceira)}` : formatCurrency(item.diferencaFinanceira)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {item.direcao === 'DEVE_ABC' && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-[9px] font-black uppercase">
                          🔴 Deve à ABC
                        </span>
                      )}
                      {item.direcao === 'RECEBER_ABC' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase">
                          🟢 A Receber ABC
                        </span>
                      )}
                      {item.direcao === 'EQUILIBRADO' && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase">
                          ✓ Sem Divergência
                        </span>
                      )}
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
