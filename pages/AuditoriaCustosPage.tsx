
import React, { useState } from 'react';
import { HistoricoConsolidado, AppConfig, AuditItem } from '../types';
import { ScanBarcode, UploadCloud, Truck, DollarSign, Calculator, AlertTriangle, CheckCircle2, Split, Plus, Trash2, X, Save, Crown, HelpCircle, Eye, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SpreadsheetParser } from '../services/spreadsheetParser';

interface AuditoriaCustosPageProps {
  history: HistoricoConsolidado;
  config: AppConfig;
}

// --- TABELAS DE REFERÊNCIA (2026) ---

const FRETE_LOJA_2026 = [
  { max: 20, val: 0.00 },
  { max: 50, val: 24.03 },
  { max: 100, val: 36.09 },
  { max: 150, val: 48.06 },
  { max: 200, val: 58.98 },
  { max: 250, val: 71.05 },
  { max: 500, val: 96.22 }
];
const FRETE_LOJA_TON_2026 = 192.44; 

const FRETE_CLIENTE_KG_2026 = 0.192;
const FRETE_CLIENTE_MIN_2026 = 96.22;

const PAYMENT_RATES: Record<string, number> = {
  'PIX/BOLETO': 0.01,
  'DINHEIRO': 0.10,
  'DEBITO': 0.95,
  'CREDITO_1X': 2.86,
  'CREDITO_2X': 3.80,
  'CREDITO_3X': 4.54,
  'CREDITO_4X': 5.29,
  'CREDITO_5X': 6.04,
  'CREDITO_6X': 6.80,
  'CREDITO_7X': 7.83,
  'CREDITO_8X': 8.60,
  'CREDITO_9X': 9.38,
  'CREDITO_10X': 10.16,
  'CREDITO_11X': 10.95,
  'CREDITO_12X': 11.74,
};

const DEFAULT_ROYALTY_RATE = 3.0; // 3% padrão

// --- HELPER FUNCTIONS ---

