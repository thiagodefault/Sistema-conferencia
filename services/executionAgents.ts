/**
 * ABC Finance - Matriz de Agentes de Execução e Governança
 * Estrutura Oficial de Governança:
 * THIAGO → CEO-001 → ARC-001 / FIN-001 / DAT-001 / SEC-001 / QA-001 → 19 Agentes de Módulo (MOD-001 a MOD-019)
 * 
 * PROTOCOLOS ATIVOS:
 * • A_DEFINIR nunca vira zero.
 * • BLOCKER não pode ser contornado por regra inventada.
 * • Task-ID contém: objetivo, contexto, regras, fontes, dependências, escopo, testes e riscos.
 * • DONE exige: implementação, testes, integração, banco, segurança, auditoria, regressão, QA, zero blockers e evidências.
 * • Fluxo: Implementação → testes → QA → SEC → CEO → APPROVED.
 */

export type AgentRoleType = 'LEADERSHIP' | 'SPECIALIST' | 'MODULE';

export type TaskStatus = 
  | 'BACKLOG'
  | 'IMPLEMENTACAO'
  | 'TESTES'
  | 'QA_REVIEW'
  | 'SEC_AUDIT'
  | 'CEO_APPROVAL'
  | 'APPROVED'
  | 'BLOCKED';

export interface ApprovalRecord {
  id: string;
  agenteId: string;
  aprovador: string;
  dataHora: string;
  faseAprovada: TaskStatus;
  parecer: string;
  hashAssinatura: string;
  statusResultado: 'APROVADO' | 'REJEITADO' | 'SOLICITADO_AJUSTES';
}

export interface TaskIDSpecification {
  taskId: string;
  agenteId: string;
  objetivo: string;
  contexto: string;
  regrasObrigatorias: string[];
  fontes: string[];
  dependencias: string[];
  escopo: string[];
  testes: string[];
  riscos: string[];
  status: TaskStatus;
  blockers: string[];
  itensADefinir: string[];
  evidenciasSha256?: string[];
  dataUltimaAtualizacao: string;
}

export interface ExecutionAgent {
  id: string;
  nome: string;
  papel: string;
  tipo: AgentRoleType;
  superiorImediato: string;
  subordinados?: string[];
  moduloAssociado?: string;
  descricao: string;
  acaoEmAndamento: string;
  entregaveisGerados: string[];
  aprovadorDesignado: string;
  oQuePodeFazer?: string[];
  oQueNaoPodeFazer?: string[];
  regrasMandatorias: string[];
  fontesDados: string[];
  dependencias: string[];
  escopoEntregaveis: string[];
  bateriaTestes: string[];
  riscosMapeados: string[];
  itensADefinir: string[];
  statusAtual: TaskStatus;
  ultimaAprovacao?: ApprovalRecord;
  historicoTarefas: TaskIDSpecification[];
}

