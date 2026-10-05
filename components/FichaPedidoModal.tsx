import React from 'react';
import { Pedido } from '../types';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Truck, 
  ShieldCheck, 
  Info,
  Calendar,
  User,
  ShoppingBag
} from 'lucide-react';
import { safeRound, toNum } from '../services/financeEngine';
import { SpreadsheetParser } from '../services/spreadsheetParser';

interface FichaPedidoModalProps {
  pedido: Pedido | null;
  onClose: () => void;
}

export const FichaPedidoModal: React.FC<FichaPedidoModalProps> = ({ pedido, onClose }) => {
  if (!pedido) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const cleanMU = SpreadsheetParser.cleanMU(pedido.id) || pedido.id;
  const valorTotal = toNum(pedido.total);
  
  // 1ª Camada: Margem Original ABC (Imutável)
  const margemOriginalABC = toNum(pedido.margemOriginal);
  const margemOriginalABCPct = valorTotal > 0 ? (margemOriginalABC / valorTotal) * 100 : 0;

  // 2ª Camada: Ajustes Oficiais Alocados
  const ajustesLista = pedido.ajustesAlocados || [];
  const credTotal = toNum(pedido.credito) + toNum(pedido.creditoAlocado);
  const debTotal = toNum(pedido.debito) + toNum(pedido.debitoAlocado);
  const saldoAjustes = safeRound(credTotal - debTotal);
  const temAjustes = Math.abs(saldoAjustes) > 0.009 || ajustesLista.length > 0;

  // 3ª Camada: Margem Final Apurada pelo Sistema
  const margemFinalApurada = toNum(pedido.margemReal ?? pedido.margemAjustada);
  const margemFinalPct = valorTotal > 0 ? (margemFinalApurada / valorTotal) * 100 : 0;

  // Frete ABC vs Sistema
  const freteABC = toNum(pedido.frete);
  const freteSistema = toNum(pedido.custoTotalLogistico) > 0 ? toNum(pedido.custoTotalLogistico) : freteABC;
  const diffFrete = safeRound(freteSistema - freteABC);
  const temDiffFrete = Math.abs(diffFrete) > 0.009;

  const isDivergente = pedido.isDivergente || temDiffFrete;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* HEADER MODAL */}
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-3 py-1 bg-red-100 text-[#E30613] rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200">
                Ficha de Auditoria do Pedido
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isDivergente 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {isDivergente ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ⚠️ Divergência
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ✓ Regular
                  </>
                )}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              PEDIDO MU {cleanMU}
            </h3>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {(!pedido.vendedor || pedido.vendedor.trim() === '.') ? '🛒 E-commerce' : pedido.vendedor}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {pedido.data || 'Mês Ativo'}
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-700">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                Faturado: {formatCurrency(valorTotal)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            title="Fechar Ficha"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CORPO: AS TRÊS CAMADAS (REGRA 5 DO CONCEITO CENTRAL ABC FINANCE) */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Princípio Central da Auditoria ABC Finance:
              </p>
              <p className="mt-0.5">
                O sistema não cria dinheiro nem novas despesas. Ele preserva o valor oficial informado pela ABC na <strong>1ª Camada</strong>, identifica e associa os lançamentos oficiais dispersos na <strong>2ª Camada</strong>, e apresenta a margem real apurada na <strong>3ª Camada</strong> de forma auditável e transparente.
              </p>
            </div>
          </div>

          {/* 1ª CAMADA — MARGEM ORIGINAL ABC (IMUTÁVEL) */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                1ª Camada — Margem Original ABC (Imutável)
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Oficial da Planilha de Vendas
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
              <div>
                <p className="text-3xl font-black text-slate-900 font-mono">
                  {formatCurrency(margemOriginalABC)}
                </p>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Margem calculada originalmente pela ABC
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-right">
                <span className="text-[9px] text-slate-400 font-black uppercase block">Rentab. Original</span>
                <span className="text-lg font-black text-slate-800 font-mono">{margemOriginalABCPct.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* 2ª CAMADA — AJUSTES OFICIAIS ALOCADOS (REGRA 4 E 5) */}
          <div className="bg-white border-2 border-blue-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                2ª Camada — Ajustes Oficiais da ABC Alocados
              </span>
              <span className="text-[10px] font-mono font-black text-blue-700">
                {temAjustes ? (saldoAjustes >= 0 ? `+${formatCurrency(saldoAjustes)}` : formatCurrency(saldoAjustes)) : 'R$ 0,00'}
              </span>
            </div>

            {ajustesLista.length > 0 ? (
              <div className="space-y-3">
                {ajustesLista.map((aj, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        aj.tipo === 'credito' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {aj.tipo === 'credito' ? '+ Crédito Oficial' : '- Débito Oficial'}
                      </span>
                      <span className={`font-mono font-black text-sm ${
                        aj.tipo === 'credito' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {aj.tipo === 'credito' ? `+${formatCurrency(aj.valor)}` : `-${formatCurrency(aj.valor)}`}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <p className="text-slate-800 font-bold">
                        <strong>Motivo:</strong> {aj.descricao}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        <strong>Origem:</strong> Ajuste ABC #{aj.idAjuste} {aj.origemPlanilha ? `(${aj.origemPlanilha}${aj.linhaPlanilha ? `, Linha ${aj.linhaPlanilha}` : ''})` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : temAjustes ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Ajuste Direto no Pedido:</span>
                  <span className={`font-mono font-black ${saldoAjustes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {saldoAjustes >= 0 ? `+${formatCurrency(saldoAjustes)}` : formatCurrency(saldoAjustes)}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Lançamento oficial vinculado ao MU {cleanMU}.
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs font-medium">
                <p className="font-bold text-slate-500">Nenhum ajuste oficial relacionado a este pedido (R$ 0,00)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conforme Regra 9: se não existe ajuste, a margem final apurada coincide 100% com a margem da ABC.
                </p>
              </div>
            )}
          </div>

          {/* 3ª CAMADA — MARGEM FINAL APURADA */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0A1121] text-white rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                3ª Camada — Margem Final Apurada pelo Sistema
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                Resultado Econômico Real
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
              <div>
                <p className="text-4xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatCurrency(margemFinalApurada)}
                </p>
                <p className="text-xs text-slate-300 font-medium mt-1">
                  Margem real após incorporar os lançamentos oficiais dispersos
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                <span className="text-[9px] text-slate-400 font-black uppercase block">Rentab. Final Real</span>
                <span className="text-xl font-black text-emerald-300 font-mono">{margemFinalPct.toFixed(2)}%</span>
              </div>
            </div>

            {/* DEMONSTRAÇÃO DA EQUAÇÃO (EXEMPLO DO ITEM 3 DA ESPECIFICAÇÃO) */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs font-mono text-slate-300 flex flex-wrap items-center gap-2">
              <span>Margem ABC ({formatCurrency(margemOriginalABC)})</span>
              {saldoAjustes !== 0 && (
                <span>
                  {saldoAjustes > 0 ? `+ Ajuste (${formatCurrency(saldoAjustes)})` : `- Ajuste (${formatCurrency(Math.abs(saldoAjustes))})`}
                </span>
              )}
              <span>=</span>
              <strong className="text-emerald-400 text-sm">{formatCurrency(margemFinalApurada)}</strong>
            </div>
          </div>

          {/* RASTREABILIDADE CANÔNICA DE AUDITORIA (REGRA 6) */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-500" />
              Rastreabilidade de Auditoria (De onde veio o valor?)
            </h4>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold text-slate-600 bg-white p-3 rounded-2xl border border-slate-200">
              <span className="px-2 py-1 bg-slate-100 rounded">Arquivo ABC</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-1 bg-slate-100 rounded">Aba Margem / Ajuste</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded">MU {cleanMU}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-1 bg-slate-100 rounded">Orig: {formatCurrency(margemOriginalABC)}</span>
              {temAjustes && (
                <>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="px-2 py-1 bg-amber-50 text-amber-900 rounded">Ajuste: {formatCurrency(saldoAjustes)}</span>
                </>
              )}
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-1 bg-emerald-50 text-emerald-900 rounded font-black">
                Final: {formatCurrency(margemFinalApurada)}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              <strong>Garantia de Não Duplicação (Regra 12):</strong> O ajuste associado a este pedido é contabilizado de forma única no consolidado geral. Ele explica analiticamente a margem deste pedido sem criar novas despesas nem distorcer os totais oficiais da ABC.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end bg-slate-50 rounded-b-[2.5rem]">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
          >
            Fechar Ficha do Pedido
          </button>
        </div>
      </div>
    </div>
  );
};