const toNumber = (val: any): number => {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const toPercent = (val: any): number => {
  let n = toNumber(val);
  // Se vier 0.3, converte para 30. Se vier 30, mantem 30.
  if (Math.abs(n) > 0 && Math.abs(n) <= 1) return n * 100;
  return n;
};

const getActualKey = (firstRow: any, targets: string[]): string => {
  const keys = Object.keys(firstRow);
  for (const target of targets) {
    const normalizedTarget = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const found = keys.find(k => {
      const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return normalizedK === normalizedTarget || normalizedK.includes(normalizedTarget);
    });
    if (found) return found;
  }
  return targets[0];
};

const calculateFreight2026 = (weight: number, type: 'LOJA' | 'CLIENTE'): number => {
  if (weight <= 0) return 0;

  if (type === 'LOJA') {
    const faixa = FRETE_LOJA_2026.find(f => weight <= f.max);
    if (faixa) return faixa.val;
    return weight * (FRETE_LOJA_TON_2026 / 1000);
  } else {
    const calc = weight * FRETE_CLIENTE_KG_2026;
    return Math.max(FRETE_CLIENTE_MIN_2026, calc);
  }
};

const findMatchingRateKey = (realVal: number, total: number): string | null => {
  if (total <= 0) return null;
  const pct = (realVal / total) * 100;
  const match = Object.entries(PAYMENT_RATES).find(([_, rate]) => Math.abs(rate - pct) < 0.03);
  return match ? match[0] : null;
};

const determineCategory = (marginPct: number): 'TELEVENDAS' | 'PROMO' | 'NORMAL' | 'OUTRO' => {
  if (Math.abs(marginPct - 8) < 1.5) return 'TELEVENDAS'; // ~8%
  if (Math.abs(marginPct - 20) < 2.5) return 'PROMO'; // ~20%
  if (Math.abs(marginPct - 30) < 5) return 'NORMAL'; // ~30%
  return 'OUTRO';
};

export const AuditoriaCustosPage: React.FC<AuditoriaCustosPageProps> = () => {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [splitModal, setSplitModal] = useState<{ isOpen: boolean, itemId: string | null }>({ isOpen: false, itemId: null });
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean, itemId: string | null }>({ isOpen: false, itemId: null });
  const [tempSplit, setTempSplit] = useState<{ method: string; value: number }[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculateFullItem = (base: Partial<AuditItem>): AuditItem => {
     const total = base.totalVenda || 0;
     const freteCob = base.freteCobrado || 0;
     const peso = base.peso || 0;
     const tipoEntrega = base.tipoEntrega || 'LOJA';
     const cat = base.categoria || 'OUTRO';
     
     // 1. Frete
     const freteTeorico = calculateFreight2026(peso, tipoEntrega);
     const diffFrete = freteCob - freteTeorico; 
     
     // Split ABC Televendas
     let splitFreteABC = 0;
     if (cat === 'TELEVENDAS' && diffFrete > 0) {
        splitFreteABC = diffFrete * 0.25;
     }
     const saldoFreteFinal = diffFrete - splitFreteABC;

     // 2. Financeiro
     let finTeorico = 0;
     let taxaMedia = 0;
     
     if (base.formaPagamentoSelecionada === 'MISTO' && base.splitDetails) {
        base.splitDetails.forEach(s => {
           const r = PAYMENT_RATES[s.method] || 0;
           finTeorico += s.value * (r / 100);
        });
        taxaMedia = (finTeorico / total) * 100;
     } else if (base.formaPagamentoSelecionada) {
        const r = PAYMENT_RATES[base.formaPagamentoSelecionada] || 0;
        finTeorico = total * (r / 100);
        taxaMedia = r;
     }

     // 3. Royalties e Base Produto
     const vendaProduto = Math.max(0, total - freteCob);
     let royalties = 0;
     if (cat !== 'TELEVENDAS') {
        royalties = vendaProduto * (DEFAULT_ROYALTY_RATE / 100);
     }

     const margemPctAplicavel = cat === 'TELEVENDAS' ? 8.0 : (base.margemPlanilhaPct || 0);
     const receitaBaseProduto = vendaProduto * (margemPctAplicavel / 100);

     // 4. Resultado Líquido Calculado
     const resultadoLiq = receitaBaseProduto + saldoFreteFinal - finTeorico - royalties;
     
     // 5. Comparação com Planilha (Se existir margem R$ na planilha)
     const margemPlanilhaR$ = base.margemPlanilhaR$ || 0;
     const diffResultadoR$ = resultadoLiq - margemPlanilhaR$;
     // Se a planilha vier zerada, assumimos erro ou ignoramos? Vamos assumir que se vier > 0, comparamos.
     const diffResultadoPct = margemPlanilhaR$ !== 0 ? (diffResultadoR$ / margemPlanilhaR$) * 100 : 0;

     // Tolerância de 10 centavos
     const statusResultado = Math.abs(diffResultadoR$) < 0.10 ? 'ok' : 'erro';

     return {
        ...base,
        freteTeorico,
        diffFrete,
        splitFreteABC,
        statusFrete: diffFrete >= -0.05 ? 'ok' : 'prejuizo',
        custoFinanceiroTeorico: finTeorico,
        taxaTeoricaPct: taxaMedia,
        diffFinanceiro: finTeorico - (base.custoFinanceiroPlanilha || 0),
        statusFinanceiro: base.formaPagamentoSelecionada ? 'ok' : 'pendente',
        royaltiesTeorico: royalties,
        receitaBaseProduto,
        saldoFreteFinal,
        resultadoLiquido: resultadoLiq,
        diffResultadoR$,
        diffResultadoPct,
        statusResultado
     } as AuditItem;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const sheet = SpreadsheetParser.findBestSheet(workbook);
      const { headers, rows } = SpreadsheetParser.extractRowsWithSmartHeader(sheet);

      if (rows.length === 0) return;

      const kMU = SpreadsheetParser.findColumnKey(headers, ['Nº Pedido MU', 'Pedido MU', 'MU', 'Pedido', 'Nº']);
      const kTotal = SpreadsheetParser.findColumnKey(headers, ['Total Pedido (R$)', 'Total Pedido', 'Valor Total', 'Venda', 'Total']);
      const kPeso = SpreadsheetParser.findColumnKey(headers, ['Peso Bruto', 'Peso', 'Kg', 'Peso (kg)']);
      const kFreteCob = SpreadsheetParser.findColumnKey(headers, ['Valor Frete', 'Frete', 'Frete Cobrado', 'Frete (r$)']);
      const kCustoFin = SpreadsheetParser.findColumnKey(headers, ['Custo Fin', 'Taxa Adm', 'Financeiro', 'Valor Taxa', 'Custo Financeiro']);
      const kLiq = SpreadsheetParser.findColumnKey(headers, ['Valor Liquido', 'Liquido', 'Vlr Liq', 'Valor Líquido']);
      
      const kMargemPct = SpreadsheetParser.findColumnKey(headers, ['Margem produto c/frete (%)', 'Margem %', 'Margem Percentual', 'Rentabilidade']);
      const kMargemAbs = SpreadsheetParser.findColumnKey(headers, ['Margem líq. c/ frete', 'Margem R$', 'Margem Contribuicao', 'Margem Bruta R$', 'Resultado']);

      const processedItems: AuditItem[] = [];
      const seenMUs = new Set<string>();

      rows.forEach((r) => {
        const mu = kMU ? String(r[kMU] || "").trim() : "";
        if (!mu || mu.toUpperCase().includes('TOTAL')) return;
        if (seenMUs.has(mu)) return;
        seenMUs.add(mu);

        const totalVenda = kTotal ? SpreadsheetParser.parseNumber(r[kTotal]) : 0;
        const peso = kPeso ? SpreadsheetParser.parseNumber(r[kPeso]) : 0;
        const freteCobrado = kFreteCob ? SpreadsheetParser.parseNumber(r[kFreteCob]) : 0;
        const margemPct = kMargemPct ? SpreadsheetParser.parsePercent(r[kMargemPct]) : 0;
        const margemAbs = kMargemAbs ? SpreadsheetParser.parseNumber(r[kMargemAbs]) : 0;
        
        let custoFin = kCustoFin ? SpreadsheetParser.parseNumber(r[kCustoFin]) : 0;
        if (custoFin === 0 && kLiq && r[kLiq]) {
           const liq = SpreadsheetParser.parseNumber(r[kLiq]);
           if (totalVenda > 0 && liq > 0) custoFin = totalVenda - liq;
        }

        const detectedKey = findMatchingRateKey(custoFin, totalVenda);
        const defaultRateKey = detectedKey || '';
        
        const categoria = determineCategory(margemPct);

        const baseItem: Partial<AuditItem> = {
          id: crypto.randomUUID(),
          mu,
          data: '---',
          vendedor: '---',
          totalVenda,
          peso,
          margemPlanilhaPct: margemPct,
          margemPlanilhaR$: margemAbs,
          categoria,
          custoFinanceiroPlanilha: custoFin,
          formaPagamentoSelecionada: defaultRateKey,
          freteCobrado,
          tipoEntrega: 'LOJA', 
        };

      processedItems.push(calculateFullItem(baseItem));
    });

    setItems(processedItems);
  } catch (err) {
    alert("Erro ao ler planilha. Verifique o formato.");
  } finally {
    setLoading(false);
    e.target.value = '';
  }
};

  const updateItem = (id: string, changes: Partial<AuditItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...changes };
      return calculateFullItem(merged);
    }));
  };

  const openSplitModal = (item: AuditItem) => {
     setTempSplit(item.splitDetails || [{ method: '', value: item.totalVenda }]);
     setSplitModal({ isOpen: true, itemId: item.id });
  };

  const saveSplit = () => {
     if (!splitModal.itemId) return;
     updateItem(splitModal.itemId, { splitDetails: tempSplit, formaPagamentoSelecionada: 'MISTO' });
     setSplitModal({ isOpen: false, itemId: null });
  };

  const addSplitRow = () => setTempSplit([...tempSplit, { method: '', value: 0 }]);
  const removeSplitRow = (idx: number) => setTempSplit(tempSplit.filter((_, i) => i !== idx));
  const updateSplitRow = (idx: number, field: keyof typeof tempSplit[0], val: any) => {
     const newSplit = [...tempSplit];
     // @ts-ignore
     newSplit[idx][field] = val;
     setTempSplit(newSplit);
  };

  const getDetailItem = () => items.find(i => i.id === detailsModal.itemId);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Calculadora de Conferência</h2>
          <div className="flex items-center gap-4 mt-2">
             <p className="text-[#E30613] font-black uppercase text-[10px] tracking-[0.3em]">Auditoria Volátil (Não salva no banco)</p>
          </div>
        </div>
        <label className="flex items-center gap-4 px-10 py-5 bg-[#0A1121] text-white rounded-2xl cursor-pointer hover:bg-black transition-all shadow-2xl active:scale-95 font-black text-sm uppercase tracking-wider">
           <UploadCloud className="w-5 h-5 text-[#E30613]" />
           <span>CARREGAR PLANILHA CONFERÊNCIA</span>
           <input type="file" className="hidden" accept=".xlsx, .xls, .xlsm, .csv, .ods" onChange={handleFileUpload} />
        </label>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] py-32 text-center text-slate-300">
           <ScanBarcode className="w-20 h-20 mx-auto mb-6 opacity-20" />
           <p className="font-black uppercase text-sm tracking-widest text-slate-400">Nenhum dado carregado.</p>
           <p className="text-xs font-medium text-slate-400 mt-2 max-w-md mx-auto">
             Importe a planilha para auditar: Televendas (8%), Promoções (20%), Cheio (30%), Royalties e Fretes 2026.
           </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
             <div className="flex gap-4">
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   <span className="text-[10px] font-black uppercase text-emerald-700">Verde: Cálculo Correto</span>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#E30613]"></div>
                   <span className="text-[10px] font-black uppercase text-red-700">Vermelho: Valor Divergente</span>
                </div>
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">Total Linhas: {items.length}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px]">
             <div className="overflow-x-auto pb-32">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-[#0A1121] text-slate-400 text-[9px] font-black uppercase tracking-widest">
                         <th className="px-4 py-4 sticky left-0 bg-[#0A1121] z-10 border-r border-slate-700">MU / Categoria</th>
                         <th className="px-4 py-4 text-right">Produto (s/Frete)</th>
                         <th className="px-4 py-4 text-center border-l border-slate-700">Entrega</th>
                         <th className="px-4 py-4 text-right">Frete Cob.</th>
                         <th className="px-4 py-4 text-right">Frete Custo</th>
                         <th className="px-4 py-4 text-right">Dif. Frete</th>
                         <th className="px-4 py-4 text-right border-l border-slate-700 text-amber-500" title="Split ABC (25% do lucro frete televendas)">Part. ABC</th>
                         <th className="px-4 py-4 text-center border-l border-slate-700 min-w-[140px]">Pagamento</th>
                         <th className="px-4 py-4 text-right">Custo Fin.</th>
                         <th className="px-4 py-4 text-right">Royalties</th>
                         <th className="px-4 py-4 text-right bg-slate-800 text-white border-l border-slate-700 cursor-pointer" title="Clique no item para ver memória de cálculo">Resultado Calc.</th>
                         <th className="px-4 py-4 text-right bg-slate-800 text-white">Diferença R$</th>
                         <th className="px-4 py-4 text-right bg-slate-800 text-white">Diferença %</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {items.map(item => {
                         let colorFrete = 'text-slate-300';
                         if (Math.abs(item.diffFrete) < 0.05) colorFrete = 'text-emerald-600 bg-emerald-50/50';
                         else if (item.diffFrete > 0) colorFrete = 'text-blue-600 bg-blue-50/50 font-black'; 
                         else colorFrete = 'text-[#E30613] bg-red-50/50 font-black'; 

                         const vendaProduto = Math.max(0, item.totalVenda - item.freteCobrado);
                         const isTelevendas = item.categoria === 'TELEVENDAS';

                         // Cor Resultado Final
                         const resultColor = item.statusResultado === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600 animate-pulse';

                         return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors text-[10px]">
                               <td className="px-4 py-3 font-black text-slate-900 sticky left-0 bg-white border-r border-slate-100">
                                  <div>{item.mu}</div>
                                  <div className={`mt-1 text-[8px] px-1.5 py-0.5 rounded w-fit uppercase ${isTelevendas ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                     {item.categoria} ({item.margemPlanilhaPct.toFixed(1)}%)
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-right font-bold text-slate-600">
                                 {formatCurrency(vendaProduto)}
                                 <div className="text-[8px] text-slate-400 font-normal">Total: {formatCurrency(item.totalVenda)}</div>
                               </td>
                               
                               <td className="px-4 py-3 text-center border-l border-slate-100">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-bold text-slate-400">{item.peso}kg</span>
                                    <select 
                                      className="bg-slate-100 rounded-lg px-2 py-1 text-[8px] font-black uppercase outline-none w-full"
                                      value={item.tipoEntrega}
                                      onChange={(e) => updateItem(item.id, { tipoEntrega: e.target.value as any })}
                                    >
                                       <option value="LOJA">Loja</option>
                                       <option value="CLIENTE">Cliente</option>
                                    </select>
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-right font-bold text-slate-600">{formatCurrency(item.freteCobrado)}</td>
                               <td className="px-4 py-3 text-right text-slate-400">{formatCurrency(item.freteTeorico)}</td>
                               <td className={`px-4 py-3 text-right ${colorFrete}`} title={item.diffFrete < 0 ? "Vermelho = Loja Pagou Frete (Subsídio)" : "Azul = Lucro no Frete"}>
                                  {formatCurrency(item.diffFrete)}
                               </td>
                               <td className="px-4 py-3 text-right border-l border-slate-100 text-amber-600 font-bold bg-amber-50/20">
                                  {item.splitFreteABC > 0 ? `-${formatCurrency(item.splitFreteABC)}` : '-'}
                               </td>

                               <td className="px-4 py-3 text-center border-l border-slate-100">
                                  <div className="flex gap-2 items-center">
                                     <select 
                                       className={`rounded-lg px-1 py-1 text-[8px] font-black uppercase outline-none w-full cursor-pointer transition-colors ${item.formaPagamentoSelecionada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-400'}`}
                                       value={item.formaPagamentoSelecionada}
                                       onChange={(e) => updateItem(item.id, { formaPagamentoSelecionada: e.target.value })}
                                     >
                                        <option value="">Selecione...</option>
                                        <option value="MISTO">MISTO</option>
                                        {Object.entries(PAYMENT_RATES).map(([k, v]) => (
                                           <option key={k} value={k}>{k.replace('_', ' ')}</option>
                                        ))}
                                     </select>
                                     {item.formaPagamentoSelecionada === 'MISTO' && (
                                        <button onClick={() => openSplitModal(item)} className="p-1 bg-purple-100 text-purple-600 rounded">
                                           <Split className="w-3 h-3" />
                                        </button>
                                     )}
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-right font-bold text-slate-600" title={`Teórico: ${formatCurrency(item.custoFinanceiroTeorico)}`}>
                                 {item.formaPagamentoSelecionada ? formatCurrency(item.custoFinanceiroTeorico) : <span className="text-red-300">--</span>}
                               </td>
                               <td className="px-4 py-3 text-right text-slate-400">
                                  {isTelevendas ? <span className="text-emerald-500 font-bold">ISENTO</span> : formatCurrency(item.royaltiesTeorico)}
                               </td>

                               {/* CLICKABLE CALCULATION RESULT */}
                               <td 
                                  onClick={() => setDetailsModal({ isOpen: true, itemId: item.id })}
                                  className={`px-4 py-3 text-right font-black text-xs border-l border-slate-700 cursor-pointer hover:scale-105 transition-transform ${resultColor}`}
                               >
                                  <div className="flex items-center justify-end gap-2">
                                     {formatCurrency(item.resultadoLiquido)}
                                     <Search className="w-3 h-3 opacity-50" />
                                  </div>
                               </td>

                               <td className={`px-4 py-3 text-right font-bold ${item.statusResultado === 'ok' ? 'text-slate-300' : 'text-[#E30613]'}`}>
                                  {formatCurrency(item.diffResultadoR$)}
                               </td>
                               <td className={`px-4 py-3 text-right font-bold ${item.statusResultado === 'ok' ? 'text-slate-300' : 'text-[#E30613]'}`}>
                                  {item.diffResultadoPct.toFixed(2)}%
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPOSIÇÃO DE PAGAMENTO */}
      {splitModal.isOpen && splitModal.itemId && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 uppercase">Composição de Pagamento</h3>
                  <button onClick={() => setSplitModal({ isOpen: false, itemId: null })}><X className="w-6 h-6 text-slate-400" /></button>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-xl mb-4 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total do Pedido</span>
                  <span className="text-lg font-black text-slate-900">
                     {formatCurrency(items.find(i => i.id === splitModal.itemId)?.totalVenda || 0)}
                  </span>
               </div>

               <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                  {tempSplit.map((split, idx) => (
                     <div key={idx} className="flex gap-2 items-center">
                        <select 
                           value={split.method} 
                           onChange={e => updateSplitRow(idx, 'method', e.target.value)}
                           className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none uppercase"
                        >
                           <option value="">Selecione...</option>
                           {Object.entries(PAYMENT_RATES).map(([k, v]) => (
                              <option key={k} value={k}>{k.replace('_', ' ')} ({v}%)</option>
                           ))}
                        </select>
                        <input 
                           type="number" 
                           value={split.value} 
                           onChange={e => updateSplitRow(idx, 'value', parseFloat(e.target.value))}
                           className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none text-right"
                        />
                        <button onClick={() => removeSplitRow(idx)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  ))}
                  <button onClick={addSplitRow} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-[10px] uppercase hover:bg-slate-50 flex items-center justify-center gap-2">
                     <Plus className="w-3 h-3" /> Adicionar Parcela
                  </button>
               </div>

               <div className="flex justify-between items-center px-4 py-3 bg-slate-100 rounded-xl mb-6">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total Composto</span>
                  <span className={`text-sm font-black ${Math.abs((items.find(i => i.id === splitModal.itemId)?.totalVenda || 0) - tempSplit.reduce((a,b)=>a+b.value,0)) < 0.05 ? 'text-emerald-600' : 'text-red-500'}`}>
                     {formatCurrency(tempSplit.reduce((a, b) => a + (b.value || 0), 0))}
                  </span>
               </div>

               <button onClick={saveSplit} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Salvar Composição
               </button>
            </div>
         </div>
      )}

      {/* NOVO MODAL: MEMÓRIA DE CÁLCULO DETALHADA */}
      {detailsModal.isOpen && detailsModal.itemId && getDetailItem() && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-lg animate-in fade-in">
            <div className="bg-[#0A1121] text-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 border border-slate-800 relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                     <p className="text-[#E30613] font-black uppercase text-[10px] tracking-[0.3em] mb-2">Memória de Cálculo</p>
                     <h3 className="text-3xl font-black tracking-tighter">Pedido MU {getDetailItem()?.mu}</h3>
                     <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold uppercase">{getDetailItem()?.categoria}</span>
                        <span className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold uppercase">{getDetailItem()?.tipoEntrega}</span>
                     </div>
                  </div>
                  <button onClick={() => setDetailsModal({ isOpen: false, itemId: null })} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
               </div>

               <div className="space-y-6 relative z-10">
                  {/* SEÇÃO 1: PRODUTO */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black uppercase text-slate-400">1. Base Produto (Margem % Aplicada)</span>
                        <span className="text-emerald-400 font-black">{formatCurrency(getDetailItem()!.receitaBaseProduto)}</span>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Venda Líq. (Sem Frete): {formatCurrency(getDetailItem()!.totalVenda - getDetailItem()!.freteCobrado)}</span>
                        <span>Margem: {getDetailItem()!.categoria === 'TELEVENDAS' ? '8%' : getDetailItem()!.margemPlanilhaPct.toFixed(1)+'%'}</span>
                     </div>
                  </div>

                  {/* SEÇÃO 2: FRETE DETALHADO */}
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black uppercase text-slate-400">2. Resultado Frete (Cobrado - Custo)</span>
                        <span className={getDetailItem()!.saldoFreteFinal >= 0 ? 'text-blue-400 font-black' : 'text-red-400 font-black'}>
                           {getDetailItem()!.saldoFreteFinal >= 0 ? '+' : ''}{formatCurrency(getDetailItem()!.saldoFreteFinal)}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 mt-2">
                        <div>
                           <p className="uppercase font-bold text-slate-400">Cálculo Custo ({getDetailItem()!.tipoEntrega}):</p>
                           <p>Peso: {getDetailItem()!.peso}kg</p>
                           <p>Tabela: {formatCurrency(getDetailItem()!.freteTeorico)}</p>
                        </div>
                        <div className="text-right">
                           <p className="uppercase font-bold text-slate-400">Cobrança:</p>
                           <p>Cobrado Cliente: {formatCurrency(getDetailItem()!.freteCobrado)}</p>
                           <p>Diferença Bruta: {formatCurrency(getDetailItem()!.diffFrete)}</p>
                           {getDetailItem()!.splitFreteABC > 0 && <p className="text-amber-500">Split ABC (25%): -{formatCurrency(getDetailItem()!.splitFreteABC)}</p>}
                        </div>
                     </div>
                     {getDetailItem()!.diffFrete < 0 && (
                        <p className="text-[9px] text-[#E30613] mt-2 italic">* Valor em vermelho indica custo absorvido pela loja (Subsídio de frete).</p>
                     )}
                  </div>

                  {/* SEÇÃO 3: DEDUÇÕES */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-black uppercase text-slate-400">3. Financeiro</span>
                           <span className="text-red-400 font-black">-{formatCurrency(getDetailItem()!.custoFinanceiroTeorico)}</span>
                        </div>
                        <p className="text-[9px] text-slate-500">Taxa Média: {getDetailItem()!.taxaTeoricaPct.toFixed(2)}%</p>
                     </div>
                     <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-black uppercase text-slate-400">4. Royalties</span>
                           <span className="text-red-400 font-black">-{formatCurrency(getDetailItem()!.royaltiesTeorico)}</span>
                        </div>
                        <p className="text-[9px] text-slate-500">{getDetailItem()!.categoria === 'TELEVENDAS' ? 'Isento (Televendas)' : '3% sobre Produto'}</p>
                     </div>
                  </div>
               </div>

               <div className="mt-8 pt-8 border-t border-slate-800 flex justify-between items-end relative z-10">
                  <div>
                     <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Comparativo Final</p>
                     <div className="flex gap-4">
                        <div className="text-left">
                           <p className="text-[9px] text-slate-400">CALCULADO</p>
                           <p className="text-2xl font-black text-white">{formatCurrency(getDetailItem()!.resultadoLiquido)}</p>
                        </div>
                        <div className="text-left opacity-50">
                           <p className="text-[9px] text-slate-400">PLANILHA ("Margem líq. c/ frete")</p>
                           <p className="text-xl font-black text-white">{formatCurrency(getDetailItem()!.margemPlanilhaR$)}</p>
                        </div>
                     </div>
                  </div>
                  <div className={`px-6 py-3 rounded-xl font-black uppercase text-sm ${getDetailItem()!.statusResultado === 'ok' ? 'bg-emerald-500 text-white' : 'bg-[#E30613] text-white'}`}>
                     {getDetailItem()!.statusResultado === 'ok' ? 'Valores Batem' : 'Divergência'}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
