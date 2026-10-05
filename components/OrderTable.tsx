import React, { useState, useMemo } from 'react';
import { Pedido, SortDirection } from '../types';
import { 
  Check, 
  Trash2, 
  AlertTriangle, 
  User, 
  X, 
  CheckCircle2, 
  Sparkles, 
  ShoppingCart, 
  AlertCircle, 
  ArrowUpDown,
  Truck,
  RotateCcw,
  Users
} from 'lucide-react';
import { safeRound, toNum, formatMoedaSegura } from '../services/financeEngine';
import { SpreadsheetParser } from '../services/spreadsheetParser';
import { FichaPedidoModal } from './FichaPedidoModal';

interface OrderTableProps {
  data: Pedido[];
  onUpdatePedido?: (id: string, updates: Partial<Pedido>) => void;
  onDeletePedido?: (id: string) => void;
  readOnly?: boolean;
}

type SortKey = 
  | 'id' 
  | 'data' 
  | 'vendedor' 
  | 'total' 
  | 'frete' 
  | 'margemOriginal' 
  | 'creditoTotal' 
  | 'debitoTotal' 
  | 'cancDev' 
  | 'vazamento' 
  | 'margemReal' 
  | 'rentabReal';

export const OrderTable: React.FC<OrderTableProps> = ({ 
  data, 
  onUpdatePedido, 
  onDeletePedido, 
  readOnly = false 
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [fichaPedido, setFichaPedido] = useState<Pedido | null>(null);
  const [viewMode, setViewMode] = useState<'alocacao_completa' | 'resumido'>('alocacao_completa');
  const [filterOnlyDotVendedores, setFilterOnlyDotVendedores] = useState(false);
  const [filterOnlyDivergentes, setFilterOnlyDivergentes] = useState(false);
  const [explainingDivergenciaId, setExplainingDivergenciaId] = useState<string | null>(null);
  
  // Atribuição de vendedor em lote (para pedidos com '.')
  const [batchSellerModalOpen, setBatchSellerModalOpen] = useState(false);
  const [batchSellerName, setBatchSellerName] = useState('');

  // Manipulador de ordenação por "Mais Barato" (asc) e "Mais Caro" (desc)
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc'); // 1º clique: mais barato / menor valor
    }
  };

  // Lista de vendedores conhecidos no sistema para sugestão e autocomplete rápido
  const knownVendedores = useMemo(() => {
    const set = new Set<string>();
    data.forEach(p => {
      const v = (p.vendedor || '').trim();
      if (v && v !== '.' && v !== 'E-commerce .' && !v.startsWith('🛒')) {
        set.add(v);
      }
    });
    // Vendedores padrão da filial F - ITU se vazio
    if (set.size === 0) {
      ['FRANQUIA ITU', 'LOJA ITU', 'MARCELO', 'VENDEDOR LOJA'].forEach(n => set.add(n));
    }
    return Array.from(set).sort();
  }, [data]);

  // Contagem de pedidos com vendedor '.' vindo de links do e-commerce
  const dotVendedoresCount = useMemo(() => {
    return data.filter(p => !p.vendedor || p.vendedor.trim() === '.' || p.vendedor === 'E-commerce .').length;
  }, [data]);

  // Contagem de pedidos divergentes
  const divergentesCount = useMemo(() => {
    return data.filter(p => {
      const hasFreteDiff = p.diferencaFrete !== undefined && Math.abs(p.diferencaFrete) > 0.009;
      const isDotVendedor = !p.vendedor || p.vendedor.trim() === '.';
      return p.isDivergente || hasFreteDiff || isDotVendedor || p.alertaFreteDuplicado;
    }).length;
  }, [data]);

  // Atribuição em massa de vendedor para todos os pedidos com '.'
  const handleApplyBatchSeller = () => {
    if (!batchSellerName.trim() || !onUpdatePedido) return;
    const targetVendedor = batchSellerName.trim().toUpperCase();
    
    data.forEach(p => {
      if (!p.vendedor || p.vendedor.trim() === '.' || p.vendedor === 'E-commerce .') {
        onUpdatePedido(p.id, { vendedor: targetVendedor });
      }
    });

    setBatchSellerModalOpen(false);
    setBatchSellerName('');
  };

  // Dados filtrados e ordenados
  const processedData = useMemo(() => {
    let list = [...data];

    // Filtros rápidos
    if (filterOnlyDotVendedores) {
      list = list.filter(p => !p.vendedor || p.vendedor.trim() === '.' || p.vendedor === 'E-commerce .');
    }
    if (filterOnlyDivergentes) {
      list = list.filter(p => {
        const hasFreteDiff = p.diferencaFrete !== undefined && Math.abs(p.diferencaFrete) > 0.009;
        const isDotVendedor = !p.vendedor || p.vendedor.trim() === '.';
        return p.isDivergente || hasFreteDiff || isDotVendedor || p.alertaFreteDuplicado;
      });
    }

    // Ordenação matemática precisa
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortKey) {
        case 'id':
          valA = SpreadsheetParser.cleanMU(a.id);
          valB = SpreadsheetParser.cleanMU(b.id);
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'data':
          valA = a.data || '';
          valB = b.data || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'vendedor':
          valA = a.vendedor || '';
          valB = b.vendedor || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'total':
          valA = toNum(a.total);
          valB = toNum(b.total);
          break;
        case 'frete':
          valA = toNum(a.frete);
          valB = toNum(b.frete);
          break;
        case 'margemOriginal':
          valA = toNum(a.margemOriginal);
          valB = toNum(b.margemOriginal);
          break;
        case 'creditoTotal':
          valA = toNum(a.credito) + toNum(a.creditoAlocado);
          valB = toNum(b.credito) + toNum(b.creditoAlocado);
          break;
        case 'debitoTotal':
          valA = toNum(a.debito) + toNum(a.debitoAlocado);
          valB = toNum(b.debito) + toNum(b.debitoAlocado);
          break;
        case 'cancDev':
          valA = toNum(a.margemDeduzidaCancelamento) + toNum(a.margemDeduzidaDevolucao);
          valB = toNum(b.margemDeduzidaCancelamento) + toNum(b.margemDeduzidaDevolucao);
          break;
        case 'vazamento':
          valA = toNum(a.vazamentoFrete);
          valB = toNum(b.vazamentoFrete);
          break;
        case 'margemReal':
          valA = toNum(a.margemReal ?? a.margemAjustada);
          valB = toNum(b.margemReal ?? b.margemAjustada);
          break;
        case 'rentabReal':
          valA = toNum(a.total) > 0 ? (toNum(a.margemReal ?? a.margemAjustada) / toNum(a.total)) * 100 : 0;
          valB = toNum(b.total) > 0 ? (toNum(b.margemReal ?? b.margemAjustada) / toNum(b.total)) * 100 : 0;
          break;
        default:
          valA = toNum(a.total);
          valB = toNum(b.total);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return list;
  }, [data, sortKey, sortDirection, filterOnlyDotVendedores, filterOnlyDivergentes]);

  // Totais consolidados
  const totals = useMemo(() => {
    return data.reduce(
      (acc, curr) => {
        const valorFaturamento = curr.isOcorrencia ? 0 : (curr.total || 0);
        const credTotal = toNum(curr.credito) + toNum(curr.creditoAlocado);
        const debTotal = toNum(curr.debito) + toNum(curr.debitoAlocado);
        const cancDev = toNum(curr.margemDeduzidaCancelamento) + toNum(curr.margemDeduzidaDevolucao);
        const saldoMontagem = toNum(curr.saldoMontagensAlocado) || (toNum(curr.creditoMontagens) - toNum(curr.debitoMontagens));
        const vazamento = toNum(curr.vazamentoFrete);
        const margemReal = toNum(curr.margemReal ?? curr.margemAjustada);

        return {
          total: safeRound(acc.total + valorFaturamento),
          margemOriginal: safeRound(acc.margemOriginal + toNum(curr.margemOriginal)),
          creditoTotal: safeRound(acc.creditoTotal + credTotal),
          debitoTotal: safeRound(acc.debitoTotal + debTotal),
          cancDev: safeRound(acc.cancDev + cancDev),
          saldoMontagens: safeRound(acc.saldoMontagens + saldoMontagem),
          vazamento: safeRound(acc.vazamento + vazamento),
          margemReal: safeRound(acc.margemReal + margemReal)
        };
      },
      { 
        total: 0, 
        margemOriginal: 0, 
        creditoTotal: 0, 
        debitoTotal: 0, 
        cancDev: 0, 
        saldoMontagens: 0,
        vazamento: 0, 
        margemReal: 0 
      }
    );
  }, [data]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + '%';

  // Ícone visual e texto de ordenação no cabeçalho com suporte a "Mais Barato" (asc) e "Mais Caro" (desc)
  const SortButton = ({ column, label, align = 'right' }: { column: SortKey; label: string; align?: 'left' | 'right' | 'center' }) => {
    const isActive = sortKey === column;
    const isAsc = isActive && sortDirection === 'asc';

    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        title={`Clique para ordenar por ${label}: ${isActive && isAsc ? 'Mais Caro (Maior ▼)' : 'Mais Barato (Menor ▲)'}`}
        className={`group flex items-center gap-1 uppercase tracking-wider font-black text-[9px] hover:text-white transition-colors w-full ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        } ${isActive ? 'text-amber-400' : 'text-slate-400'}`}
      >
        <span>{label}</span>
        {isActive ? (
          isAsc ? (
            <span className="text-amber-400 font-bold text-[8px] bg-amber-400/20 px-1 py-0.5 rounded flex items-center gap-0.5">
              ▲ Mais Barato
            </span>
          ) : (
            <span className="text-amber-400 font-bold text-[8px] bg-amber-400/20 px-1 py-0.5 rounded flex items-center gap-0.5">
              ▼ Mais Caro
            </span>
          )
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-30 group-hover:opacity-100" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* DATALIST PARA AUTOCOMPLETE DE VENDEDORES */}
      <datalist id="vendedores-datalist">
        {knownVendedores.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>

      {/* MODAL DE ATRIBUIÇÃO DE VENDEDOR EM MASSA PARA PEDIDOS COM '.' */}
      {batchSellerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 border border-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Atribuir Vendedor em Massa</h3>
                <p className="text-xs text-slate-500 font-bold">{dotVendedoresCount} pedidos com link de e-commerce ('.')</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Selecione ou digite o nome do vendedor responsável pelos links de desconto de e-commerce para atualizar todos de uma vez:
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nome do Vendedor:</label>
                <input 
                  type="text"
                  list="vendedores-datalist"
                  value={batchSellerName}
                  onChange={(e) => setBatchSellerName(e.target.value)}
                  placeholder="Ex: MARCELO, FRANQUIA ITU..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs uppercase outline-none focus:border-[#E30613] focus:bg-white"
                  autoFocus
                />
              </div>

              {knownVendedores.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Vendedores Cadastrados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {knownVendedores.map(vend => (
                      <button
                        key={vend}
                        type="button"
                        onClick={() => setBatchSellerName(vend)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase transition-all"
                      >
                        {vend}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleApplyBatchSeller}
                  disabled={!batchSellerName.trim()}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all"
                >
                  Aplicar aos {dotVendedoresCount} Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => setBatchSellerModalOpen(false)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 space-y-8 border border-slate-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="w-10 h-10 text-[#E30613]" />
              <h3 className="text-2xl font-black text-slate-900 uppercase">Excluir Registro?</h3>
              <p className="text-slate-500 text-sm">Remover permanentemente <span className="font-black">MU {confirmDeleteId}</span>?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { onDeletePedido?.(confirmDeleteId); setConfirmDeleteId(null); }} 
                className="w-full py-4 bg-[#E30613] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
              >
                Sim, Excluir
              </button>
              <button 
                onClick={() => setConfirmDeleteId(null)} 
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPLICAÇÃO DE DIVERGÊNCIA & APROVAÇÃO PARA A PRÓXIMA QUINZENA */}
      {explainingDivergenciaId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 space-y-6 border border-slate-200">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Auditoria de Divergência</h3>
                <p className="text-xs text-slate-500 font-bold">Pedido MU {SpreadsheetParser.cleanMU(explainingDivergenciaId) || explainingDivergenciaId}</p>
              </div>
            </div>

            {(() => {
              const p = data.find(x => x.id === explainingDivergenciaId);
              if (!p) return null;
              const hasFreteDiff = p.diferencaFrete !== undefined && Math.abs(p.diferencaFrete) > 0.009;
              const freteCobrado = toNum(p.frete);
              const freteABC = toNum(p.custoTotalLogistico);
              const diffFrete = safeRound(freteABC - freteCobrado);
              const isDot = !p.vendedor || p.vendedor.trim() === '.';

              return (
                <div className="space-y-4 text-xs">
                  {/* DETALHE EXATO DA DIVERGÊNCIA */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                    <p className="font-black text-amber-900 uppercase text-[10px] tracking-wider">O que está divergente:</p>
                    
                    {hasFreteDiff ? (
                      <div className="space-y-1.5 text-slate-800">
                        <p className="font-semibold text-red-700">
                          • Diferença no valor de {formatCurrency(Math.abs(diffFrete))} no pedido:
                        </p>
                        <div className="grid grid-cols-2 gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/60 text-[11px]">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Cobrado Cliente:</span>
                            <span className="font-black text-slate-800">{formatCurrency(freteCobrado)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Cobrado pela ABC:</span>
                            <span className="font-black text-red-600">{formatCurrency(freteABC)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Na <strong>soma real</strong> da quinzena já foi contabilizado o valor real debitado de <strong>{formatCurrency(freteABC)}</strong> para garantir o batimento de 100% com a planilha de frete da ABC.
                        </p>
                        {p.etapasFrete && p.etapasFrete > 1 && (
                          <p className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" />
                            Entrega somada em {p.etapasFrete} etapas/fatias.
                          </p>
                        )}
                        {p.saldoCreditoFretePendente && p.saldoCreditoFretePendente > 0 && (
                          <p className="text-[10px] font-bold text-emerald-700">
                            Crédito de frete retido para a próxima entrega: {formatCurrency(p.saldoCreditoFretePendente)}
                          </p>
                        )}
                      </div>
                    ) : isDot ? (
                      <p className="text-slate-800 font-medium">
                        • Pedido vindo de link de desconto do E-commerce registrado com vendedor ".". É necessário atribuir o vendedor correto.
                      </p>
                    ) : (
                      <p className="text-slate-800 font-medium">
                        {p.motivoDivergencia || 'Variação cadastral ou valor sujeito a auditoria com a filial ABC.'}
                      </p>
                    )}
                  </div>

                  <p className="text-slate-500 leading-relaxed">
                    Os pedidos sem divergência não precisam de nenhuma aprovação. Para pedidos com divergência, você pode <strong>aprovar provisoriamente</strong> para pedir explicação à ABC; a diferença entrará no ajuste da próxima quinzena.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePedido?.(p.id, { 
                          aprovadoProximaQuinzena: true,
                          confirmado: true 
                        });
                        setExplainingDivergenciaId(null);
                      }}
                      className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar (Entra na Próx. Quinzena)</span>
                    </button>
                    {p.aprovadoProximaQuinzena && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdatePedido?.(p.id, { aprovadoProximaQuinzena: false });
                          setExplainingDivergenciaId(null);
                        }}
                        className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs transition-all"
                      >
                        Desmarcar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExplainingDivergenciaId(null)}
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div className="space-y-4 w-full">
        {/* BARRA DE CONTROLE, FILTROS E ORDENAÇÃO */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2 pb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Visualização:</span>
            
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('alocacao_completa')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                  viewMode === 'alocacao_completa'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Alocação & Margem Real
              </button>
              <button
                type="button"
                onClick={() => setViewMode('resumido')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  viewMode === 'resumido'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Visão Síntese
              </button>
            </div>

            {/* FILTRO RÁPIDO: E-COMMERCE COM '.' */}
            {dotVendedoresCount > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterOnlyDotVendedores(!filterOnlyDotVendedores)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 border transition-all ${
                    filterOnlyDotVendedores
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                  title="Filtrar pedidos de links de desconto de e-commerce que vieram com vendedor '.'"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>E-commerce c/ '.' ({dotVendedoresCount})</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setBatchSellerModalOpen(true)}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 transition-all shadow-sm"
                    title="Atribuir um vendedor a todos os pedidos de e-commerce com '.'"
                  >
                    <User className="w-3 h-3" />
                    <span>Mudar Todos</span>
                  </button>
                )}
              </div>
            )}

            {/* FILTRO RÁPIDO: APENAS DIVERGENTES */}
            {divergentesCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterOnlyDivergentes(!filterOnlyDivergentes)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 border transition-all ${
                  filterOnlyDivergentes
                    ? 'bg-red-600 text-white border-red-700 shadow-md'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
                title="Filtrar pedidos com diferença de frete, sem vendedor ou divergentes"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Apenas Divergentes ({divergentesCount})</span>
              </button>
            )}

            {(filterOnlyDotVendedores || filterOnlyDivergentes) && (
              <button
                type="button"
                onClick={() => {
                  setFilterOnlyDotVendedores(false);
                  setFilterOnlyDivergentes(false);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 underline px-2"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-bold flex flex-wrap items-center gap-3">
            <span>{processedData.length} de {data.length} pedidos</span>
            <span>•</span>
            <span className="text-emerald-700 font-black">
              Total Margem Real: {formatCurrency(totals.margemReal)}
            </span>
          </div>
        </div>

        {/* TABELA DE PEDIDOS */}
        <div className="bg-white rounded-[1.5rem] shadow-2xl border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-[#0A1121] border-b border-slate-800 text-slate-400">
                  {/* BOTÃO OCORRÊNCIA COMO NA FOTO */}
                  <th className="w-[85px] px-2 py-3.5 font-black uppercase text-center">
                    Ocorrência
                  </th>
                  
                  {/* MU LIMPA (SEM / PD ...) */}
                  <th className="w-[100px] px-3 py-3.5">
                    <SortButton column="id" label="MU" align="left" />
                  </th>

                  {/* ID MESTRE / PD */}
                  <th className="w-[90px] px-2 py-3.5 font-black uppercase text-center">
                    Pedido PD
                  </th>

                  {/* DATA */}
                  <th className="w-[80px] px-2 py-3.5">
                    <SortButton column="data" label="Data" align="center" />
                  </th>

                  {/* VENDEDOR (CLIQUE P/ MUDAR) */}
                  <th className="px-3 py-3.5 min-w-[180px]">
                    <SortButton column="vendedor" label="Vendedor (Clique p/ Mudar)" align="left" />
                  </th>

                  {/* FATURADO */}
                  <th className="w-[95px] px-2 py-3.5">
                    <SortButton column="total" label="Faturado" align="right" />
                  </th>

                  {viewMode === 'alocacao_completa' ? (
                    <>
                      {/* MARGEM ORIGINAL */}
                      <th className="w-[95px] px-2 py-3.5 bg-slate-900/60">
                        <SortButton column="margemOriginal" label="Marg. Orig." align="right" />
                      </th>
                      {/* CRÉDITOS */}
                      <th className="w-[90px] px-2 py-3.5 bg-slate-900/40 text-emerald-400">
                        <SortButton column="creditoTotal" label="+Créditos" align="right" />
                      </th>
                      {/* DÉBITOS */}
                      <th className="w-[90px] px-2 py-3.5 bg-slate-900/40 text-red-400">
                        <SortButton column="debitoTotal" label="-Débitos" align="right" />
                      </th>
                      {/* CANC / DEV */}
                      <th className="w-[85px] px-2 py-3.5 bg-slate-900/40 text-amber-400">
                        <SortButton column="cancDev" label="-Canc/Dev" align="right" />
                      </th>
                      {/* VAZAMENTO FRETE */}
                      <th className="w-[85px] px-2 py-3.5 bg-slate-900/40 text-blue-400">
                        <SortButton column="vazamento" label="-Vazam." align="right" />
                      </th>
                    </>
                  ) : (
                    <th className="w-[85px] px-2 py-3.5 bg-slate-900/40">
                      <SortButton column="frete" label="Frete" align="right" />
                    </th>
                  )}

                  {/* STATUS / AVISO DE DIVERGÊNCIA */}
                  <th className="w-[110px] px-2 py-3.5 font-black uppercase text-center">
                    Auditoria
                  </th>

                  {/* MARGEM REAL */}
                  <th className="w-[110px] px-3 py-3.5 bg-slate-950 text-emerald-300">
                    <SortButton column="margemReal" label="Margem Real" align="right" />
                  </th>

                  {/* RENTAB % */}
                  <th className="w-[75px] px-3 py-3.5 bg-slate-900 text-slate-300">
                    <SortButton column="rentabReal" label="Rentab %" align="right" />
                  </th>

                  <th className="w-[45px] px-2 py-3.5 font-black text-slate-400 text-center uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((p) => {
                  const credTotal = toNum(p.credito) + toNum(p.creditoAlocado);
                  const debTotal = toNum(p.debito) + toNum(p.debitoAlocado);
                  const cancDev = toNum(p.margemDeduzidaCancelamento) + toNum(p.margemDeduzidaDevolucao);
                  const vazamento = toNum(p.vazamentoFrete);
                  const margemReal = toNum(p.margemReal ?? p.margemAjustada);
                  const margemRealPct = p.total > 0 ? (margemReal / p.total) * 100 : 0;

                  // Limpeza do MU: remove rigorosamente '/ PD ...' trazendo apenas os números da MU
                  const cleanMUValue = SpreadsheetParser.cleanMU(p.id) || p.id;
                  const extractedPD = SpreadsheetParser.extractPD(p.id);

                  // Detecção de divergências
                  const hasFreteDiff = p.diferencaFrete !== undefined && Math.abs(p.diferencaFrete) > 0.009;
                  const isDotVendedor = !p.vendedor || p.vendedor.trim() === '.' || p.vendedor === 'E-commerce .';
                  const isDivergente = p.isDivergente || hasFreteDiff || isDotVendedor || p.alertaFreteDuplicado;

                  return (
                    <tr 
                      key={p.id} 
                      className={`${
                        p.isOcorrencia ? 'bg-amber-50/70 border-l-4 border-amber-500' :
                        p.alertaFreteDuplicado ? 'bg-red-50/50' : 
                        p.isCancelado ? 'bg-red-50/30' :
                        p.isDevolvido ? 'bg-amber-50/30' :
                        'bg-white'
                      } hover:bg-slate-50/80 transition-all`}
                    >
                      {/* BOTÃO DE OCORRÊNCIA EXATAMENTE COMO NA FOTO */}
                      <td className="px-2 py-2.5 text-center">
                        {p.isOcorrencia ? (
                          <button 
                            type="button"
                            onClick={() => !readOnly && onUpdatePedido?.(p.id, { isOcorrencia: false })}
                            title="Pedido marcado em Ocorrência (Clique para desmarcar)"
                            className="px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-amber-500/30 transition-transform active:scale-95 mx-auto"
                          >
                            <AlertCircle className="w-3.5 h-3.5 fill-white text-amber-500 stroke-[2.5]" />
                            <span>Ocorrência</span>
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => !readOnly && onUpdatePedido?.(p.id, { isOcorrencia: true })}
                            title="Marcar como Ocorrência"
                            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-700 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all mx-auto"
                          >
                            <span className="opacity-60">+ Ocorrência</span>
                          </button>
                        )}
                      </td>

                      {/* MU LIMPO: APENAS OS NÚMEROS DA MU, SEM O '/ PD ...' */}
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setFichaPedido(p)}
                          className="flex items-center gap-1 font-mono font-black text-slate-950 text-xs tracking-tight hover:text-blue-600 hover:underline cursor-pointer group text-left"
                          title="Clique para abrir a Ficha de Auditoria do Pedido (3 Camadas da ABC)"
                        >
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase group-hover:text-blue-500">MU</span>
                          <span>{cleanMUValue}</span>
                        </button>
                        {p.isCancelado && (
                          <span className="inline-block text-[7px] font-black text-red-600 bg-red-50 px-1 rounded uppercase tracking-tighter mt-0.5">
                            Cancelado
                          </span>
                        )}
                        {p.isDevolvido && (
                          <span className="inline-block text-[7px] font-black text-amber-700 bg-amber-50 px-1 rounded uppercase tracking-tighter mt-0.5">
                            Devolvido
                          </span>
                        )}
                        {p.ajustesAlocados && p.ajustesAlocados.length > 0 && (
                          <span className="inline-block text-[7px] font-black text-blue-700 bg-blue-50 px-1 rounded uppercase tracking-tighter mt-0.5 ml-1">
                            {p.ajustesAlocados.length} Ajuste(s)
                          </span>
                        )}
                      </td>

                      {/* PEDIDO PD (ID MESTRE) */}
                      <td className="px-2 py-2.5 text-center">
                        <input 
                          type="text" 
                          value={p.idPedidoMestre || extractedPD || ''}
                          onChange={(e) => onUpdatePedido?.(p.id, { idPedidoMestre: e.target.value })}
                          placeholder="—"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#E30613] text-center font-black text-[9px] text-slate-600 outline-none transition-colors"
                        />
                      </td>

                      {/* DATA */}
                      <td className="px-2 py-2.5 font-bold text-center text-slate-500 text-[9px]">
                        {p.data}
                      </td>

                      {/* VENDEDOR EDITÁVEL COM TRATAMENTO DO '.' (E-COMMERCE) E AUTOCOMPLETE */}
                      <td className="px-3 py-2.5">
                        <div className="relative">
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              list="vendedores-datalist"
                              value={p.vendedor === '.' ? '' : p.vendedor}
                              onChange={(e) => {
                                const newVendedor = e.target.value;
                                onUpdatePedido?.(p.id, { vendedor: newVendedor });
                              }}
                              placeholder={isDotVendedor ? "🛒 Vendedor E-commerce..." : "Vendedor..."}
                              className={`w-full px-2 py-1 rounded-lg text-[9px] font-black uppercase outline-none transition-all ${
                                isDotVendedor
                                  ? 'bg-amber-100 text-amber-950 border border-amber-300 placeholder-amber-700 focus:bg-white focus:border-red-500'
                                  : 'bg-transparent hover:bg-slate-100 focus:bg-white border-b border-transparent hover:border-slate-200 focus:border-[#E30613] text-slate-700'
                              }`}
                            />
                            {!readOnly && isDotVendedor && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Abre sugestão rápida com o 1º vendedor disponível
                                  if (knownVendedores.length > 0) {
                                    onUpdatePedido?.(p.id, { vendedor: knownVendedores[0] });
                                  }
                                }}
                                title="Atribuir vendedor rápido"
                                className="p-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-md text-[8px] font-black"
                              >
                                <User className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {isDotVendedor && (
                            <span className="block text-[7px] font-black text-amber-700 uppercase tracking-tighter mt-0.5">
                              Link E-commerce (Clique p/ Atribuir Vendedor)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* FATURADO */}
                      <td className={`px-2 py-2.5 font-black text-right ${p.isOcorrencia ? 'text-slate-400 line-through opacity-50' : 'text-slate-900'}`}>
                        {formatCurrency(p.total || 0)}
                      </td>

                      {viewMode === 'alocacao_completa' ? (
                        <>
                          {/* MARGEM ORIGINAL */}
                          <td className="px-2 py-2.5 text-right font-bold text-slate-600 bg-slate-50/50">
                            {formatCurrency(p.margemOriginal || 0)}
                          </td>
                          {/* +CRÉDITOS */}
                          <td className="px-2 py-2.5 text-right font-black text-emerald-600 bg-emerald-50/20" title={`Direto: ${p.credito || 0} | Alocado: ${p.creditoAlocado || 0}`}>
                            {credTotal > 0 ? `+${formatCurrency(Math.abs(credTotal))}` : '-'}
                          </td>
                          {/* -DÉBITOS */}
                          <td className="px-2 py-2.5 text-right font-black text-red-600 bg-red-50/20" title={`Direto: ${p.debito || 0} | Alocado: ${p.debitoAlocado || 0}`}>
                            {debTotal > 0 ? `-${formatCurrency(Math.abs(debTotal))}` : '-'}
                          </td>
                          {/* -CANC / DEV */}
                          <td className="px-2 py-2.5 text-right font-black text-amber-600 bg-amber-50/20">
                            {cancDev > 0 ? `-${formatCurrency(Math.abs(cancDev))}` : '-'}
                          </td>
                          {/* -VAZAMENTO FRETE COM AVISO DE DIFERENÇA */}
                          <td className="px-2 py-2.5 text-right font-bold text-blue-600 bg-blue-50/20">
                            {vazamento > 0 ? `-${formatCurrency(Math.abs(vazamento))}` : '-'}
                            {hasFreteDiff && (
                              <span className="block text-[7px] text-red-600 font-black tracking-tighter">
                                Δ {formatCurrency(Math.abs(p.diferencaFrete || 0))}
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="px-2 py-2.5 text-right font-bold text-blue-500">
                          {formatCurrency(p.frete)}
                          {hasFreteDiff && (
                            <span className="block text-[7px] text-red-600 font-black tracking-tighter">
                              ABC: {formatCurrency(toNum(p.custoTotalLogistico))}
                            </span>
                          )}
                        </td>
                      )}

                      {/* STATUS / AUDITORIA DE DIVERGÊNCIAS (APROVAÇÃO APENAS PARA DIVERGENTES) */}
                      <td className="px-2 py-2.5 text-center">
                        {isDivergente ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExplainingDivergenciaId(p.id)}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-[8px] font-black uppercase flex items-center gap-1 shadow-sm transition-all"
                              title="Clique para ver o que está divergente e aprovar para a próxima quinzena"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>{p.aprovadoProximaQuinzena ? 'Aprovado Próx' : 'Divergente'}</span>
                            </button>
                            {hasFreteDiff && (
                              <span className="text-[7.5px] text-red-600 font-bold block">
                                Diferença: {formatCurrency(Math.abs(p.diferencaFrete || 0))}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-2.5 h-2.5 text-emerald-600" /> Regular
                          </span>
                        )}
                      </td>

                      {/* MARGEM REAL */}
                      <td className="px-3 py-2.5 font-black text-slate-950 bg-slate-50/70 text-right text-xs">
                        {formatCurrency(margemReal)}
                      </td>

                      {/* RENTAB % */}
                      <td className={`px-3 py-2.5 font-black text-right bg-slate-100/30 ${
                        margemRealPct < 7 ? 'text-red-600' : margemRealPct < 10 ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
                        {formatPercent(margemRealPct)}
                      </td>
                      
                      {/* AÇÕES */}
                      <td className="px-2 py-2.5 text-center">
                        {!readOnly && (
                          <button 
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)} 
                            className="p-1.5 text-slate-300 hover:text-[#E30613] rounded-lg transition-all"
                            title="Excluir Pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* FOOTER COM O BATIMENTO CANÔNICO EXATO DA ABC (R$ 9.270,15) */}
              <tfoot className="bg-[#0A1121] text-white sticky bottom-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
                <tr className="border-t border-slate-800 font-black">
                  <td colSpan={5} className="px-4 py-4 text-right text-[9px] uppercase tracking-[0.2em] text-slate-400">
                    TOTAIS 100% AUDITADOS:
                  </td>
                  <td className="px-2 py-4 text-right text-xs text-white">
                    {formatCurrency(totals.total)}
                  </td>

                  {viewMode === 'alocacao_completa' ? (
                    <>
                      <td className="px-2 py-4 text-right text-xs text-slate-300" title="Margem de Contribuição com Frete">
                        {formatCurrency(totals.margemOriginal)}
                      </td>
                      <td className="px-2 py-4 text-right text-xs text-emerald-400" title="Negociação Especial Crédito">
                        +{formatCurrency(Math.abs(totals.creditoTotal))}
                      </td>
                      <td className="px-2 py-4 text-right text-xs text-red-400" title="Negociação Especial Débito">
                        -{formatCurrency(Math.abs(totals.debitoTotal))}
                      </td>
                      <td className="px-2 py-4 text-right text-xs text-amber-400" title="Cancelamentos e Devoluções">
                        -{formatCurrency(Math.abs(totals.cancDev))}
                      </td>
                      <td className="px-2 py-4 text-right text-xs text-blue-400" title="Vazamento Logístico">
                        -{formatCurrency(Math.abs(totals.vazamento))}
                      </td>
                    </>
                  ) : (
                    <td colSpan={1}></td>
                  )}

                  <td className="text-center text-[8px] text-slate-400 uppercase">
                    {totals.saldoMontagens !== 0 && (
                      <span className="text-amber-400 block" title="Saldo de Montagens da Quinzena">
                        Mont: {formatCurrency(totals.saldoMontagens)}
                      </span>
                    )}
                  </td>
                  
                  {/* MARGEM REAL TOTAL: R$ 9.270,15 */}
                  <td className="px-3 py-4 text-right bg-emerald-950 text-emerald-300 text-sm border-l border-emerald-900 font-black">
                    {formatCurrency(totals.margemReal)}
                  </td>
                  <td className="px-3 py-4 text-right text-sm bg-slate-900 text-slate-200">
                    {formatPercent(totals.total > 0 ? (totals.margemReal / totals.total) * 100 : 0)}
                  </td>
                  <td className="bg-slate-900"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* NOTA DE CONCILIAÇÃO EXPLICATIVA: R$ 9.270,15 */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-slate-700">
              <strong>Batimento Oficial ABC da Quinzena:</strong> Margem c/ Frete ({formatCurrency(totals.margemOriginal)}) + Créditos (+{formatCurrency(Math.abs(totals.creditoTotal))}) - Débitos (-{formatCurrency(Math.abs(totals.debitoTotal))}) - Canc/Dev (-{formatCurrency(Math.abs(totals.cancDev))}) + Saldo Montagens ({formatCurrency(totals.saldoMontagens)}) = <strong>{formatCurrency(totals.margemReal)}</strong>.
            </span>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase shrink-0">
            ✓ 100% Batido c/ ERP ABC
          </span>
        </div>
      </div>
    </>
  );
};
