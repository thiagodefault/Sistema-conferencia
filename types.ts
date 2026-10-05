
export interface AppConfig {
  vendedoresMap: Record<string, string>;
  fretePorKg: number;
  metasMensais: Record<string, number>;
  // Novos Toggles de Funcionalidade para Auditoria Estrita
  autoIgnoreDuplicates: boolean;
  strictMarginAlert: boolean;
  allowHistoricalLogisticsUpdate: boolean;
  autoDetectStatusOnImport: boolean;
  // Auditoria de Custos
  defaultTaxRate: number; // Ex: 18%
  defaultRoyaltyRate: number; // Ex: 3%
}

export interface ItemAjusteAlocado {
  idAjuste: string; // Ex: ID #174887 oficial ABC
  descricao: string; // Ex: "Correção pedido negociado no VIP com margem de 8%"
  valor: number; // Ex: 273.09
  tipo: 'credito' | 'debito';
  data?: string;
  origemPlanilha?: string; // Ex: "Aba Ajustes ABC"
  linhaPlanilha?: number; // Linha da planilha de origem
}

export interface AjusteExtra {
  id: string;
  idOficialABC?: string; // ID da ABC (ex: 174887)
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
  pedidoMU?: string;
  data: string;
  origemPlanilha?: string;
  linhaPlanilha?: number;
  statusAlocacao?: 'ALOCADO' | 'NAO_ALOCADO';
}

export interface Pedido {
  id: string;
  data: string;
  canal: string;
  vendedor: string;
  total: number;
  frete: number;
  isCancelado?: boolean;
  isOcorrencia?: boolean;
  idPedidoMestre?: string;
  margemOriginal: number;
  margemOriginalPct: number;
  credito: number;
  debito: number;
  margemAjustada: number;
  confirmado: boolean;
  
  // Alocações analíticas de ajustes oficiais da ABC (Regra Central de Três Camadas)
  ajustesAlocados?: ItemAjusteAlocado[];
  
  // Logística (Fechamento Bi-semanal)
  custoFreteReal?: number;
  custoRota?: number;
  custoTotalLogistico?: number;
  pesoReal?: number;
  creditoMontagens?: number;
  debitoMontagens?: number;
  saldoPedidoLogistico?: number;
  vazamentoFrete?: number;
  
  statusEntrega?: string;
  isDivergente?: boolean;
  motivoDivergencia?: string;
  diferencaFrete?: number;
  etapasFrete?: number;
  saldoCreditoFretePendente?: number;
  aprovadoProximaQuinzena?: boolean;
  valorApoio?: number;
  margemDeduzidaCancelamento?: number;
  margemDeduzidaDevolucao?: number;
  isDevolvido?: boolean;
  alertaFreteDuplicado?: boolean;
  pesoKg?: number;
  mkt?: number;
  cac?: number;
  filial?: string;
  statusOcorrencia?: string;
  tipoOcorrencia?: string;
  
  // Novos campos opcionais para auditoria profunda (se vierem na planilha)
  cmv?: number; // Custo da Mercadoria Vendida

  // Alocação de Débitos e Créditos para Margem Real
  creditoAlocado?: number; // Créditos de rateio alocados no pedido
  debitoAlocado?: number;  // Débitos de rateio alocados no pedido
  saldoMontagensAlocado?: number; // Saldo de montagem alocado
  margemReal?: number; // Margem real definitiva após alocação completa
}

export type DestinacaoCancelamentoDevolucao = 
  | 'VINCULADO_NOVO_PEDIDO'
  | 'CREDITO_USADO'
  | 'CREDITO_EM_TELA'
  | 'ESTORNADO_CLIENTE';

export interface ItemCanceladoAuditado {
  id: string;
  mu: string;
  valor: number;
  margem: number; // Valor da planilha (ex: -373.11)
  statusCompetencia: 'MES_CORRENTE' | 'BACKLOG_RETROATIVO';
  destinacao?: DestinacaoCancelamentoDevolucao;
  novoPedidoMU?: string; // Se vinculado a novo pedido
  observacao?: string;
  data?: string;
}

