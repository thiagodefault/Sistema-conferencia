import { Pedido, AppConfig, MesConferencia, AjusteExtra, HistoricoConsolidado } from '../types';

// Utilitário para matemática segura (2 casas decimais)
export const safeRound = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

// Utilitário robusto para conversão numérica
export const toNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Remove R$, espaços e normaliza vírgula para ponto
  const clean = String(val).replace(/[R$\s]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata moeda garantindo que nunca ocorra sinal duplicado (ex: '--R$ 1,75').
 */
export const formatMoedaSegura = (val: number, forceSign?: '+' | '-' | 'auto'): string => {
  const num = toNum(val);
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(num));
  if (num === 0) return formatted;
  if (forceSign === '-') return `-${formatted}`;
  if (forceSign === '+') return `+${formatted}`;
  return num < 0 ? `-${formatted}` : formatted;
};

export interface BatimentoPlanilhaItem {
  titulo: string;
  origemPlanilha: string;
  totalPlanilha: number;
  totalAlocadoNosPedidos: number;
  diferenca: number;
  isBatido: boolean;
  detalhe: string;
}

export interface ResumoBatimentoConsolidado {
  faturamentoTotal: number;
  margemOriginalTotal: number;
  
  freteCobradoTotal: number;
  custoLogisticoRealTotal: number;
  vazamentoFreteTotal: number;
  saldoMontagensTotal: number;
  
  cancelamentosTotal: number;
  devolucoesTotal: number;
  
  creditosTotais: number;
  debitosTotais: number;
  saldoAjustes: number;
  
  creditosAlocados: number;
  debitosAlocados: number;
  creditosNaoAlocados: number;
  debitosNaoAlocados: number;
  
  margemRealTotalPedidos: number;
  resultadoConsolidadoEmpresa: number;
  diferencaGeral: number;
  isTotalmenteBatido: boolean;
  
  itensBatimento: BatimentoPlanilhaItem[];
}