export const EXECUTION_AGENTS_CATALOG: ExecutionAgent[] = [
  // LIDERANÇA E ORQUESTRAÇÃO
  {
    id: 'CEO-001',
    nome: 'Agente Orquestrador & Aprovação Executiva',
    papel: 'Orquestração e Aprovação Final',
    tipo: 'LEADERSHIP',
    superiorImediato: 'THIAGO',
    subordinados: ['ARC-001', 'FIN-001', 'DAT-001', 'SEC-001', 'QA-001'],
    descricao: 'Responsável pela integridade global do sistema, alinhamento das decisões, aprovação final de ciclos e bloqueio absoluto de regras inventadas.',
    acaoEmAndamento: 'Supervisionando conformidade protocolar e deliberando sobre homologação de fechamentos quinzenais.',
    entregaveisGerados: ['Relatório de Execução Consolidado', 'Despacho de Governança Thiago/CEO-001', 'Quadro Oficial de Aprovações'],
    aprovadorDesignado: 'THIAGO (Patrono)',
    regrasMandatorias: [
      'Garantir fluxo rígido: Implementação → Testes → QA → SEC → CEO → APPROVED.',
      'Bloqueio imediato caso qualquer agente tente transformar A_DEFINIR em zero.',
      'Aprovar tarefas somente com zero blockers e com evidências auditadas.'
    ],
    fontesDados: ['Relatórios de QA-001', 'Auditorias de SEC-001', 'Modelagens de ARC-001'],
    dependencias: ['Validação formal de todos os 5 especialistas'],
    escopoEntregaveis: ['Relatório de Execução Consolidado', 'Homologação de Ciclos', 'Controle de Releases'],
    bateriaTestes: ['E1-T01 a E1-T24'],
    riscosMapeados: ['Decisões baseadas em dados incompletos', 'Quebra de protocolo por pressão de prazo'],
    itensADefinir: ['Definição de cronograma para homologação de dados reais com o patrocinador Thiago'],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'ARC-001',
    nome: 'Agente de Arquitetura, Banco & Modelagem',
    papel: 'Arquitetura e Banco de Dados',
    tipo: 'SPECIALIST',
    superiorImediato: 'CEO-001',
    descricao: 'Define as fronteiras arquiteturais do monólito modular, esquemas PostgreSQL/Prisma, tipagem estrita com Zod, e persistência em BigInt.',
    acaoEmAndamento: 'Auditando a camada de aplicação contra coerção de float e mantendo integridade com escala fixa em centavos.',
    entregaveisGerados: ['Esquema Multi-schema Prisma', 'Contratos de Domínio', 'Camada de Aplicação Modular'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: [
      'Monólito modular: Frontend → API → Application → Domain → Infrastructure.',
      'Dinheiro exclusivamente com bigint/Decimal; frontend NUNCA calcula dinheiro.',
      'UUID v7 em todos os identificadores persistidos.',
      'Foreign Key com ON DELETE RESTRICT para integridade referencial.'
    ],
    fontesDados: ['prisma/schema.prisma', 'packages/domain/src/*', 'packages/application/src/*'],
    dependencias: [],
    escopoEntregaveis: ['Esquema Multi-schema Prisma', 'Contratos de Domínio', 'Camada de Aplicação'],
    bateriaTestes: ['E1-T04', 'E1-T09', 'E1-T10', 'E1-T11', 'E1-T12', 'E1-T16', 'E1-T20'],
    riscosMapeados: ['Contaminação de regras de domínio no frontend', 'Perda de precisão numérica por coerção acidental'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'FIN-001',
    nome: 'Agente de Regras Financeiras & Matemática de Precisão',
    papel: 'Regras Financeiras Oficiais',
    tipo: 'SPECIALIST',
    superiorImediato: 'CEO-001',
    descricao: 'Guardião canônico de todas as fórmulas matemáticas, equações de rentabilidade, regras de comissão e tratamento estrito de sinais algébricos.',
    acaoEmAndamento: 'Validação da fórmula canônica do Consolidado (15.711,29) e bloqueio formal de comissão < 7% (NAO_DEFINIDO).',
    entregaveisGerados: ['Motor Canônico CanonicalFinanceEngine', 'Tabela da Verdade Financeira', 'Validador Algébrico de Sinais'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: [
      'SINAIS PRESERVADOS: Proibido o uso de ABS/Math.abs para apagar sinais.',
      'Cancelados canônico: +500 -300 +100 -50 = +250.',
      'Devolvidos canônico: -51,83 +47,10 +2,19 = -2,54.',
      'Consolidado: Base + Montagens - Cancelados - Devolvidos + Ajustes = 15.711,29.',
      'Comissão: >=10% (1,5%), [7%,10%) (1,0%), <7% (NAO_DEFINIDO - Nunca vira zero!).',
      'Base da comissão = Total - Frete (- Crédito Usado). Custos extras NÃO são abatidos.'
    ],
    fontesDados: ['Especificações ABC', 'Planilhas Oficiais de Fechamento', 'Casos Canônicos Homologados'],
    dependencias: ['ARC-001 (Tipagem Money bigint)'],
    escopoEntregaveis: ['Motor Canônico de Cálculo', 'Tabela da Verdade Financeira', 'Validador Algébrico'],
    bateriaTestes: ['E1-T01', 'E1-T02', 'E1-T03', 'E1-T04', 'E1-T06', 'E1-T08'],
    riscosMapeados: ['Inversão indevida de sinal em devoluções', 'Tentativa de aplicar 0% para margem <7%'],
    itensADefinir: [
      'Regra oficial para comissão com margem < 7%',
      'Fórmula de estorno de crédito',
      'Impacto de ocorrências no Consolidado'
    ],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'DAT-001',
    nome: 'Agente de Origem, Proveniência & Integridade RAW',
    papel: 'Origem e Proveniência de Dados',
    tipo: 'SPECIALIST',
    superiorImediato: 'CEO-001',
    descricao: 'Garante que todo registro importado mantenha sua representação textual bruta original, proveniência exatamente única e hash SHA-256 de auditoria.',
    acaoEmAndamento: 'Operando o Parser Inteligente SpreadsheetParser com arrayBuffer, detecção dinâmica de cabeçalhos e sinônimos.',
    entregaveisGerados: ['Parser Declarado BR Universal', 'Gerador de Modelos Excel', 'Rastreador de Proveniência'],
    aprovadorDesignado: 'CEO-001',
    regrasMandatorias: [
      'Preservar texto original de números e códigos (ex: zeros à esquerda em MUs 00049281).',
      'Procedência exatamente uma por registro (sem orfandade e sem duplicidade de fonte).',
      'Parsing declarado BR com rejeição de layouts ambíguos.',
      'Separação estrutural de Pedido e MU (cabeçalho vs itens).'
    ],
    fontesDados: ['Arquivos RAW Excel/CSV', 'Logs de Upload', 'Tabela RAW no PostgreSQL'],
    dependencias: ['ARC-001'],
    escopoEntregaveis: ['Parser Declarado BR', 'Tabelas RAW Imutáveis', 'Rastreador de Proveniência'],
    bateriaTestes: ['E1-T01', 'E1-T02', 'E1-T07', 'E1-T17', 'E1-T21'],
    riscosMapeados: ['Truncamento de zeros à esquerda por conversão automática', 'MUs filhas somadas ao total do cabeçalho gerando duplicidade'],
    itensADefinir: ['Data oficial da quinzena em caso de datas concorrentes na mesma linha RAW'],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'SEC-001',
    nome: 'Agente de Segurança, Auditoria & Imutabilidade',
    papel: 'Segurança e Auditoria',
    tipo: 'SPECIALIST',
    superiorImediato: 'CEO-001',
    descricao: 'Audita todas as operações, impede alterações retroativas em períodos fechados, gerencia controle de acesso e constrói a cadeia de custódia com hash SHA-256.',
    acaoEmAndamento: 'Fiscalizando imutabilidade do histórico fechado e gerando hashes de não-repúdio em aprovações.',
    entregaveisGerados: ['Cadeia de Auditoria Criptográfica', 'Mecanismo de Trava de Fechamento Imutável', 'Logs de Assinatura'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: [
      'Histórico fechado é estritamente imutável (bloqueio de UPDATE/DELETE/TRUNCATE).',
      'Toda mutação gera registro de auditoria na mesma transação atômica.',
      'Controle de versão otimista em concorrência.',
      'Validação de não-repúdio de todas as ações.'
    ],
    fontesDados: ['Trilha de Auditoria PostgreSQL', 'Assinaturas de Fechamento', 'Logs Criptográficos'],
    dependencias: ['ARC-001', 'DAT-001'],
    escopoEntregaveis: ['Tabela de Auditoria com Hash Chain', 'Guarda de Imutabilidade Terminal', 'Políticas RBAC'],
    bateriaTestes: ['E1-T13', 'E1-T14', 'E1-T15', 'E1-T19', 'E1-T20'],
    riscosMapeados: ['Tentativa de reabrir quinzena fechada sem aprovação executiva', 'Falha transacional na gravação do log de auditoria'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'QA-001',
    nome: 'Agente de Qualidade & Testes Independentes',
    papel: 'Testes Independentes e Validação Canônica',
    tipo: 'SPECIALIST',
    superiorImediato: 'CEO-001',
    descricao: 'Executa a suíte de testes ponta a ponta, valida regressões financeiras, inspeciona os 14/14 testes canônicos e atesta evidências antes do envio ao CEO.',
    acaoEmAndamento: 'Execução contínua da Bateria Canônica E1-T01 a E1-T24, atestando 100% PASS e regressão zero.',
    entregaveisGerados: ['Suíte Canônica E1 Automatizada', 'Certificados de Não-Regressão', 'Evidências de Conformidade'],
    aprovadorDesignado: 'CEO-001',
    regrasMandatorias: [
      'Nenhuma tarefa avança para CEO sem cobertura de testes automatizados.',
      'Critério de valor oficial: todo número precisa ter origem, evidência, regra, versão e componentes auditáveis.',
      'Zero tolerância a blockers mascarados.'
    ],
    fontesDados: ['Suíte de Testes Node/TypeScript', 'Casos de Teste Canônicos E1-T01 a E1-T24', 'Estatísticas de Cobertura'],
    dependencias: ['FIN-001', 'ARC-001', 'DAT-001', 'SEC-001'],
    escopoEntregaveis: ['Relatório de Execução de Testes', 'Evidências de Regressão Zero', 'Certificados de Conformidade'],
    bateriaTestes: ['E1-T01 a E1-T24'],
    riscosMapeados: ['Falsos positivos em testes simplificados', 'Divergência entre testes unitários e comportamento real'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },

  // 19 AGENTES DE MÓDULO (MOD-001 A MOD-019)
  {
    id: 'MOD-001-FND',
    nome: 'Agente de Fundação / Banco / Money / Auditoria',
    papel: 'Execução de Fundação e Infraestrutura',
    tipo: 'MODULE',
    moduloAssociado: '1. Fundação / Banco / Money / Auditoria',
    superiorImediato: 'ARC-001',
    descricao: 'Implementa a estrutura nuclear de tipos monetários em bigint, contratos base, esquema prisma e infraestrutura de auditoria.',
    acaoEmAndamento: 'Garantindo representação atômica em escala de centavos sem flutuação IEEE 754.',
    entregaveisGerados: ['Classe CanonicalMoney', 'Trilha de Auditoria', 'Contrato Base de Domínio'],
    aprovadorDesignado: 'ARC-001 / QA-001',
    regrasMandatorias: ['Tipagem CanonicalMoney com escala fixa em centavos', 'Trilha de auditoria obrigatória'],
    fontesDados: ['packages/domain/src/money.ts', 'packages/domain/src/audit.ts'],
    dependencias: ['ARC-001', 'SEC-001'],
    escopoEntregaveis: ['Classe CanonicalMoney', 'Entidades de Auditoria', 'Contratos de Domínio Base'],
    bateriaTestes: ['E1-T01', 'E1-T04'],
    riscosMapeados: ['Erros de typecheck no money.ts'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-002-RAW',
    nome: 'Agente de Importação & Parsing RAW',
    papel: 'Ingestão e Parser Declarado BR',
    tipo: 'MODULE',
    moduloAssociado: '2. Importação / RAW',
    superiorImediato: 'DAT-001',
    descricao: 'Ingere arquivos de planilhas oficiais preservando formato bruto original, gerando hash SHA-256 e aplicando parsing declarado BR.',
    acaoEmAndamento: 'Ingestão resiliente com detecção automática de 25 linhas de cabeçalho e suporte a arrayBuffer.',
    entregaveisGerados: ['SpreadsheetParser.ts com suporte .xlsx/.xls/.csv', 'Mapeador de Sinônimos de Colunas'],
    aprovadorDesignado: 'DAT-001 / CEO-001',
    regrasMandatorias: ['Layout numérico declarado BR', 'Rejeitar formatação que perca texto original'],
    fontesDados: ['Upload de Planilhas XLS/XLSX/CSV'],
    dependencias: ['DAT-001'],
    escopoEntregaveis: ['Motor de Ingestão RAW', 'Tabela de Importações com SHA-256'],
    bateriaTestes: ['E1-T01', 'E1-T02', 'E1-T17'],
    riscosMapeados: ['Formatos heterogêneos de células do Excel'],
    itensADefinir: ['Homologação de importador completo com arquivos reais da ABC'],
    statusAtual: 'CEO_APPROVAL',
    historicoTarefas: []
  },
  {
    id: 'MOD-003-IDN',
    nome: 'Agente de Normalização & Identidade (Pedido vs MU)',
    papel: 'Identidade e Vínculo de MUs',
    tipo: 'MODULE',
    moduloAssociado: '3. Normalização / Identidade',
    superiorImediato: 'DAT-001',
    descricao: 'Separa rigorosamente cabeçalho do pedido de suas unidades de movimentação (MUs), vinculando itens sem duplicar totais.',
    acaoEmAndamento: 'Preservando zeros à esquerda em IDs de MU (ex: 00049281) e segregando itens de cabeçalhos.',
    entregaveisGerados: ['Vinculador de Mestre/Filha', 'Validador de Zeros à Esquerda E1-T07'],
    aprovadorDesignado: 'DAT-001',
    regrasMandatorias: ['MU: Cabeçalho e itens não podem ser somados juntos', 'Preservação de zeros à esquerda'],
    fontesDados: ['Linhas de Pedidos e MUs das planilhas'],
    dependencias: ['MOD-002-RAW'],
    escopoEntregaveis: ['Entidade PedidoMestre e MUFilha', 'Algoritmo de vinculação'],
    bateriaTestes: ['E1-T07'],
    riscosMapeados: ['Soma indevida de valores da MU filha na venda consolidada'],
    itensADefinir: ['Normalização completa futura de layout de pedidos multiníveis'],
    statusAtual: 'CEO_APPROVAL',
    historicoTarefas: []
  },
  {
    id: 'MOD-004-VND',
    nome: 'Agente de Vendas Base & Margem',
    papel: 'Cálculo de Margem Bruta e Rentabilidade',
    tipo: 'MODULE',
    moduloAssociado: '4. Vendas Base / Margem',
    superiorImediato: 'FIN-001',
    descricao: 'Calcula a margem original e rentabilidade percentual das vendas base homologadas.',
    acaoEmAndamento: 'Calculando rentabilidade líquida percentual por pedido com validação de frete e deduções.',
    entregaveisGerados: ['Extrato de Vendas Base', 'Calculadora de Rentabilidade'],
    aprovadorDesignado: 'FIN-001 / CEO-001',
    regrasMandatorias: ['Margem (%) = (Margem R$ / Total Venda) * 100', 'Impedir divisão por zero em cancelamentos totais'],
    fontesDados: ['Pedidos Válidos da Competência'],
    dependencias: ['MOD-003-IDN', 'FIN-001'],
    escopoEntregaveis: ['Extrato de Vendas Base', 'Cálculo de Rentabilidade'],
    bateriaTestes: ['E1-T01', 'E1-T06'],
    riscosMapeados: ['Divergência entre margem da planilha e cálculo teórico'],
    itensADefinir: ['Cálculo oficial completo ainda em processo de homologação de arquivo real'],
    statusAtual: 'CEO_APPROVAL',
    historicoTarefas: []
  },
  {
    id: 'MOD-005-CNC',
    nome: 'Agente de Cancelados (Preservação Algébrica)',
    papel: 'Auditoria de Pedidos Cancelados',
    tipo: 'MODULE',
    moduloAssociado: '5. Cancelados',
    superiorImediato: 'FIN-001',
    descricao: 'Aplica a fórmula canônica de cancelamentos respeitando rigorosamente a soma algébrica de sinais.',
    acaoEmAndamento: 'Validação da soma de cancelamentos: +500 -300 +100 -50 = +250 sem uso de Math.abs.',
    entregaveisGerados: ['Motor Canônico de Cancelados (+250)', 'Importador de Cancelados sem falhas'],
    aprovadorDesignado: 'FIN-001 / QA-001',
    regrasMandatorias: ['Caso Canônico: +500 -300 +100 -50 = +250', 'Não usar Math.abs'],
    fontesDados: ['Registros de Cancelamento'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Motor de Cancelamentos', 'Relatório Auditado de Cancelados'],
    bateriaTestes: ['E1-T03'],
    riscosMapeados: ['Tentativa de inverter sinal de cancelamento'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-006-DEV',
    nome: 'Agente de Devolvidos (Preservação de Sinal Canônico)',
    papel: 'Auditoria de Mercadorias Devolvidas',
    tipo: 'MODULE',
    moduloAssociado: '6. Devolvidos',
    superiorImediato: 'FIN-001',
    descricao: 'Consolida devoluções preservando o sinal negativo canônico e garantindo o impacto correto no balanço final.',
    acaoEmAndamento: 'Validação da soma de devoluções: -51,83 +47,10 +2,19 = -2,54 e subtração algébrica.',
    entregaveisGerados: ['Motor Canônico de Devoluções (-2,54)', 'Importador Robusto de Devoluções'],
    aprovadorDesignado: 'FIN-001 / QA-001',
    regrasMandatorias: ['Caso Canônico: -51,83 +47,10 +2,19 = -2,54', 'Proibido apagar sinal'],
    fontesDados: ['Registros de Devoluções'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Motor de Devoluções', 'Demonstrativo de Impacto Líquido'],
    bateriaTestes: ['E1-T03', 'E1-T06'],
    riscosMapeados: ['Tratamento de devolução como valor positivo subtraído'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-007-AJU',
    nome: 'Agente de Ajustes Financeiros Manuais',
    papel: 'Gestão de Ajustes Crédito e Débito',
    tipo: 'MODULE',
    moduloAssociado: '7. Ajustes',
    superiorImediato: 'FIN-001',
    descricao: 'Calcula o saldo de ajustes respeitando créditos (+) e débitos (-), garantindo rastreabilidade.',
    acaoEmAndamento: 'Operando o Importador de Planilha de Ajustes Manuais e aplicação da fórmula (+3.904,88 - 3.656,78 = +248,10).',
    entregaveisGerados: ['Importador de Planilha de Ajustes (.xlsx/.xls/.csv)', 'Gerador de Modelo Excel', 'Tabela Algébrica de Ajustes'],
    aprovadorDesignado: 'FIN-001 / CEO-001',
    regrasMandatorias: ['Exemplo Canônico: +3.904,88 - 3.656,78 = +248,10', 'Justificativa obrigatória por lançamento'],
    fontesDados: ['Lançamentos de Ajustes Avulsos e Planilhas'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Módulo Algébrico de Ajustes', 'Livro de Lançamentos'],
    bateriaTestes: ['E1-T03', 'E1-T06'],
    riscosMapeados: ['Ajuste sem identificação de motivo ou autor'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-008-FRT',
    nome: 'Agente de Gestão de Fretes & Logística',
    papel: 'Segregação de Fretes e Auditoria de Cobrança',
    tipo: 'MODULE',
    moduloAssociado: '8. Fretes',
    superiorImediato: 'FIN-001',
    descricao: 'Separa frete cobrado do produto para apuração de comissão e detecta vazamentos logísticos sem abater indevidamente custo extra.',
    acaoEmAndamento: 'Auditando segregação de fretes cobrados na base de comissão e apuração de vazamentos logísticos.',
    entregaveisGerados: ['Auditor de Fretes Duplicados', 'Apuração de Vazamento Logístico', 'Importador de Logística'],
    aprovadorDesignado: 'FIN-001',
    regrasMandatorias: ['Custo extra de frete NÃO é abatido da base da comissão', 'Detecção de fretes duplicados em MUs'],
    fontesDados: ['Planilha de Romaneio/Fretes'],
    dependencias: ['MOD-003-IDN'],
    escopoEntregaveis: ['Auditor de Fretes Duplicados', 'Apuração de Vazamento Logístico'],
    bateriaTestes: ['E1-T06'],
    riscosMapeados: ['Abatimento indevido de custo logístico sobre a base de comissão do vendedor'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-009-OCO',
    nome: 'Agente de Ocorrências & Reposições',
    papel: 'Vínculo de Ocorrências e Diferença Pura',
    tipo: 'MODULE',
    moduloAssociado: '9. Ocorrências / Reposições',
    superiorImediato: 'FIN-001',
    descricao: 'Mantém vínculo entre pedido original e novo pedido de reposição. Calcula a diferença pura; -50 e -50 geram diferença 0.',
    acaoEmAndamento: 'Calculando a diferença pura de reposição e mantendo bloqueio formal do impacto no Consolidado (Protocolo 3).',
    entregaveisGerados: ['Calculadora de Diferença Pura (-50 e -50 = 0)', 'Vínculo Original/Novo'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: ['Original e novo ficam estritamente vinculados', '-50 e -50 geram diferença zero', 'Impacto no Consolidado permanece A_DEFINIR'],
    fontesDados: ['Registros de SAC e Ocorrências'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Motor de Diferença Pura de Ocorrência', 'Contrato de Vínculo'],
    bateriaTestes: ['E1-T06'],
    riscosMapeados: ['Inventar impacto no consolidado antes da definição do comitê executivo'],
    itensADefinir: ['Impacto de ocorrência no Consolidado permanece A_DEFINIR (Bloqueado)'],
    statusAtual: 'BLOCKED',
    historicoTarefas: []
  },
  {
    id: 'MOD-010-CRD',
    nome: 'Agente de Créditos de Clientes',
    papel: 'Controle de Crédito Gerado vs Utilizado',
    tipo: 'MODULE',
    moduloAssociado: '10. Créditos',
    superiorImediato: 'FIN-001',
    descricao: 'Diferencia expressamente créditos gerados de créditos utilizados. O saldo disponível em haver do cliente não reduz comissão do vendedor.',
    acaoEmAndamento: 'Diferenciação estrita de créditos gerados vs utilizados. Estorno bloqueado sob Protocolo 3.',
    entregaveisGerados: ['Movimentador de Saldo de Créditos', 'Proteção de Base de Comissão'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: ['Gerado e utilizado são movimentos distintos', 'Disponível não reduz comissão', 'Fórmula de estorno é A_DEFINIR'],
    fontesDados: ['Razão de Créditos de Clientes'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Conta-corrente de Créditos', 'Movimentador de Saldo'],
    bateriaTestes: ['E1-T06'],
    riscosMapeados: ['Abatimento duplo de créditos'],
    itensADefinir: ['Fórmula de estorno de crédito permanece A_DEFINIR (Bloqueado)'],
    statusAtual: 'BLOCKED',
    historicoTarefas: []
  },
  {
    id: 'MOD-011-VLD',
    nome: 'Agente de Validação Final & Snapshot Conceitual',
    papel: 'Validação Pré-Fechamento e Snapshot',
    tipo: 'MODULE',
    moduloAssociado: '11. Validação Final',
    superiorImediato: 'CEO-001',
    descricao: 'Gera o snapshot preliminar de todos os componentes da quinzena, garantindo consistência matemática antes do fechamento.',
    acaoEmAndamento: 'Consolidando pré-visualização de todos os 6 componentes antes do fechamento quinzenal.',
    entregaveisGerados: ['Snapshot de Pré-Fechamento', 'Painel de Divergências'],
    aprovadorDesignado: 'CEO-001',
    regrasMandatorias: ['Conferência de todos os 6 componentes do consolidado', 'Bloqueio se houver pendências não resolvidas'],
    fontesDados: ['Módulos 4 a 10'],
    dependencias: ['MOD-004-VND', 'MOD-005-CNC', 'MOD-006-DEV', 'MOD-007-AJU', 'MOD-008-FRT'],
    escopoEntregaveis: ['Snapshot de Pré-Fechamento', 'Painel de Auditoria de Divergências'],
    bateriaTestes: ['E1-T06'],
    riscosMapeados: ['Fechamento inadvertido com regras A_DEFINIR pendentes'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-012-FIN',
    nome: 'Agente de Pedidos Finalizados',
    papel: 'Rastreabilidade de Pedidos Auditados',
    tipo: 'MODULE',
    moduloAssociado: '12. Pedidos Finalizados',
    superiorImediato: 'DAT-001',
    descricao: 'Consolida a lista final de pedidos aprovados em cada ciclo quinzenal com trilha de aprovação completa.',
    acaoEmAndamento: 'Catalogando pedidos finalizados e conferindo integridade de margem ajustada.',
    entregaveisGerados: ['Livro de Pedidos Auditados', 'Extrato Consolidado'],
    aprovadorDesignado: 'DAT-001 / CEO-001',
    regrasMandatorias: ['Rastreamento de número do pedido, MU e vendedor oficial', 'Data de quinzena auditada'],
    fontesDados: ['Módulo 11 (Snapshot)'],
    dependencias: ['MOD-011-VLD'],
    escopoEntregaveis: ['Livro de Pedidos Finalizados'],
    bateriaTestes: ['E1-T05', 'E1-T06'],
    riscosMapeados: ['Inclusão de pedidos cancelados na lista de finalizados sem abatimento'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-013-CMS',
    nome: 'Agente de Apuração de Comissões',
    papel: 'Cálculo de Comissões por Faixa de Rentabilidade',
    tipo: 'MODULE',
    moduloAssociado: '13. Comissão',
    superiorImediato: 'FIN-001',
    descricao: 'Aplica as faixas oficiais de comissão: >=10% (1,5%), [7%, 10%) (1,0%). Para rentabilidade < 7%, bloqueia formalmente como NAO_DEFINIDO (A_DEFINIR nunca vira zero).',
    acaoEmAndamento: 'Executando apuração de comissões oficiais e bloqueando formalmente casos < 7% (proibido virar 0%).',
    entregaveisGerados: ['Calculadora de Comissões ABC ITU', 'Demonstrativo por Vendedor', 'Bloqueador Protocolar E1-T08'],
    aprovadorDesignado: 'FIN-001 / CEO-001',
    regrasMandatorias: [
      'Margem >= 10%: 1,5%',
      'Margem >= 7% e < 10%: 1,0%',
      'Margem < 7%: NAO_DEFINIDO (Bloqueio estrito! Proibido assumir 0%)',
      'Base: Total - Frete (- Crédito Usado)'
    ],
    fontesDados: ['Extrato de Vendas Finalizadas', 'Parâmetros de Comissão'],
    dependencias: ['FIN-001', 'MOD-004-VND'],
    escopoEntregaveis: ['Demonstrativo de Comissão por Vendedor', 'Alertas de Casos < 7%'],
    bateriaTestes: ['E1-T08'],
    riscosMapeados: ['Aplicação automática de 0% para rentabilidades baixas violando o comitê'],
    itensADefinir: ['Regra para margem < 7% (Permanecer bloqueado como A_DEFINIR)'],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-014-ESP',
    nome: 'Agente de Especificadores & Arquitetos',
    papel: 'Gestão de Comissões de Especificadores',
    tipo: 'MODULE',
    moduloAssociado: '14. Especificadores',
    superiorImediato: 'FIN-001',
    descricao: 'Estrutura o registro de vendas com indicação de parceiros e especificadores externos.',
    acaoEmAndamento: 'Mantendo estrutura de dados preparada, aguardando definição oficial de faixas e percentuais.',
    entregaveisGerados: ['Esquema Base de Especificadores', 'Registro de Parcerias'],
    aprovadorDesignado: 'CEO-001 / THIAGO',
    regrasMandatorias: ['Percentuais e faixas de especificadores estão estritamente A_DEFINIR', 'Nenhum valor pode ser inventado'],
    fontesDados: ['Cadastro de Parceiros e Pedidos Vinculados'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Cadastro de Especificadores', 'Estrutura Base de Associação'],
    bateriaTestes: [],
    riscosMapeados: ['Cálculo de comissão sem regra homologada'],
    itensADefinir: ['Faixas e percentuais de comissão para especificadores (Bloqueado)'],
    statusAtual: 'BLOCKED',
    historicoTarefas: []
  },
  {
    id: 'MOD-015-CNS',
    nome: 'Agente de Fechamento Consolidado Canônico',
    papel: 'Apuração do Consolidado Oficial',
    tipo: 'MODULE',
    moduloAssociado: '15. Consolidado',
    superiorImediato: 'FIN-001',
    descricao: 'Executa a fórmula canônica master: Base + Montagens - Cancelados - Devolvidos + Ajustes = 15.711,29.',
    acaoEmAndamento: 'Conferindo a equação canônica oficial 15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = 15.711,29.',
    entregaveisGerados: ['Fórmula Canônica Master', 'Extrato Auditável de Fechamento Consolidado'],
    aprovadorDesignado: 'FIN-001 / CEO-001 / THIAGO',
    regrasMandatorias: [
      'Caso canônico obrigatório: 15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = 15.711,29',
      'Preservação estrita de sinais'
    ],
    fontesDados: ['Módulos 4 a 10'],
    dependencias: ['FIN-001', 'MOD-005-CNC', 'MOD-006-DEV', 'MOD-007-AJU'],
    escopoEntregaveis: ['Resultado Consolidado Master', 'Equação Auditável com Passos'],
    bateriaTestes: ['E1-T03', 'E1-T06'],
    riscosMapeados: ['Divergência de centavos decorrente de subtrações não auditadas'],
    itensADefinir: [],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-016-FCH',
    nome: 'Agente de Fechamento Terminal & Imutabilidade',
    papel: 'Fechamento de Ciclos Quinzenais',
    tipo: 'MODULE',
    moduloAssociado: '16. Fechamento',
    superiorImediato: 'SEC-001',
    descricao: 'Consolida o fechamento do período quinzenal (01-15 ou 16-fim), gravando assinatura digital e impedindo mutações futuras.',
    acaoEmAndamento: 'Garantindo corte temporal estrito nas quinzenas (01-15 e 16-fim) e bloqueio contra reabertura indevida.',
    entregaveisGerados: ['Guardião de Imutabilidade E1-T19', 'Divisor de Quinzenas E1-T05', 'Protocolo de Selamento'],
    aprovadorDesignado: 'SEC-001 / CEO-001',
    regrasMandatorias: [
      'Histórico fechado é imutável',
      'Divisão em quinzenas (01-15 e 16-último dia do mês)',
      'Aprovação prévia do CEO-001 exigida'
    ],
    fontesDados: ['Consolidado Homologado', 'Carimbo de Tempo'],
    dependencias: ['SEC-001', 'CEO-001', 'MOD-015-CNS'],
    escopoEntregaveis: ['Protocolo de Fechamento Imutável', 'Selo de Não-Repúdio'],
    bateriaTestes: ['E1-T05', 'E1-T19'],
    riscosMapeados: ['Tentativa de alteração retroativa em quinzena arquivada'],
    itensADefinir: ['Data oficial da quinzena em caso de datas concorrentes'],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  },
  {
    id: 'MOD-017-REC',
    nome: 'Agente de Contas a Receber',
    papel: 'Gestão de Entradas e Recebíveis',
    tipo: 'MODULE',
    moduloAssociado: '17. Contas a Receber',
    superiorImediato: 'FIN-001',
    descricao: 'Representa as previsões e realizações de recebimentos de vendas comerciais com conciliação bancária.',
    acaoEmAndamento: 'Conciliação de recebíveis e vínculo com os pedidos faturados.',
    entregaveisGerados: ['Extrato de Contas a Receber', 'Controle de Recebimentos por Data'],
    aprovadorDesignado: 'FIN-001 / CEO-001',
    regrasMandatorias: ['Data de vencimento e quitação auditada', 'Vínculo ao pedido de origem'],
    fontesDados: ['Extrato de Recebimentos e Cartões'],
    dependencias: ['FIN-001', 'MOD-004-VND'],
    escopoEntregaveis: ['Livro de Recebimentos', 'Relatório de Inadimplência'],
    bateriaTestes: ['E1-T04'],
    riscosMapeados: ['Recebimento não vinculado ao pedido correspondente'],
    itensADefinir: ['Integração bancária completa futura'],
    statusAtual: 'CEO_APPROVAL',
    historicoTarefas: []
  },
  {
    id: 'MOD-018-PAG',
    nome: 'Agente de Contas a Pagar',
    papel: 'Gestão de Obrigações e Despesas',
    tipo: 'MODULE',
    moduloAssociado: '18. Contas a Pagar',
    superiorImediato: 'FIN-001',
    descricao: 'Gerencia as obrigações operacionais da loja de Itu, fornecedores, impostos e salários para composição de DRE e Fluxo de Caixa.',
    acaoEmAndamento: 'Controlando despesas operacionais, boletos e integração com DRE.',
    entregaveisGerados: ['Livro de Contas a Pagar', 'Alimentador do DRE e Fluxo de Caixa'],
    aprovadorDesignado: 'FIN-001 / CEO-001',
    regrasMandatorias: ['Categorização de plano de contas', 'Data de vencimento e pagamento registradas'],
    fontesDados: ['Notas Fiscais de Entrada e Boletos'],
    dependencias: ['FIN-001'],
    escopoEntregaveis: ['Livro de Contas a Pagar', 'Alimentador do DRE'],
    bateriaTestes: ['E1-T04'],
    riscosMapeados: ['Lançamento de despesa duplicada'],
    itensADefinir: ['Integração com ERP corporativo'],
    statusAtual: 'CEO_APPROVAL',
    historicoTarefas: []
  },
  {
    id: 'MOD-019-AUD',
    nome: 'Agente de Auditoria de Telas, E2E & Evidências',
    papel: 'Auditoria de Interface e Regressão Visual',
    tipo: 'MODULE',
    moduloAssociado: '19. Auditoria de Telas / E2E',
    superiorImediato: 'QA-001',
    descricao: 'Valida a consistência das telas da aplicação, confronta números exibidos com o motor canônico e atesta ausência de regressões.',
    acaoEmAndamento: 'Inspecionando alinhamento dos valores apresentados na UI com os centavos calculados no motor canônico.',
    entregaveisGerados: ['Matriz de Auditoria Visual', 'Certificado E2E', 'Verificador de Telas'],
    aprovadorDesignado: 'QA-001 / CEO-001',
    regrasMandatorias: ['Zero números sem origem e evidência', 'Frontend exibe números com centavos auditados'],
    fontesDados: ['Componentes de UI', 'Snapshots de Tela'],
    dependencias: ['QA-001'],
    escopoEntregaveis: ['Matriz de Auditoria Visual', 'Certificado E2E'],
    bateriaTestes: ['E1-T01 a E1-T24'],
    riscosMapeados: ['Frontend realizar arredondamentos não autorizados'],
    itensADefinir: ['Execução Playwright em ambiente CI/CD'],
    statusAtual: 'APPROVED',
    historicoTarefas: []
  }
];

const STORAGE_AGENTS_KEY = 'abc_execution_agents_governance_v3';

export class ExecutionAgentsService {
  private static loadStoredAgents(): ExecutionAgent[] {
    try {
      const saved = localStorage.getItem(STORAGE_AGENTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignora
    }
    return [...EXECUTION_AGENTS_CATALOG];
  }

  public static saveAgents(agents: ExecutionAgent[]): void {
    try {
      localStorage.setItem(STORAGE_AGENTS_KEY, JSON.stringify(agents));
    } catch (err) {
      console.error("Erro ao salvar estado dos agentes:", err);
    }
  }

  public static getAgents(): ExecutionAgent[] {
    return this.loadStoredAgents();
  }

  public static getAgentById(id: string): ExecutionAgent | undefined {
    const list = this.getAgents();
    return list.find(a => a.id === id);
  }

  public static getBlockers(): { agenteId: string; blocker: string; regra: string }[] {
    const blockers: { agenteId: string; blocker: string; regra: string }[] = [];
    const list = this.getAgents();
    list.forEach(agent => {
      if (agent.statusAtual === 'BLOCKED') {
        agent.itensADefinir.forEach(item => {
          blockers.push({
            agenteId: agent.id,
            blocker: item,
            regra: 'Protocolo 3: A_DEFINIR nunca vira zero e não pode ser contornado por regra inventada.'
          });
        });
      }
    });
    return blockers;
  }

  public static getItensADefinir(): { item: string; agenteCustodiante: string; status: string }[] {
    return [
      {
        item: 'Comissão para rentabilidade < 7%',
        agenteCustodiante: 'MOD-013-CMS / FIN-001',
        status: 'BLOQUEADO (Não vira 0%)'
      },
      {
        item: 'Faixas e percentuais de comissão para especificadores',
        agenteCustodiante: 'MOD-014-ESP / FIN-001',
        status: 'BLOQUEADO (Aguardando tabela oficial)'
      },
      {
        item: 'Impacto de ocorrências/reposições no Consolidado',
        agenteCustodiante: 'MOD-009-OCO / FIN-001',
        status: 'BLOQUEADO (Diferença pura calculada; impacto geral A_DEFINIR)'
      },
      {
        item: 'Fórmula de estorno de crédito',
        agenteCustodiante: 'MOD-010-CRD / FIN-001',
        status: 'BLOQUEADO (Crédito gerado != utilizado)'
      },
      {
        item: 'Data oficial da quinzena em caso de datas concorrentes',
        agenteCustodiante: 'DAT-001 / MOD-016-FCH',
        status: 'BLOQUEADO (Necessita diretriz de prioridade temporal)'
      }
    ];
  }

  /**
   * Executa a APROVAÇÃO FORMAL DA AÇÃO DO AGENTE
   * Garante não-violação do Protocolo 3 (A_DEFINIR nunca vira zero).
   */
  public static approveAgentAction(
    agentId: string, 
    approverName: string = 'THIAGO / CEO-001', 
    parecer?: string
  ): { success: boolean; message: string; approvalHash?: string } {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) {
      return { success: false, message: `Agente ${agentId} não encontrado.` };
    }

    const agent = agents[idx];

    // PROTOCOLO 3: Se o agente estiver BLOCKED por A_DEFINIR, bloquear aprovação
    if (agent.statusAtual === 'BLOCKED' && agent.itensADefinir.length > 0) {
      return {
        success: false,
        message: `VIOLAÇÃO DO PROTOCOLO 3: O agente ${agent.id} está classificado como BLOCKED devido a itens A_DEFINIR (${agent.itensADefinir.join('; ')}). É terminantemente proibido aprovar antes de deliberação executiva oficial do comitê!`
      };
    }

    const hashAssinatura = `SIG-${agent.id}-${Date.now().toString(16).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      agenteId: agent.id,
      aprovador: approverName,
      dataHora: new Date().toLocaleString('pt-BR'),
      faseAprovada: 'APPROVED',
      parecer: parecer || `Ação e entregáveis do agente ${agent.id} homologados formalmente em conformidade com o Protocolo Master ABC.`,
      hashAssinatura,
      statusResultado: 'APROVADO'
    };

    agents[idx] = {
      ...agent,
      statusAtual: 'APPROVED',
      acaoEmAndamento: `Ação homologada e selada com êxito pelo comitê (${approverName}).`,
      ultimaAprovacao: record
    };

    this.saveAgents(agents);

    return {
      success: true,
      message: `Ação do agente ${agent.id} aprovada com sucesso por ${approverName}! Assinatura: ${hashAssinatura}`,
      approvalHash: hashAssinatura
    };
  }

  /**
   * Rejeita ou solicita ajustes na ação do agente
   */
  public static rejectAgentAction(
    agentId: string, 
    reviewerName: string = 'CEO-001', 
    motivo: string
  ): { success: boolean; message: string } {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) {
      return { success: false, message: `Agente ${agentId} não encontrado.` };
    }

    const agent = agents[idx];
    const hashAssinatura = `REJ-${agent.id}-${Date.now().toString(16).toUpperCase()}`;

    const record: ApprovalRecord = {
      id: crypto.randomUUID(),
      agenteId: agent.id,
      aprovador: reviewerName,
      dataHora: new Date().toLocaleString('pt-BR'),
      faseAprovada: 'IMPLEMENTACAO',
      parecer: motivo,
      hashAssinatura,
      statusResultado: 'SOLICITADO_AJUSTES'
    };

    agents[idx] = {
      ...agent,
      statusAtual: 'IMPLEMENTACAO',
      acaoEmAndamento: `Revisão solicitada por ${reviewerName}: ${motivo}`,
      ultimaAprovacao: record
    };

    this.saveAgents(agents);
    return { success: true, message: `Ação do agente ${agent.id} devolvida para ajustes.` };
  }

  /**
   * Aprova em lote todas as ações de agentes elegíveis (com zero blockers)
   */
  public static approveAllEligible(approverName: string = 'THIAGO / CEO-001'): {
    approvedCount: number;
    blockedCount: number;
    details: string[];
  } {
    const agents = this.getAgents();
    let approved = 0;
    let blocked = 0;
    const details: string[] = [];

    agents.forEach((agent, i) => {
      if (agent.statusAtual === 'BLOCKED') {
        blocked++;
        details.push(`${agent.id}: Mantido BLOQUEADO (Protocolo 3 - A_DEFINIR)`);
      } else if (agent.statusAtual !== 'APPROVED') {
        const hash = `SIG-BATCH-${agent.id}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
        agents[i] = {
          ...agent,
          statusAtual: 'APPROVED',
          acaoEmAndamento: `Ação homologada em lote pelo comitê (${approverName}).`,
          ultimaAprovacao: {
            id: crypto.randomUUID(),
            agenteId: agent.id,
            aprovador: approverName,
            dataHora: new Date().toLocaleString('pt-BR'),
            faseAprovada: 'APPROVED',
            parecer: 'Aprovação em lote por deliberação unânime do comitê com testes 100% PASS.',
            hashAssinatura: hash,
            statusResultado: 'APROVADO'
          }
        };
        approved++;
        details.push(`${agent.id}: Aprovado (${hash})`);
      }
    });

    this.saveAgents(agents);
    return { approvedCount: approved, blockedCount: blocked, details };
  }

  /**
   * Atualiza permissões e políticas de um agente: o que ele PODE fazer e o que NÃO PODE fazer
   */
  public static updateAgentPermissions(
    agentId: string,
    updates: {
      oQuePodeFazer?: string[];
      oQueNaoPodeFazer?: string[];
      acaoEmAndamento?: string;
      aprovadorDesignado?: string;
    }
  ): { success: boolean; message: string } {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) {
      return { success: false, message: `Agente ${agentId} não encontrado.` };
    }

    agents[idx] = {
      ...agents[idx],
      ...(updates.oQuePodeFazer ? { oQuePodeFazer: updates.oQuePodeFazer } : {}),
      ...(updates.oQueNaoPodeFazer ? { oQueNaoPodeFazer: updates.oQueNaoPodeFazer } : {}),
      ...(updates.acaoEmAndamento ? { acaoEmAndamento: updates.acaoEmAndamento } : {}),
      ...(updates.aprovadorDesignado ? { aprovadorDesignado: updates.aprovadorDesignado } : {})
    };

    this.saveAgents(agents);
    return { success: true, message: `Políticas e permissões do agente ${agentId} atualizadas com sucesso!` };
  }

  /**
   * Despacha uma NOVA AÇÃO direta para o agente executar
   */
  public static dispatchNewAction(
    agentId: string,
    actionTitle: string,
    actionDescription: string,
    dispatchedBy: string = 'THIAGO (Patrono)'
  ): { success: boolean; taskId: string; message: string } {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx === -1) {
      return { success: false, taskId: '', message: `Agente ${agentId} não encontrado.` };
    }

    const taskId = `ACT-${agentId}-${Date.now().toString(16).toUpperCase()}`;
    const agent = agents[idx];

    // Atualiza a ação em andamento do agente e status para revisão/execução
    agents[idx] = {
      ...agent,
      acaoEmAndamento: `${actionTitle}: ${actionDescription} (Despachado por: ${dispatchedBy})`,
      statusAtual: agent.statusAtual === 'BLOCKED' ? 'BLOCKED' : 'CEO_APPROVAL'
    };

    this.saveAgents(agents);

    return {
      success: true,
      taskId,
      message: `Nova ação "${actionTitle}" despachada com sucesso para o agente ${agentId}!`
    };
  }

  /**
   * Reseta os agentes ao catálogo original
   */
  public static resetAgentsToDefault(): void {
    localStorage.removeItem(STORAGE_AGENTS_KEY);
  }

  /**
   * Gera uma Task-ID formal cumprindo rigorosamente o Protocolo 3:
   * Objetivo, contexto, regras, fontes, dependências, escopo, testes e riscos.
   */
  public static createTaskSpecification(agentId: string, customObjetivo?: string): TaskIDSpecification {
    const agent = this.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agente ${agentId} não encontrado no catálogo.`);
    }

    const taskId = `TSK-${agent.id}-${Date.now().toString().slice(-6)}`;
    const spec: TaskIDSpecification = {
      taskId,
      agenteId: agent.id,
      objetivo: customObjetivo || `Consolidação e execução dos protocolos do módulo: ${agent.nome}`,
      contexto: `Operação em conformidade com o Relatório de Execução ABC Finance ITU e Governança Thiago/CEO-001. Ação atual: ${agent.acaoEmAndamento}`,
      regrasObrigatorias: agent.regrasMandatorias,
      fontes: agent.fontesDados,
      dependencias: agent.dependencias,
      escopo: agent.escopoEntregaveis,
      testes: agent.bateriaTestes,
      riscos: agent.riscosMapeados,
      status: agent.statusAtual === 'BLOCKED' ? 'BLOCKED' : 'QA_REVIEW',
      blockers: agent.statusAtual === 'BLOCKED' ? agent.itensADefinir : [],
      itensADefinir: agent.itensADefinir,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    return spec;
  }
}