export interface ItemDevolvidoAuditado {
  id: string;
  mu: string;
  valor: number;
  margem: number; // Valor da planilha (ex: 28.33 ou -1.75 / -30.08)
  statusCompetencia: 'MES_CORRENTE' | 'BACKLOG_RETROATIVO';
  destinacao?: DestinacaoCancelamentoDevolucao;
  novoPedidoMU?: string; // Se vinculado a novo pedido
  observacao?: string;
  data?: string;
}

export interface ConsolidadoOficialABC {
  margemSemFrete: number;
  margemComFrete: number;
  custoFreteRota: number;
  saldoMontagens: number;
  cancelamentos: number;
  devolucoes: number;
  comissaoDuplicatas: number;
  negociacaoCredito: number;
  negociacaoDebito: number;
  totalOficial: number;
  franquiaTotal?: number;
  ecommerceTotal?: number;
}

export interface MesConferencia {
  mesReferencia: string;
  pedidos: Pedido[];
  ajustesExtras: AjusteExtra[];
  cancelamentosItens?: ItemCanceladoAuditado[];
  devolucoesItens?: ItemDevolvidoAuditado[];
  saldoMontagensTotal?: number;
  custoFreteRotaTotal?: number;
  consolidadoOficial?: ConsolidadoOficialABC;
}

export interface HistoricoConsolidado {
  meses: MesConferencia[];
}

export interface ContaPagar {
  id: string;
  dataCadastro: string;
  dataPagamento: string;
  beneficiario: string;
  valor: number;
  pago: boolean;
}

export interface Recebimento {
  id: string;
  dataCadastro: string;
  dataRecebimento: string;
  origem: string;
  valor: number;
  recebido: boolean;
}

// Interface para a Calculadora Volátil de Auditoria
export interface AuditItem {
  id: string;
  mu: string;
  data: string;
  vendedor: string;
  totalVenda: number;
  peso: number;
  margemPlanilhaPct: number; // Margem bruta % vinda do excel
  margemPlanilhaR$: number;   // Margem R$ vinda do excel (para comparação)
  categoria: 'TELEVENDAS' | 'PROMO' | 'NORMAL' | 'OUTRO';

  // Financeiro
  custoFinanceiroPlanilha: number;
  formaPagamentoSelecionada: string; // Key do PaymentRates ou 'MISTO'
  splitDetails?: { method: string; value: number }[]; // Para pagamentos mistos
  taxaTeoricaPct: number; // Média ponderada se for misto
  custoFinanceiroTeorico: number;
  diffFinanceiro: number;
  statusFinanceiro: 'ok' | 'divergente' | 'pendente';

  // Frete
  freteCobrado: number;
  tipoEntrega: 'LOJA' | 'CLIENTE';
  freteTeorico: number;
  diffFrete: number; // Cobrado - Teorico
  splitFreteABC: number; // Se televendas e lucro no frete, 25% vai pra ABC
  statusFrete: 'ok' | 'lucro' | 'prejuizo';

  // Resultado
  receitaBaseProduto: number; // Valor calculado da base do produto (Ex: 8% do VendaProduto)
  saldoFreteFinal: number; // diffFrete - splitFreteABC
  royaltiesTeorico: number; // 3% sobre produto (Exceto televendas)
  resultadoLiquido: number; // O nosso cálculo final
  
  // Comparação Final
  diffResultadoR$: number; // Nosso calculo - Margem Planilha R$
  diffResultadoPct: number;
  statusResultado: 'ok' | 'erro';
}

export type PageId = 
  | 'dashboard' 
  | 'agentes-execucao'
  | 'conferencia' 
  | 'cancelados' 
  | 'devolvidos' 
  | 'ocorrencias'
  | 'ajustes-varios' 
  | 'frete'
  | 'ajustes' 
  | 'analise-vendedor' 
  | 'comissao' 
  | 'horas'
  | 'contas-pagar' 
  | 'fluxo-caixa' 
  | 'dre' 
  | 'auditoria-custos'
  | 'configuracao';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: keyof Pedido;
  direction: SortDirection;
}