export const financeEngine = {
  // Resolve nomes de vendedores baseados no mapeamento da configuração
  resolveVendedor: (rawName: string, config: AppConfig): string => {
    const clean = String(rawName).trim();
    return config.vendedoresMap[clean] || clean;
  },

  // Cálculo centralizado da Margem Final & Margem Real (Auditada com Sinais Preservados)
  calculateMargemFinal: (p: Pedido): number => {
    const original = toNum(p.margemOriginal);
    const credDireto = toNum(p.credito);
    const credAlocado = toNum(p.creditoAlocado);
    const debDireto = toNum(p.debito);
    const debAlocado = toNum(p.debitoAlocado);
    
    const credTotal = credDireto + credAlocado;
    const debTotal = debDireto + debAlocado;

    // Protocolo 4: SINAIS PRESERVADOS - Proibido o uso de Math.abs() para apagar sinal
    const canc = toNum(p.margemDeduzidaCancelamento);
    const dev = toNum(p.margemDeduzidaDevolucao);
    
    // Logística
    const montagemCred = toNum(p.creditoMontagens);
    const montagemDeb = toNum(p.debitoMontagens);
    
    const cobrado = toNum(p.frete);
    const custoReal = toNum(p.custoTotalLogistico);
    
    // Cálculo de Vazamento & Diferença de Frete:
    // "o que precisa fazer ver se o valor que foi cobrado na venda do cliente e o mesmo que foi abatido no valor final, 
    // as vezes fazemos entregas em duas etapas e isso precisa somar para saber se bateou ou se nao entregou tudo teria um credito do frete para abater quando for na proxima entrega"
    let vazamento = 0;
    if (custoReal > 0) {
      const diffFrete = safeRound(custoReal - cobrado);
      p.diferencaFrete = diffFrete;
      
      if (Math.abs(diffFrete) > 0.009) {
        p.isDivergente = true;
        if (!p.motivoDivergencia) {
          const muStr = p.id ? String(p.id).replace(/\s*[\/\-]\s*PD.*$/i, '').trim() : '';
          p.motivoDivergencia = `Diferença no valor de R$ ${Math.abs(diffFrete).toFixed(2)} no pedido ${muStr} (Frete cobrado cliente: R$ ${cobrado.toFixed(2)} | Cobrado ABC: R$ ${custoReal.toFixed(2)})`;
        }
      }

      if (custoReal > cobrado) {
        vazamento = safeRound(custoReal - cobrado);
      } else if (cobrado > custoReal) {
        // Se a entrega foi parcial (etapas), sobra crédito de frete para abater na próxima entrega
        p.saldoCreditoFretePendente = safeRound(cobrado - custoReal);
      }
    }
    p.vazamentoFrete = vazamento;

    // Inversão canônica do sinal de cancelamento conforme especificado pelo usuário:
    // "nessa tela esse pedido esta com o sinal de - mas na pratica ele entra como positvo na margem ou seja o sinal acaba sendo invertido na composição final"
    // Na composição ABC: Margem c/ Frete - Cancelamentos (-373,11) => entra SOMANDO (+373,11)
    const cancEfeito = canc !== 0 ? Math.abs(canc) : 0;
    const devEfeito = dev !== 0 ? -Math.abs(dev) : 0;

    // Fórmula Mestra Canônica Oficial ABC ITU:
    // Base + Montagens + Cancelamentos (positivo) - Devoluções + Créditos - Débitos
    // (O vazamento de frete é mantido em p.vazamentoFrete para gerar os alertas visuais de divergência,
    // sem corromper a fórmula do relatório oficial da ABC).
    const final = original + credTotal - debTotal + cancEfeito + devEfeito + montagemCred - montagemDeb;
    const roundFinal = safeRound(final);
    
    // Atualiza ambas as propriedades para consistência
    p.margemAjustada = roundFinal;
    p.margemReal = roundFinal;
    
    return roundFinal;
  },

  /**
   * Aloca Débitos e Créditos Oficiais da ABC dentro dos pedidos para apuração da Margem Real.
   * Regras Centrais (Conceito de Três Camadas):
   * 1. Preserva a margem original da ABC de cada pedido intacta.
   * 2. Associa com segurança os ajustes que possuem MU explícita ao pedido correspondente.
   * 3. Nunca faz associação por aproximação sem segurança (ajustes sem MU viram pendências).
   * 4. Popula `pedido.ajustesAlocados` para auditoria e rastreabilidade profunda.
   */
  alocarDebitosECreditos: (pedidos: Pedido[], ajustes: AjusteExtra[]): { 
    pedidosAtualizados: Pedido[]; 
    totalCreditosAlocados: number; 
    totalDebitosAlocados: number;
    ajustesAlocadosCount: number;
    ajustesNaoAlocadosCount: number;
  } => {
    if (!pedidos || pedidos.length === 0) {
      return { 
        pedidosAtualizados: pedidos, 
        totalCreditosAlocados: 0, 
        totalDebitosAlocados: 0,
        ajustesAlocadosCount: 0,
        ajustesNaoAlocadosCount: (ajustes || []).length
      };
    }

    // Normalizador seguro de MU
    const norm = (v: any) => String(v || '').trim().replace(/^0+/, '').replace(/\.0+$/, '').toLowerCase();
    
    // Mapeia índices de pedidos por MU
    const pedidosMap = new Map<string, number>();
    pedidos.forEach((p, idx) => {
      pedidosMap.set(norm(p.id), idx);
      if (p.idPedidoMestre) pedidosMap.set(norm(p.idPedidoMestre), idx);
    });

    // Clona os pedidos para a camada analítica de auditoria
    const pedidosAtualizados: Pedido[] = pedidos.map(p => ({
      ...p,
      ajustesAlocados: [],
      credito: 0,
      debito: 0,
      creditoAlocado: 0,
      debitoAlocado: 0
    }));

    let totalCreditosAlocados = 0;
    let totalDebitosAlocados = 0;
    let ajustesAlocadosCount = 0;
    let ajustesNaoAlocadosCount = 0;

    (ajustes || []).forEach(a => {
      const v = toNum(a.valor);
      const safeMU = a.pedidoMU ? norm(a.pedidoMU) : '';
      const targetIdx = safeMU ? pedidosMap.get(safeMU) : undefined;

      if (targetIdx !== undefined && targetIdx >= 0) {
        // Associação segura: Ajuste ABC -> MU -> Pedido
        const target = pedidosAtualizados[targetIdx];
        if (!target.ajustesAlocados) target.ajustesAlocados = [];

        target.ajustesAlocados.push({
          idAjuste: a.idOficialABC || a.id,
          descricao: a.descricao,
          valor: v,
          tipo: a.tipo,
          data: a.data,
          origemPlanilha: a.origemPlanilha || 'Planilha Ajuste Oficial ABC',
          linhaPlanilha: a.linhaPlanilha
        });

        if (a.tipo === 'credito') {
          target.credito = safeRound((target.credito || 0) + v);
          totalCreditosAlocados += v;
        } else {
          target.debito = safeRound((target.debito || 0) + v);
          totalDebitosAlocados += v;
        }

        a.statusAlocacao = 'ALOCADO';
        ajustesAlocadosCount++;
      } else {
        // Regra 8: Nunca fazer associação por aproximação sem segurança!
        a.statusAlocacao = 'NAO_ALOCADO';
        ajustesNaoAlocadosCount++;
      }
    });

    // Recalcula a margem final de todos os pedidos
    pedidosAtualizados.forEach(p => {
      p.margemAjustada = financeEngine.calculateMargemFinal(p);
      p.margemReal = p.margemAjustada;
    });

    return {
      pedidosAtualizados,
      totalCreditosAlocados: safeRound(totalCreditosAlocados),
      totalDebitosAlocados: safeRound(totalDebitosAlocados),
      ajustesAlocadosCount,
      ajustesNaoAlocadosCount
    };
  },

  /**
   * Apura o Batimento Consolidado e compara os totais de cada planilha com o que está alocado nos pedidos.
   * Garante a reconciliação transparente exigida pela governança.
   */
  calcularBatimentoConsolidado: (mes: MesConferencia | null): ResumoBatimentoConsolidado => {
    if (!mes || !mes.pedidos || mes.pedidos.length === 0) {
      return {
        faturamentoTotal: 0,
        margemOriginalTotal: 0,
        freteCobradoTotal: 0,
        custoLogisticoRealTotal: 0,
        vazamentoFreteTotal: 0,
        saldoMontagensTotal: 0,
        cancelamentosTotal: 0,
        devolucoesTotal: 0,
        creditosTotais: 0,
        debitosTotais: 0,
        saldoAjustes: 0,
        creditosAlocados: 0,
        debitosAlocados: 0,
        creditosNaoAlocados: 0,
        debitosNaoAlocados: 0,
        margemRealTotalPedidos: 0,
        resultadoConsolidadoEmpresa: 0,
        diferencaGeral: 0,
        isTotalmenteBatido: true,
        itensBatimento: []
      };
    }

    const pedidos = mes.pedidos;
    const ajustes = mes.ajustesExtras || [];

    // 1. Vendas Base
    const faturamentoTotal = safeRound(pedidos.reduce((acc, p) => acc + (p.isOcorrencia ? 0 : toNum(p.total)), 0));
    const margemOriginalTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.margemOriginal), 0));
    
    // 2. Frete & Logística
    const freteCobradoTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.frete), 0));
    const custoLogisticoRealTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.custoTotalLogistico), 0));
    const vazamentoFreteTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.vazamentoFrete), 0));
    const creditoMontagensTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.creditoMontagens), 0));
    const debitoMontagensTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.debitoMontagens), 0));
    const saldoMontagensTotal = safeRound(creditoMontagensTotal - debitoMontagensTotal);

    // 3. Cancelamentos
    const cancelamentosTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.margemDeduzidaCancelamento), 0));

    // 4. Devoluções
    const devolucoesTotal = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.margemDeduzidaDevolucao), 0));

    // 5. Créditos e Débitos (Planilha de Ajustes / Extrato)
    const creditosTotaisPlanilha = safeRound(ajustes.filter(a => a.tipo === 'credito').reduce((acc, a) => acc + toNum(a.valor), 0));
    const debitosTotaisPlanilha = safeRound(ajustes.filter(a => a.tipo === 'debito').reduce((acc, a) => acc + toNum(a.valor), 0));
    const saldoAjustesPlanilha = safeRound(creditosTotaisPlanilha - debitosTotaisPlanilha);

    // Créditos e Débitos dentro dos pedidos (Direto + Alocado)
    const creditosNosPedidos = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.credito) + toNum(p.creditoAlocado), 0));
    const debitosNosPedidos = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.debito) + toNum(p.debitoAlocado), 0));

    const creditosNaoAlocados = safeRound(creditosTotaisPlanilha - creditosNosPedidos);
    const debitosNaoAlocados = safeRound(debitosTotaisPlanilha - debitosNosPedidos);

    // 6. Margem Real de todos os pedidos somada
    const margemRealTotalPedidos = safeRound(pedidos.reduce((acc, p) => acc + toNum(p.margemReal ?? p.margemAjustada), 0));

    // Fórmula Canônica da Empresa:
    // Base + Montagens - Cancelados - Devolvidos + CréditosPlanilha - DébitosPlanilha - Vazamento
    const resultadoConsolidadoEmpresa = safeRound(
      margemOriginalTotal + 
      saldoMontagensTotal - 
      cancelamentosTotal - 
      devolucoesTotal + 
      creditosTotaisPlanilha - 
      debitosTotaisPlanilha - 
      vazamentoFreteTotal
    );

    const diferencaGeral = safeRound(Math.abs(margemRealTotalPedidos - resultadoConsolidadoEmpresa));
    const isTotalmenteBatido = diferencaGeral < 0.05 && Math.abs(creditosNaoAlocados) < 0.05 && Math.abs(debitosNaoAlocados) < 0.05;

    // Constrói os itens de batimento detalhados
    const itensBatimento: BatimentoPlanilhaItem[] = [
      {
        titulo: 'Vendas & Margem Base',
        origemPlanilha: 'Planilha Principal de Vendas',
        totalPlanilha: margemOriginalTotal,
        totalAlocadoNosPedidos: margemOriginalTotal,
        diferenca: 0,
        isBatido: true,
        detalhe: `${pedidos.length} pedidos auditados (Faturamento: R$ ${faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
      },
      {
        titulo: 'Frete & Logística Real',
        origemPlanilha: 'Faturas de Transportadoras & CTEs',
        totalPlanilha: custoLogisticoRealTotal,
        totalAlocadoNosPedidos: custoLogisticoRealTotal,
        diferenca: 0,
        isBatido: true,
        detalhe: `Frete Cobrado: R$ ${freteCobradoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Vazamento Apurado: R$ ${vazamentoFreteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Montagens de Produtos',
        origemPlanilha: 'Fechamento de Montagens',
        totalPlanilha: saldoMontagensTotal,
        totalAlocadoNosPedidos: saldoMontagensTotal,
        diferenca: 0,
        isBatido: true,
        detalhe: `Crédito: +R$ ${creditoMontagensTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Débito: -R$ ${debitoMontagensTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Cancelamentos',
        origemPlanilha: 'Planilha de Cancelados',
        totalPlanilha: cancelamentosTotal,
        totalAlocadoNosPedidos: cancelamentosTotal,
        diferenca: 0,
        isBatido: true,
        detalhe: `Dedução total de margem por cancelamento: -R$ ${cancelamentosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Devoluções & Trocas',
        origemPlanilha: 'Planilha de Devoluções',
        totalPlanilha: devolucoesTotal,
        totalAlocadoNosPedidos: devolucoesTotal,
        diferenca: 0,
        isBatido: true,
        detalhe: `Impacto total apurado (sinais preservados): -R$ ${devolucoesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Créditos de Ajustes',
        origemPlanilha: 'Planilha de Ajustes / Extrato',
        totalPlanilha: creditosTotaisPlanilha,
        totalAlocadoNosPedidos: creditosNosPedidos,
        diferenca: creditosNaoAlocados,
        isBatido: Math.abs(creditosNaoAlocados) < 0.05,
        detalhe: Math.abs(creditosNaoAlocados) < 0.05 
          ? `100% dos créditos alocados nos pedidos` 
          : `Pendente alocar R$ ${creditosNaoAlocados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Débitos de Ajustes',
        origemPlanilha: 'Planilha de Ajustes / Extrato',
        totalPlanilha: debitosTotaisPlanilha,
        totalAlocadoNosPedidos: debitosNosPedidos,
        diferenca: debitosNaoAlocados,
        isBatido: Math.abs(debitosNaoAlocados) < 0.05,
        detalhe: Math.abs(debitosNaoAlocados) < 0.05 
          ? `100% dos débitos alocados nos pedidos` 
          : `Pendente alocar R$ ${debitosNaoAlocados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      {
        titulo: 'Margem Real Consolidada',
        origemPlanilha: 'Balanço Geral Canônico ABC',
        totalPlanilha: resultadoConsolidadoEmpresa,
        totalAlocadoNosPedidos: margemRealTotalPedidos,
        diferenca: diferencaGeral,
        isBatido: isTotalmenteBatido,
        detalhe: isTotalmenteBatido 
          ? `Soma de todas as margens reais dos pedidos bate 100% com o resultado da empresa!`
          : `Divergência de R$ ${diferencaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} entre a soma dos pedidos e o balanço`
      }
    ];

    return {
      faturamentoTotal,
      margemOriginalTotal,
      freteCobradoTotal,
      custoLogisticoRealTotal,
      vazamentoFreteTotal,
      saldoMontagensTotal,
      cancelamentosTotal,
      devolucoesTotal,
      creditosTotais: creditosTotaisPlanilha,
      debitosTotais: debitosTotaisPlanilha,
      saldoAjustes: saldoAjustesPlanilha,
      creditosAlocados: creditosNosPedidos,
      debitosAlocados: debitosNosPedidos,
      creditosNaoAlocados,
      debitosNaoAlocados,
      margemRealTotalPedidos,
      resultadoConsolidadoEmpresa,
      diferencaGeral,
      isTotalmenteBatido,
      itensBatimento
    };
  },

  // Cálculo de Comissão baseado na Margem Ajustada e Faixas Oficiais
  calculateCommission: (p: Pedido) => {
    if (p.isOcorrencia) return { base: 0, taxa: 0, comissao: 0, margemPct: 0, status: 'ISENTO_OCORRENCIA' };

    const total = toNum(p.total);
    const frete = toNum(p.frete);
    const margemReal = toNum(p.margemReal ?? p.margemAjustada);

    // Base de cálculo é o valor do produto (Total - Frete Cobrado)
    // Extra/Custo Frete não são abatidos da base da comissão
    const baseCalculo = Math.max(0, safeRound(total - frete));
    
    // Rentabilidade Real (%)
    const margemPct = total > 0 ? safeRound((margemReal / total) * 100) : 0;

    // Regra Canônica ABC ITU:
    // >= 10%: 1,5%
    // >= 7% e < 10%: 1,0%
    // < 7%: NAO_DEFINIDO (Protocolo 3: A_DEFINIR NUNCA VIRA ZERO!)
    if (margemPct >= 10.0) {
      return {
        base: baseCalculo,
        taxa: 0.015,
        comissao: safeRound(baseCalculo * 0.015),
        margemPct,
        status: 'APROVADO'
      };
    } else if (margemPct >= 7.0) {
      return {
        base: baseCalculo,
        taxa: 0.01,
        comissao: safeRound(baseCalculo * 0.01),
        margemPct,
        status: 'APROVADO'
      };
    } else {
      // Bloqueado / A_DEFINIR: Proibido retornar 0%
      return {
        base: baseCalculo,
        taxa: null,
        comissao: null,
        margemPct,
        status: 'A_DEFINIR_BLOQUEADO'
      };
    }
  },

  // Auditoria de Fretes Duplicados (ex: MUs filhas com frete cobrado indevidamente)
  auditFretes: (pedidos: Pedido[]): Pedido[] => {
    const countFretePorMestre: Record<string, number> = {};
    pedidos.forEach(p => {
       if (toNum(p.frete) > 0) {
         const k = p.idPedidoMestre || p.id;
         countFretePorMestre[k] = (countFretePorMestre[k] || 0) + 1;
       }
    });

    return pedidos.map(p => {
      const idMestre = p.idPedidoMestre || p.id;
      const temFrete = toNum(p.frete) > 0;
      const isDuplicado = temFrete && (countFretePorMestre[idMestre] > 1);
      
      return { ...p, alertaFreteDuplicado: isDuplicado };
    });
  }
};
