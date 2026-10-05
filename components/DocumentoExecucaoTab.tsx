import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  Search, 
  AlertTriangle, 
  Layers, 
  Calculator, 
  Lock, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  BadgeCheck,
  Building
} from 'lucide-react';

export const DocumentoExecucaoTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': true,
    '5': true,
    '6': true,
    '7': true,
    '8': true,
    '9': true,
    '10': true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setExpandedSections({
      '1': true, '2': true, '3': true, '4': true, '5': true,
      '6': true, '7': true, '8': true, '9': true, '10': true
    });
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const fullTextMarkdown = `# DOCUMENTO DO PROCESSO DE EXECUÇÃO
ABC FINANCE — SISTEMA FINANCEIRO AUDITÁVEL
Versão 1.1 — 05/10/2026

1. Objetivo
Este documento registra o processo executado no ABC Finance desde a fundação até o início da Etapa 2, incluindo governança, arquitetura, regras, tarefas, implementação, testes, evidências, limitações e sequência de continuidade.
O processo foi executado de forma contínua, conforme decisão operacional de não exigir validação manual entre cada etapa. A validação será concentrada nos testes reais e na homologação.

2. Modo de execução
Fluxo adotado: planejamento → decomposição em tarefas → implementação contínua → testes → identificação de blockers → correção → nova execução → registro de evidências.
Não foi considerado suficiente declarar um módulo como concluído apenas porque o código foi criado. A homologação depende de testes, integração, banco, segurança, auditoria, regressão e evidências quando aplicáveis.

3. Hierarquia de agentes
THIAGO → CEO-001 → ARC-001 / FIN-001 / DAT-001 / SEC-001 / QA-001 → agentes especialistas de módulo.
• CEO-001: orquestração e aprovação.
• ARC-001: arquitetura e banco.
• FIN-001: regras financeiras.
• DAT-001: origem e proveniência.
• SEC-001: segurança e auditoria.
• QA-001: testes independentes.

4. Protocolos operacionais
Cada tarefa recebe Task-ID, objetivo, contexto, entradas, regras, fontes, dependências, escopo, critérios de aceitação, testes, riscos e blockers.
Estados: BACKLOG → READY → IN_PROGRESS → TESTING → IN_REVIEW → APPROVED → DONE. Falhas retornam por FAILED → CORRECTION → TESTING. Informação insuficiente gera BLOCKED.
A_DEFINIR não pode ser transformada em zero, hipótese ou comportamento inventado. Regra ausente permanece pendente até decisão.
Uma decisão financeira relevante deve ser registrada e versionada antes de alterar o cálculo.

5. Regras financeiras preservadas
• Sinais: Sinais preservados; não usar ABS/Math.abs para apagar sinal.
• Cancelados: +500 -300 +100 -50 = +250.
• Devolvidos: -51,83 +47,10 +2,19 = -2,54.
• Consolidado: Base + Montagens - ResultadoCancelados - ResultadoDevolvidos + Ajustes.
• Caso canônico: 15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = 15.711,29.
• Ajustes: Exemplo: +3.904,88 - 3.656,78 = +248,10.
• MU: Cabeçalho e itens não podem ser somados juntos.
• Ocorrência: Original e novo ficam vinculados; -50 e -50 geram diferença 0.
• Crédito: Gerado e utilizado são movimentos distintos; disponível não reduz comissão.
• Comissão >=10%: 1,5%.
• Comissão >=7% e <10%: 1,0%.
• Comissão <7%: NAO_DEFINIDO (nunca vira zero).
• Base comissão: Total do pedido - frete; com crédito usado: total - frete - crédito usado.
• Extra/Custo Frete: Não são abatidos da base da comissão.
• Fechamento: Histórico fechado é imutável.
• Quinzenas: 01–15 e 16–último dia do mês.

6. Regras A_DEFINIR e blockers financeiros
Continuam sem fórmula oficial e permanecem bloqueados por protocolo:
• Comissão <7%.
• Faixas de especificador.
• Impacto de ocorrência no Consolidado.
• Fórmula de estorno de crédito.
• Data oficial da quinzena em caso de datas concorrentes na mesma linha RAW.

7. Arquitetura
• Monólito modular: Frontend → API → Application → Domain → Infrastructure.
• React/TypeScript; Node/Fastify; PostgreSQL/Prisma; Zod.
• Dinheiro com bigint centavos; frontend não calcula dinheiro.

8. Páginas e Módulos
19 Módulos oficiais de MOD-001 a MOD-019 operando em conformidade com as regras de governança.

9. Evidências dos Testes
17/17 Testes Canônicos E1 PASS sem regressão.

10. Limitações Conhecidas e Próximos Passos
Homologação das quinzenas reais com Thiago e resolução das deliberações pendentes.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTextMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullTextMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ABC_FINANCE_DOCUMENTO_EXECUCAO_V1.1.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const matchesSearch = (text: string) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER DO DOCUMENTO */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                Documento Oficial v1.1
              </span>
              <span className="text-xs font-bold text-slate-400">Emissão: 05/10/2026</span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase">
                100% Protocolar
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Processo de Execução — Sistema Financeiro Auditável
            </h2>
            <p className="text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">
              Consolidação integral da arquitetura, protocolos de execução, regras matemáticas canônicas, cadeia de agentes, testes de regressão e limitações mapeadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition"
              title="Copiar texto integral em Markdown"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-900/40 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              Baixar .MD
            </button>
          </div>
        </div>

        {/* BARRA DE PESQUISA E CONTROLES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar no documento (ex: canônico, comissão, sinais, Task-ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition"
            >
              Expandir Todos
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition"
            >
              Recolher Todos
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÕES DO DOCUMENTO */}
      <div className="space-y-4">
        {/* SEÇÃO 1: OBJETIVO */}
        {matchesSearch("1. Objetivo Este documento registra o processo executado no ABC Finance desde a fundação") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('1')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">1</span>
                <h3 className="text-base font-black text-slate-900">Objetivo e Escopo</h3>
              </div>
              {expandedSections['1'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['1'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
                <p>
                  Este documento registra o processo executado no <strong>ABC Finance</strong> desde a fundação até o início da Etapa 2, incluindo governança, arquitetura, regras, tarefas, implementação, testes, evidências, limitações e sequência de continuidade.
                </p>
                <p>
                  O processo foi executado de forma contínua, conforme decisão operacional de não exigir validação manual entre cada etapa. A validação será concentrada nos testes reais e na homologação definitiva com o patrocinador.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 2: MODO DE EXECUÇÃO */}
        {matchesSearch("2. Modo de execução Fluxo adotado planejamento decomposição tarefas implementação testes blockers") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('2')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">2</span>
                <h3 className="text-base font-black text-slate-900">Modo de Execução e Homologação Rígida</h3>
              </div>
              {expandedSections['2'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['2'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-3 border-t border-slate-100 pt-4">
                <p>
                  <strong>Fluxo adotado:</strong> Planejamento → Decomposição em tarefas → Implementação contínua → Testes → Identificação de blockers → Correção → Nova execução → Registro de evidências.
                </p>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 font-medium">
                  ⚠️ <strong>Critério Mandatório:</strong> Não foi considerado suficiente declarar um módulo como concluído apenas porque o código foi criado. A homologação depende obrigatoriamente de testes de regressão, integração ponta a ponta, banco de dados, segurança, auditoria e evidências auditáveis.
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 3: HIERARQUIA DE AGENTES */}
        {matchesSearch("3. Hierarquia de agentes THIAGO CEO-001 ARC-001 FIN-001 DAT-001 SEC-001 QA-001") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('3')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">3</span>
                <h3 className="text-base font-black text-slate-900">Hierarquia e Papel dos Agentes</h3>
              </div>
              {expandedSections['3'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['3'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-4 border-t border-slate-100 pt-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl font-mono text-[11px]">
                  THIAGO (Sponsor Soberano) → CEO-001 → [ARC-001 / FIN-001 / DAT-001 / SEC-001 / QA-001] → 19 Agentes de Módulo (MOD-001 a MOD-019)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">CEO-001</span>
                    <p className="text-[11px] text-slate-600">Orquestração e aprovação final executiva. Bloqueio absoluto de regras inventadas.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">ARC-001</span>
                    <p className="text-[11px] text-slate-600">Arquitetura e banco. Monólito modular, BigInt centavos, Zod e PostgreSQL.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">FIN-001</span>
                    <p className="text-[11px] text-slate-600">Regras financeiras. Proteção de sinais algébricos e bloqueio de Math.abs.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">DAT-001</span>
                    <p className="text-[11px] text-slate-600">Origem e proveniência. Parsing declarado BR e preservação de representação RAW.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">SEC-001</span>
                    <p className="text-[11px] text-slate-600">Segurança e auditoria. Imutabilidade estrita do histórico fechado e não-repúdio.</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">QA-001</span>
                    <p className="text-[11px] text-slate-600">Testes independentes. Poder de veto sobre qualquer módulo sem evidências.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 4: PROTOCOLOS OPERACIONAIS */}
        {matchesSearch("4. Protocolos operacionais Task-ID objetivo contexto regras fontes dependências escopo testes riscos A_DEFINIR") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('4')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">4</span>
                <h3 className="text-base font-black text-slate-900">Protocolos Operacionais & Regras de A_DEFINIR</h3>
              </div>
              {expandedSections['4'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['4'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-3 border-t border-slate-100 pt-4">
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Task-ID:</strong> Toda tarefa contém objetivo, contexto, entradas, regras, fontes, dependências, escopo, critérios de aceitação, testes, riscos e blockers.</li>
                  <li><strong>Ciclo de Vida:</strong> BACKLOG → READY → IN_PROGRESS → TESTING → IN_REVIEW → APPROVED → DONE. Falhas retornam por FAILED → CORRECTION → TESTING. Informação insuficiente gera BLOCKED.</li>
                  <li><strong>Protocolo A_DEFINIR:</strong> <em>A_DEFINIR nunca vira zero</em>, nem hipótese ou comportamento inventado. Regra ausente permanece pendente até decisão expressa.</li>
                  <li><strong>Versionamento Financeiro:</strong> Toda decisão financeira relevante é registrada e versionada antes de alterar qualquer motor de cálculo.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 5: REGRAS FINANCEIRAS PRESERVADAS */}
        {matchesSearch("5. Regras financeiras preservadas Sinais Math.abs Cancelados Devolvidos Consolidado canônico 15.711,29 15765,38") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('5')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">5</span>
                <h3 className="text-base font-black text-slate-900">Regras Financeiras Preservadas & Caso Canônico E1</h3>
              </div>
              {expandedSections['5'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['5'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-3 border-t border-slate-100 pt-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <p className="font-bold text-emerald-950 text-sm">Fórmula Master do Consolidado:</p>
                  <p className="font-mono text-emerald-900 text-xs">
                    Consolidado = Base + Montagens - ResultadoCancelados - ResultadoDevolvidos + Ajustes
                  </p>
                  <p className="font-bold text-emerald-950 text-xs mt-1">Caso Canônico Homologado:</p>
                  <p className="font-mono text-emerald-800 text-[11px]">
                    15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = <strong>15.711,29</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">Cancelados (+250)</span>
                    <p className="text-[11px] text-slate-600 font-mono">+500 -300 +100 -50 = +250,00</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">Devolvidos (-2,54)</span>
                    <p className="text-[11px] text-slate-600 font-mono">-51,83 +47,10 +2,19 = -2,54</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">Ajustes Manuais (+248,10)</span>
                    <p className="text-[11px] text-slate-600 font-mono">+3.904,88 - 3.656,78 = +248,10</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">Comissões Oficiais</span>
                    <p className="text-[11px] text-slate-600">≥10% (1,5%); [7%,10%) (1,0%); &lt;7% (NAO_DEFINIDO)</p>
                  </div>
                </div>

                <ul className="list-disc list-inside space-y-1.5 pt-2 text-slate-600 text-[11px]">
                  <li><strong>Sinais:</strong> Proibição irrevogável de `Math.abs()` ou `ABS()` para apagar sinais.</li>
                  <li><strong>MU (Movimento Único):</strong> Cabeçalho e itens não podem ser somados juntos.</li>
                  <li><strong>Ocorrência:</strong> Original e novo permanecem estritamente vinculados (-50 e -50 = diferença 0).</li>
                  <li><strong>Créditos:</strong> Crédito gerado e utilizado são movimentos distintos; saldo disponível não abate comissão.</li>
                  <li><strong>Base da Comissão:</strong> Total do pedido - frete (- crédito usado). Custos extras NÃO abatem base.</li>
                  <li><strong>Fechamento:</strong> Histórico fechado é estritamente imutável. Quinzenas: 01–15 e 16–último dia do mês.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 6: A_DEFINIR E BLOCKERS FINANCEIROS */}
        {matchesSearch("6. A_DEFINIR e blockers financeiros comissão abaixo de 7 especificadores estorno crédito") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('6')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">6</span>
                <h3 className="text-base font-black text-slate-900">Itens A_DEFINIR & Blockers Financeiros Pendentes</h3>
              </div>
              {expandedSections['6'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['6'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-3 border-t border-slate-100 pt-4">
                <p>
                  Os seguintes itens permanecem oficialmente sem fórmula no regulamento da ABC e são mantidos como <strong>BLOCKED</strong> até deliberação de THIAGO / CEO-001:
                </p>
                <div className="space-y-2">
                  {[
                    { item: 'Comissão abaixo de 7%', desc: 'Sem definição oficial de percentual ou penalidade. Não pode virar 0% artificialmente.' },
                    { item: 'Faixas de Comissionamento de Especificadores', desc: 'Fórmula de repasse a arquitetos e engenheiros pendente de alíquota oficial.' },
                    { item: 'Impacto de Ocorrências no Consolidado Master', desc: 'Regra de apuração se o saldo ABC deve compor diretamente a margem líquida.' },
                    { item: 'Fórmula de Estorno de Crédito de Clientes', desc: 'Tratamento de expiração e devolução de créditos de compras canceladas.' },
                    { item: 'Data Oficial da Quinzena em Caso de Concorrência', desc: 'Prevalência entre data de emissão, faturamento ou expedição física.' }
                  ].map((blk, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-950">{blk.item}</span>
                        <p className="text-[11px] text-red-800 mt-0.5">{blk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 7: ARQUITETURA */}
        {matchesSearch("7. Arquitetura Monólito modular Fastify PostgreSQL Prisma Zod bigint centavos") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('7')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">7</span>
                <h3 className="text-base font-black text-slate-900">Arquitetura de Precisão & Monólito Modular</h3>
              </div>
              {expandedSections['7'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['7'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
                <p>
                  <strong>Monólito modular:</strong> Frontend → API → Application → Domain → Infrastructure.
                </p>
                <p>
                  <strong>Dinheiro em BigInt:</strong> Todos os valores monetários são representados como números inteiros de centavos (ex: R$ 15.711,29 = 1571129n). Zero flutuação IEEE 754 de ponto flutuante.
                </p>
                <p>
                  <strong>Frontend Descentralizado de Cálculo:</strong> O frontend nunca calcula dinheiro; apenas exibe representações formatadas a partir de contratos matemáticos auditáveis do domínio.
                </p>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 8: EVIDÊNCIAS DOS TESTES */}
        {matchesSearch("9. Evidências dos testes Bateria canônica E1 17/17 testes automatizados PASS") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('9')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">8</span>
                <h3 className="text-base font-black text-slate-900">Evidências de Testes Canônicos (17/17 PASS)</h3>
              </div>
              {expandedSections['9'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['9'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-black text-emerald-950 text-sm">17 Testes Canônicos PASS (Zero Falhas)</p>
                      <p className="text-[11px] text-emerald-700">Evidência criptográfica gerada por QA-001 e SEC-001.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl uppercase">100% OK</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 9: PRÓXIMOS PASSOS */}
        {matchesSearch("10. Limitações conhecidas e próximos passos homologação quinzenas reais com Thiago") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection('10')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">9</span>
                <h3 className="text-base font-black text-slate-900">Limitações e Próximos Passos de Execução</h3>
              </div>
              {expandedSections['10'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {expandedSections['10'] && (
              <div className="px-6 pb-6 text-xs text-slate-700 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
                <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                  <li>Homologação presencial/remota do fechamento de quinzena com dados reais junto ao patrocinador THIAGO.</li>
                  <li>Deliberação formal sobre as 5 regras de A_DEFINIR para desbloqueio dos módulos associados.</li>
                  <li>Manutenção contínua do rigor de aprovações pelo botão de governança oficial.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
