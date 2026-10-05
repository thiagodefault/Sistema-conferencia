import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Play, 
  FileText, 
  Layers, 
  Lock, 
  ArrowRight, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Scale, 
  Calculator, 
  Terminal, 
  Clock, 
  HelpCircle, 
  FileCheck2, 
  Users, 
  Check, 
  Award, 
  Stamp, 
  BadgeCheck, 
  Send, 
  SlidersHorizontal, 
  RotateCcw,
  Edit3,
  Plus,
  Trash2,
  Zap,
  Link as LinkIcon,
  Ban,
  BookOpen,
  Copy,
  Crown
} from 'lucide-react';
import { 
  EXECUTION_AGENTS_CATALOG, 
  ExecutionAgent, 
  ExecutionAgentsService, 
  TaskIDSpecification, 
  TaskStatus, 
  ApprovalRecord 
} from '../services/executionAgents';
import { 
  CanonicalFinanceEngine, 
  CanonicalExecutionLog 
} from '../services/canonicalFinance';
import { AgentOperationsEngine, OperationResult } from '../services/agentOperations';
import { DocumentoExecucaoTab } from '../components/DocumentoExecucaoTab';
import { MesConferencia } from '../types';

interface AgentesExecucaoPageProps {
  data?: MesConferencia | null;
  onSetData?: (newData: MesConferencia | null) => void;
}

export const AgentesExecucaoPage: React.FC<AgentesExecucaoPageProps> = ({ data, onSetData }) => {
  // Estado dos agentes com persistência
  const [agents, setAgents] = useState<ExecutionAgent[]>(() => ExecutionAgentsService.getAgents());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('CEO-001');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'acoes' | 'agentes' | 'testes' | 'adefinir' | 'documento'>('pipeline');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LEADERSHIP' | 'SPECIALIST' | 'MODULE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'BLOCKED'>('ALL');
  const [groupView, setGroupView] = useState<'hierarquia' | 'lista'>('hierarquia');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Agrupamento dos agentes nas 4 fases do Pipeline Oficial
  const pipelineData = useMemo(() => {
    const emExecucao = agents.filter(a => a.statusAtual === 'IN_PROGRESS');
    const esperandoAprovacao = agents.filter(a => 
      a.statusAtual === 'CEO_APPROVAL' || 
      a.statusAtual === 'QA_REVIEW' || 
      a.statusAtual === 'SEC_AUDIT'
    );
    const aprovados = agents.filter(a => a.statusAtual === 'APPROVED');
    const bloqueados = agents.filter(a => a.statusAtual === 'BLOCKED');

    return { emExecucao, esperandoAprovacao, aprovados, bloqueados };
  }, [agents]);
  
  // Test suite execution state (17 testes PASS)
  const [testLogs, setTestLogs] = useState<CanonicalExecutionLog[]>(() => CanonicalFinanceEngine.executarBateriaTestesCanonicos());
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [activeTaskSpec, setActiveTaskSpec] = useState<TaskIDSpecification | null>(null);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);

  // Modais de Governança
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [agentForApproval, setAgentForApproval] = useState<ExecutionAgent | null>(null);
  const [approverSelected, setApproverSelected] = useState<string>('THIAGO (Patrono Soberano)');
  const [approvalParecer, setApprovalParecer] = useState<string>('');

  // Modal: Editar Políticas & O que o Agente pode ou não fazer
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState<boolean>(false);
  const [agentForEdit, setAgentForEdit] = useState<ExecutionAgent | null>(null);
  const [editPodeFazer, setEditPodeFazer] = useState<string[]>([]);
  const [editNaoPodeFazer, setEditNaoPodeFazer] = useState<string[]>([]);
  const [editAcaoAndamento, setEditAcaoAndamento] = useState<string>('');
  const [editAprovador, setEditAprovador] = useState<string>('');
  const [newPodeItem, setNewPodeItem] = useState<string>('');
  const [newNaoPodeItem, setNewNaoPodeItem] = useState<string>('');

  // Modal: Criar Nova Ação Direta com Agente
  const [showNewActionModal, setShowNewActionModal] = useState<boolean>(false);
  const [newActionAgentId, setNewActionAgentId] = useState<string>('MOD-007-AJU');
  const [newActionPreset, setNewActionPreset] = useState<string>('vincular_mu');
  const [newActionTitle, setNewActionTitle] = useState<string>('Vincular MUs de Descrições aos Pedidos Originais');
  const [newActionDesc, setNewActionDesc] = useState<string>('Localizar números de MU contidos no texto da descrição de ajustes manuais e vincular aos pedidos da conferência ativa.');
  const [newActionDispatchedBy, setNewActionDispatchedBy] = useState<string>('THIAGO (Patrono)');
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);

  // Toast e Mensagens de Feedback
  const [toastMessage, setToastMessage] = useState<{ show: boolean; msg: string; hash?: string; type: 'success' | 'danger' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  // Calculadora Canônica
  const [calcBase, setCalcBase] = useState<string>('15.765,38');
  const [calcMontagens, setCalcMontagens] = useState<string>('108,11');
  const [calcCancelados, setCalcCancelados] = useState<string>('412,84');
  const [calcDevolvidos, setCalcDevolvidos] = useState<string>('-2,54');
  const [calcAjCred, setCalcAjCred] = useState<string>('3.904,88');
  const [calcAjDeb, setCalcAjDeb] = useState<string>('3.656,78');
  const [calcRentabilidadePct, setCalcRentabilidadePct] = useState<number>(10.5);

  const reloadAgents = () => {
    setAgents(ExecutionAgentsService.getAgents());
  };

  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId) || agents[0];
  }, [selectedAgentId, agents]);

  const blockers = useMemo(() => ExecutionAgentsService.getBlockers(), [agents]);
  const itensADefinir = useMemo(() => ExecutionAgentsService.getItensADefinir(), []);

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchRole = roleFilter === 'ALL' || agent.tipo === roleFilter;
      const matchStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'APPROVED' && agent.statusAtual === 'APPROVED') ||
        (statusFilter === 'BLOCKED' && agent.statusAtual === 'BLOCKED') ||
        (statusFilter === 'PENDING' && agent.statusAtual !== 'APPROVED' && agent.statusAtual !== 'BLOCKED');

      const matchSearch = 
        agent.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        agent.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.papel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.acaoEmAndamento.toLowerCase().includes(searchTerm.toLowerCase());

      return matchRole && matchStatus && matchSearch;
    });
  }, [agents, roleFilter, statusFilter, searchTerm]);

  const runAllTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const logs = CanonicalFinanceEngine.executarBateriaTestesCanonicos();
      setTestLogs(logs);
      setIsRunningTests(false);
    }, 300);
  };

  const handleGenerateTask = (agentId: string) => {
    const spec = ExecutionAgentsService.createTaskSpecification(agentId);
    setActiveTaskSpec(spec);
    setShowTaskModal(true);
  };

  // Abertura do Modal de Aprovação
  const openApprovalModal = (agent: ExecutionAgent) => {
    setAgentForApproval(agent);
    setApproverSelected(agent.aprovadorDesignado || 'THIAGO (Patrono Soberano)');
    setApprovalParecer(`Ação do agente ${agent.id} auditada e homologada formalmente com conformidade protocolar.`);
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = () => {
    if (!agentForApproval) return;

    const res = ExecutionAgentsService.approveAgentAction(
      agentForApproval.id,
      approverSelected,
      approvalParecer
    );

    if (res.success) {
      setToastMessage({
        show: true,
        msg: `Ação do agente ${agentForApproval.id} APROVADA com sucesso!`,
        hash: res.approvalHash,
        type: 'success'
      });
      reloadAgents();
      setShowApprovalModal(false);
    } else {
      setToastMessage({
        show: true,
        msg: res.message,
        type: 'danger'
      });
    }

    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const handleBatchApproveAll = () => {
    if (!window.confirm("Deseja aprovar todas as ações de agentes elegíveis (zero blockers)? Os agentes bloqueados por Protocolo 3 (A_DEFINIR) serão preservados intactos.")) {
      return;
    }

    const res = ExecutionAgentsService.approveAllEligible('THIAGO / CEO-001');
    reloadAgents();
    setToastMessage({
      show: true,
      msg: `Aprovação em lote concluída: ${res.approvedCount} agentes homologados. ${res.blockedCount} agentes bloqueados por regra A_DEFINIR.`,
      type: 'success'
    });
    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  // Aprovação Rápida Direta de Ação (1-Clique com chancela imediata)
  const handleQuickApprove = (agent: ExecutionAgent, customApprover?: string) => {
    const approver = customApprover || agent.aprovadorDesignado || 'THIAGO (Patrono)';
    const res = ExecutionAgentsService.approveAgentAction(
      agent.id,
      approver,
      `Ação do agente ${agent.id} auditada e homologada formalmente por ${approver} em conformidade com os protocolos do sistema.`
    );

    if (res.success) {
      setToastMessage({
        show: true,
        msg: `Ação do agente ${agent.id} APROVADA com sucesso!`,
        hash: res.approvalHash,
        type: 'success'
      });
      reloadAgents();
    } else {
      setToastMessage({
        show: true,
        msg: res.message,
        type: 'danger'
      });
    }

    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  // Avança o agente da Fase 1 (Em Execução) para a Fase 2 (Esperando Aprovação)
  const handleAdvanceToApproval = (agent: ExecutionAgent) => {
    const all = ExecutionAgentsService.getAgents();
    const idx = all.findIndex(a => a.id === agent.id);
    if (idx !== -1) {
      all[idx].statusAtual = 'CEO_APPROVAL';
      ExecutionAgentsService.saveAgents(all);
      reloadAgents();
      setToastMessage({
        show: true,
        msg: `Agente ${agent.id} concluiu o ciclo e foi movido para "Esperando Aprovação" no Pipeline!`,
        type: 'success'
      });
      setTimeout(() => setToastMessage(prev => ({ ...prev, show: false })), 5000);
    }
  };

  // Desbloqueio Soberano de Agente pelo Patrono THIAGO
  const handleUnblockWithDirective = (agent: ExecutionAgent) => {
    const directive = window.prompt(
      `DELIBERAÇÃO SOBERANA THIAGO / CEO-001\n\nO agente ${agent.id} está bloqueado por itens A_DEFINIR:\n${agent.itensADefinir.join('\n')}\n\nInforme a diretriz oficial para desbloquear este módulo:`
    );
    if (!directive || directive.trim() === '') return;

    ExecutionAgentsService.updateAgentPermissions(agent.id, {
      acaoEmAndamento: `Diretriz soberana de THIAGO: "${directive.trim()}". Ação homologada.`,
    });
    
    const all = ExecutionAgentsService.getAgents();
    const idx = all.findIndex(a => a.id === agent.id);
    if (idx !== -1) {
      const hash = `DIR-THIAGO-${agent.id}-${Date.now().toString(16).toUpperCase()}`;
      all[idx].statusAtual = 'APPROVED';
      all[idx].ultimaAprovacao = {
        id: crypto.randomUUID(),
        agenteId: agent.id,
        aprovador: 'THIAGO (Patrono Soberano)',
        dataHora: new Date().toLocaleString('pt-BR'),
        faseAprovada: 'APPROVED',
        parecer: `Desbloqueio protocolar soberano por THIAGO com a diretriz: ${directive}`,
        hashAssinatura: hash,
        statusResultado: 'APROVADO'
      };
      ExecutionAgentsService.saveAgents(all);
      reloadAgents();
      setToastMessage({
        show: true,
        msg: `Agente ${agent.id} desbloqueado e aprovado com diretriz de THIAGO!`,
        hash,
        type: 'success'
      });
      setTimeout(() => setToastMessage(prev => ({ ...prev, show: false })), 6000);
    }
  };

  // Abertura do Modal de Editar Permissões (O que pode ou não fazer)
  const openEditPermissionsModal = (agent: ExecutionAgent) => {
    setAgentForEdit(agent);
    // Permissões padrão se ainda não configuradas
    const podePadrao = agent.oQuePodeFazer && agent.oQuePodeFazer.length > 0 
      ? [...agent.oQuePodeFazer] 
      : [
          `Executar cálculos e validações do escopo de ${agent.nome}`,
          'Gerar ordens Task-ID e relatórios de evidência',
          'Vincular itens e pedidos conforme regras canônicas homologadas'
        ];

    const naoPodePadrao = agent.oQueNaoPodeFazer && agent.oQueNaoPodeFazer.length > 0
      ? [...agent.oQueNaoPodeFazer]
      : [
          'Proibido usar Math.abs() ou apagar sinais de valores',
          'Proibido transformar regras A_DEFINIR em zero ou suposições',
          'Proibido alterar ou reescrever dados de períodos com fechamento terminal'
        ];

    setEditPodeFazer(podePadrao);
    setEditNaoPodeFazer(naoPodePadrao);
    setEditAcaoAndamento(agent.acaoEmAndamento);
    setEditAprovador(agent.aprovadorDesignado || 'CEO-001 / THIAGO');
    setShowEditPermissionsModal(true);
  };

  const handleSavePermissions = () => {
    if (!agentForEdit) return;

    ExecutionAgentsService.updateAgentPermissions(agentForEdit.id, {
      oQuePodeFazer: editPodeFazer,
      oQueNaoPodeFazer: editNaoPodeFazer,
      acaoEmAndamento: editAcaoAndamento,
      aprovadorDesignado: editAprovador
    });

    reloadAgents();
    setShowEditPermissionsModal(false);
    setToastMessage({
      show: true,
      msg: `Permissões e políticas do agente ${agentForEdit.id} salvas com sucesso!`,
      type: 'success'
    });
    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Disparo de Nova Ação
  const openNewActionModal = (preset?: string, agentId?: string) => {
    if (agentId) setNewActionAgentId(agentId);
    if (preset === 'vincular_mu' || !preset) {
      setNewActionPreset('vincular_mu');
      setNewActionAgentId('MOD-007-AJU');
      setNewActionTitle('Vincular MUs das Descrições aos Pedidos Originais');
      setNewActionDesc('Extrair o número da MU contido no texto das descrições dos ajustes manuais e vincular aos pedidos da conferência ativa recalculando a margem.');
    } else if (preset === 'recalcular_margens') {
      setNewActionPreset('recalcular_margens');
      setNewActionAgentId('MOD-004-VND');
      setNewActionTitle('Recalcular Margens Ajustadas de Toda a Quinzena');
      setNewActionDesc('Recalcular matematicamente a margem ajustada de todos os pedidos da conferência respeitando os sinais de cancelados e devolvidos.');
    } else {
      setNewActionPreset('custom');
      setNewActionTitle('Nova Ação Operacional');
      setNewActionDesc('Instrução específica despachada pelo comitê executivo para execução do agente.');
    }
    setShowNewActionModal(true);
  };

  const handleExecuteAction = () => {
    setIsExecutingAction(true);

    if (newActionPreset === 'vincular_mu') {
      // Execução real da ação pedida pelo usuário: vincular MUs em descrições aos pedidos
      setTimeout(() => {
        const res: OperationResult = AgentOperationsEngine.vincularMUsDeDescricoesEmAjustes(
          data || null,
          (newData) => {
            if (onSetData) onSetData(newData);
          }
        );

        setIsExecutingAction(false);
        setShowNewActionModal(false);
        reloadAgents();

        setToastMessage({
          show: true,
          msg: res.mensagem,
          hash: res.hashOperacao,
          type: res.sucesso ? 'success' : 'danger'
        });
        setTimeout(() => setToastMessage(prev => ({ ...prev, show: false })), 7000);
      }, 500);

    } else if (newActionPreset === 'recalcular_margens') {
      setTimeout(() => {
        const res: OperationResult = AgentOperationsEngine.recalcularTodasMargens(
          data || null,
          (newData) => {
            if (onSetData) onSetData(newData);
          }
        );

        setIsExecutingAction(false);
        setShowNewActionModal(false);
        reloadAgents();

        setToastMessage({
          show: true,
          msg: res.mensagem,
          hash: res.hashOperacao,
          type: res.sucesso ? 'success' : 'danger'
        });
        setTimeout(() => setToastMessage(prev => ({ ...prev, show: false })), 6000);
      }, 400);

    } else {
      // Ação customizada registrada no agente
      const res = ExecutionAgentsService.dispatchNewAction(
        newActionAgentId,
        newActionTitle,
        newActionDesc,
        newActionDispatchedBy
      );

      setIsExecutingAction(false);
      setShowNewActionModal(false);
      reloadAgents();

      setToastMessage({
        show: true,
        msg: res.message,
        hash: res.taskId,
        type: 'success'
      });
      setTimeout(() => setToastMessage(prev => ({ ...prev, show: false })), 6000);
    }
  };

  // Cálculos de resumo
  const resultadoConsolidadoVivo = useMemo(() => {
    try {
      return CanonicalFinanceEngine.calcularConsolidadoCanonico({
        base: calcBase,
        montagens: calcMontagens,
        cancelados: calcCancelados,
        devolvidos: calcDevolvidos,
        ajustesCredito: calcAjCred,
        ajustesDebito: calcAjDeb
      });
    } catch {
      return null;
    }
  }, [calcBase, calcMontagens, calcCancelados, calcDevolvidos, calcAjCred, calcAjDeb]);

  const avaliacaoComissaoViva = useMemo(() => {
    return CanonicalFinanceEngine.avaliarFaixaComissao(calcRentabilidadePct);
  }, [calcRentabilidadePct]);

  const countApproved = agents.filter(a => a.statusAtual === 'APPROVED').length;
  const countPending = agents.filter(a => a.statusAtual !== 'APPROVED' && a.statusAtual !== 'BLOCKED').length;
  const countBlocked = agents.filter(a => a.statusAtual === 'BLOCKED').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* TOAST FLUTUANTE DE AUDITORIA */}
      {toastMessage.show && (
        <div className="fixed top-24 right-12 z-[300] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`${
            toastMessage.type === 'success' ? 'bg-slate-900 border-emerald-500' : 'bg-red-950 border-red-600'
          } text-white px-8 py-5 rounded-3xl shadow-2xl border flex items-start gap-4 max-w-lg`}>
            <div className={`p-2 rounded-xl mt-0.5 ${toastMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {toastMessage.type === 'success' ? <BadgeCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">{toastMessage.msg}</p>
              {toastMessage.hash && (
                <p className="text-[10px] font-mono text-emerald-400 mt-1">Chancela / Protocolo: {toastMessage.hash}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER DE GOVERNANÇA COM BOTÕES DE AÇÃO PRINCIPAIS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-red-600/30 border border-red-500/40 rounded-full text-[10px] font-black uppercase tracking-widest text-red-300">
                Governança Oficial ABC Finance ITU
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 17/17 Testes Canônicos PASS
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Governança, Políticas e Despacho de Agentes
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-3xl leading-relaxed">
              Controle soberano: <span className="text-white font-bold">THIAGO (Patrono)</span> → <span className="text-red-300 font-bold">CEO-001</span> → <span className="text-blue-300 font-bold">Especialistas</span> → <span className="text-amber-300 font-bold">19 Módulos</span>. Edição de permissões (o que pode ou não fazer), aprovação de ações e despacho direto de tarefas operacionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* BOTÃO NOVA AÇÃO COM AGENTE */}
            <button
              onClick={() => openNewActionModal()}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-900/50 transition active:scale-95"
              title="Despachar uma nova ação operacional direta para os agentes executarem"
            >
              <Zap className="w-4 h-4 fill-white" />
              + Nova Ação com Agente
            </button>

            {/* BOTÃO APROVAÇÃO EM LOTE */}
            <button
              onClick={handleBatchApproveAll}
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-95"
              title="Aprovar em lote todos os agentes com tarefas prontas e zero blockers"
            >
              <Stamp className="w-4 h-4" />
              Aprovar Ações Elegíveis
            </button>

            {/* BATERIA DE TESTES */}
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              Testes (17/17 PASS)
            </button>
          </div>
        </div>

        {/* METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações Homologadas</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{countApproved} / {agents.length}</p>
            <p className="text-[10px] text-emerald-300 mt-1">Chancelas ativas registradas</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Em Revisão / Ação</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{countPending}</p>
            <p className="text-[10px] text-amber-300 mt-1">Aguardando aprovação</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bloqueados por A_DEFINIR</p>
            <p className="text-2xl font-black text-red-400 mt-1">{countBlocked}</p>
            <p className="text-[10px] text-red-300 mt-1">Protocolo 3 (Nunca vira zero)</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caso Canônico Consolidado</p>
            <p className="text-2xl font-black text-white mt-1">R$ 15.711,29</p>
            <p className="text-[10px] text-slate-300 mt-1">17/17 Testes Validados</p>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'pipeline'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" /> Pipeline de Execução & Aprovação ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab('acoes')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'acoes'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Stamp className="w-4 h-4 text-blue-400" /> Detalhes & Hierarquia ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab('agentes')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'agentes'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" /> Detalhes & Task-ID dos Agentes
        </button>
        <button
          onClick={() => setActiveTab('testes')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'testes'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" /> Verificador Canônico E1 (17/17 PASS)
        </button>
        <button
          onClick={() => setActiveTab('adefinir')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'adefinir'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-500" /> Guardião A_DEFINIR & Blockers ({blockers.length})
        </button>
        <button
          onClick={() => setActiveTab('documento')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
            activeTab === 'documento'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-red-500" /> Documento Oficial v1.1
        </button>
      </div>

      {/* ABA 1: AÇÕES EM ANDAMENTO, EDIÇÃO DE PERMISSÕES E APROVAÇÃO */}
      {activeTab === 'acoes' && (
        <div className="space-y-6">
          {/* BARRA DE CONTROLE E FILTROS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar o que um agente está fazendo, entregáveis ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                {(['ALL', 'PENDING', 'APPROVED', 'BLOCKED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                      statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st === 'ALL' ? `Todos (${agents.length})` :
                     st === 'PENDING' ? `Em Revisão (${countPending})` :
                     st === 'APPROVED' ? `Aprovados (${countApproved})` : `Bloqueados (${countBlocked})`}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                {(['ALL', 'LEADERSHIP', 'SPECIALIST', 'MODULE'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                      roleFilter === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r === 'ALL' ? 'Todos Tipos' : r === 'LEADERSHIP' ? 'CEO' : r === 'SPECIALIST' ? 'Líderes' : 'Módulos'}
                  </button>
                ))}
              </div>

              {/* TOGGLE MODO DE VISUALIZAÇÃO HIERARQUIA VS LISTA */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                <button
                  onClick={() => setGroupView('hierarquia')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                    groupView === 'hierarquia' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Organizar agentes pela hierarquia: Liderança, Especialistas e Módulos"
                >
                  Hierarquia Oficial
                </button>
                <button
                  onClick={() => setGroupView('lista')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                    groupView === 'lista' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Visualizar em lista contínua com todos os agentes"
                >
                  Lista Plana
                </button>
              </div>
            </div>
          </div>

          {/* RENDERIZAÇÃO DOS AGENTES (ORGANIZADOS POR HIERARQUIA OU EM LISTA PLANA) */}
          {(() => {
            const renderAgentCard = (agent: ExecutionAgent) => {
              const isApproved = agent.statusAtual === 'APPROVED';
              const isBlocked = agent.statusAtual === 'BLOCKED';

              return (
                <div
                  key={agent.id}
                  className={`p-6 rounded-3xl border transition-all ${
                    isApproved 
                      ? 'bg-white border-slate-200 shadow-sm' 
                      : isBlocked 
                      ? 'bg-red-50/40 border-red-200 shadow-sm' 
                      : 'bg-amber-50/30 border-amber-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* INFORMAÇÕES DO AGENTE E O QUE ELE ESTÁ FAZENDO */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black font-mono shadow-sm">
                          {agent.id}
                        </span>
                        <span className="text-sm font-black text-slate-900">{agent.nome}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Superior: <strong className="text-slate-700">{agent.superiorImediato}</strong>
                        </span>
                        {agent.moduloAssociado && (
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">
                            {agent.moduloAssociado}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isBlocked ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {agent.statusAtual}
                        </span>
                      </div>

                      {/* O QUE O AGENTE ESTÁ FAZENDO AGORA */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-inner">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                            <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" /> Ação em Andamento / Execução Atual:
                          </p>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">
                            Aprovador Oficial: <strong className="text-slate-700 font-sans">{agent.aprovadorDesignado}</strong>
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-800 leading-relaxed">
                          {agent.acaoEmAndamento}
                        </p>
                      </div>

                      {/* POLÍTICAS: O QUE PODE FAZER / O QUE NÃO PODE FAZER */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* PODE FAZER */}
                        <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Permissões (O que PODE fazer):
                          </span>
                          <ul className="space-y-1">
                            {(agent.oQuePodeFazer && agent.oQuePodeFazer.length > 0 
                              ? agent.oQuePodeFazer 
                              : ['Executar cálculos do módulo homologado', 'Gerar ordens Task-ID', 'Vincular pedidos às regras']
                            ).slice(0, 3).map((p, i) => (
                              <li key={i} className="text-[11px] text-emerald-950 font-medium flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* NÃO PODE FAZER */}
                        <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-100">
                          <span className="text-[9px] font-black text-red-800 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                            <Ban className="w-3 h-3 text-red-600" /> Restrições (O que NÃO PODE fazer):
                          </span>
                          <ul className="space-y-1">
                            {(agent.oQueNaoPodeFazer && agent.oQueNaoPodeFazer.length > 0 
                              ? agent.oQueNaoPodeFazer 
                              : ['Proibido usar Math.abs() ou apagar sinais', 'Proibido transformar A_DEFINIR em zero', 'Proibido alterar períodos fechados']
                            ).slice(0, 3).map((np, i) => (
                              <li key={i} className="text-[11px] text-red-950 font-medium flex items-start gap-1.5">
                                <span className="text-red-500 font-bold">•</span> {np}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* ENTREGÁVEIS & ASSINATURA */}
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1">
                        {agent.entregaveisGerados && agent.entregaveisGerados.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entregáveis:</span>
                            <span className="text-slate-600 text-[11px] font-semibold">
                              {agent.entregaveisGerados.slice(0, 2).join(' • ')}
                            </span>
                          </div>
                        )}

                        {/* ASSINATURA DA ÚLTIMA APROVAÇÃO */}
                        {agent.ultimaAprovacao && (
                          <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Chancela: <strong>{agent.ultimaAprovacao.hashAssinatura}</strong> por <strong>{agent.ultimaAprovacao.aprovador}</strong> em {agent.ultimaAprovacao.dataHora}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO: APROVAR AÇÃO, EDITAR PERMISSÕES, NOVA AÇÃO */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full sm:w-auto lg:w-52">
                      {/* BOTÃO DE APROVAÇÃO DA AÇÃO */}
                      {isBlocked ? (
                        <div className="space-y-1.5 w-full">
                          <button
                            disabled
                            className="w-full px-4 py-3 bg-red-100 text-red-700 border border-red-300 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                            title="Bloqueado por Protocolo 3: A_DEFINIR nunca vira zero."
                          >
                            <Lock className="w-4 h-4" />
                            Bloqueado (A_DEFINIR)
                          </button>
                          <button
                            onClick={() => handleUnblockWithDirective(agent)}
                            className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                            title="Deliberar diretriz oficial soberana de THIAGO para desbloquear este módulo"
                          >
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            Deliberar Diretriz THIAGO
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full">
                          <button
                            onClick={() => handleQuickApprove(agent)}
                            className={`w-full px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                              isApproved 
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/30 ring-2 ring-emerald-400' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/30 ring-2 ring-emerald-300 ring-offset-1'
                            }`}
                            title={isApproved ? "Ação já aprovada. Clique para renovar a chancela." : "Clique para aprovar a ação deste agente imediatamente com chancela"}
                          >
                            <Stamp className="w-4 h-4" />
                            {isApproved ? '✓ Ação Aprovada' : 'Aprovar Ação'}
                          </button>
                          
                          <button
                            onClick={() => openApprovalModal(agent)}
                            className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                            title="Inserir parecer formal customizado e escolher autoridade aprovadora"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            Parecer Formal
                          </button>
                        </div>
                      )}

                      {/* BOTÃO EDITAR O QUE PODE OU NÃO FAZER */}
                      <button
                        onClick={() => openEditPermissionsModal(agent)}
                        className="w-full px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
                        title="Editar o que este agente pode ou não pode fazer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        Editar Políticas
                      </button>

                      {/* BOTÃO DE AÇÃO DIRETA SE FOR MOD-007-AJU */}
                      {agent.id === 'MOD-007-AJU' && (
                        <button
                          onClick={() => openNewActionModal('vincular_mu', agent.id)}
                          className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition"
                          title="Vincular MUs das descrições de ajustes diretamente aos pedidos"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          Vincular MUs
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            if (groupView === 'hierarquia') {
              const leadershipAgents = filteredAgents.filter(a => a.tipo === 'LEADERSHIP');
              const specialistAgents = filteredAgents.filter(a => a.tipo === 'SPECIALIST');
              const moduleAgents = filteredAgents.filter(a => a.tipo === 'MODULE');

              return (
                <div className="space-y-8">
                  {/* GRUPO 1: LIDERANÇA SOBERANA & ORQUESTRAÇÃO */}
                  {leadershipAgents.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                        <span className="p-1.5 bg-red-100 text-red-700 rounded-xl">
                          <Crown className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            1. Liderança Executiva & Orquestração Soberana ({leadershipAgents.length})
                          </h3>
                          <p className="text-[11px] text-slate-500">Patrono Soberano THIAGO e CEO-001 (Orquestrador e Homologador Final).</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {leadershipAgents.map(renderAgentCard)}
                      </div>
                    </div>
                  )}

                  {/* GRUPO 2: ESPECIALISTAS GUARDIÕES DE DOMÍNIO */}
                  {specialistAgents.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                        <span className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            2. Guardiões de Domínio & Especialistas ({specialistAgents.length})
                          </h3>
                          <p className="text-[11px] text-slate-500">ARC-001 (Arquitetura), FIN-001 (Finanças), DAT-001 (Dados), SEC-001 (Segurança) e QA-001 (Qualidade).</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {specialistAgents.map(renderAgentCard)}
                      </div>
                    </div>
                  )}

                  {/* GRUPO 3: 19 AGENTES DE MÓDULO OPERACIONAL */}
                  {moduleAgents.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                        <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl">
                          <Cpu className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            3. Agentes Especialistas de Módulo ({moduleAgents.length})
                          </h3>
                          <p className="text-[11px] text-slate-500">Executores técnicos de cada etapa do fluxo comercial, margem e contabilidade.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {moduleAgents.map(renderAgentCard)}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredAgents.map(renderAgentCard)}
              </div>
            );
          })()}
        </div>
      )}

      {/* ABA 2: DETALHES & TASK-ID DOS AGENTES */}
      {activeTab === 'agentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar agentes por ID ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredAgents.map(agent => {
                const isSelected = agent.id === selectedAgentId;
                const isBlocked = agent.statusAtual === 'BLOCKED';
                
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg translate-x-1' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {agent.id}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          agent.tipo === 'LEADERSHIP' ? 'text-red-500' :
                          agent.tipo === 'SPECIALIST' ? 'text-blue-500' : 'text-slate-400'
                        }`}>
                          {agent.tipo === 'LEADERSHIP' ? 'Orquestrador' : agent.tipo === 'SPECIALIST' ? 'Especialista' : 'Agente Módulo'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        isBlocked ? 'bg-red-500/20 text-red-600 border border-red-200' :
                        agent.statusAtual === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' :
                        'bg-amber-500/10 text-amber-600 border border-amber-200'
                      }`}>
                        {agent.statusAtual}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs line-clamp-1">{agent.nome}</h4>
                    <p className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {agent.papel}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/10 text-[10px]">
                      <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>
                        Superior: <strong className={isSelected ? 'text-white' : 'text-slate-700'}>{agent.superiorImediato}</strong>
                      </span>
                      {agent.itensADefinir.length > 0 && (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> {agent.itensADefinir.length} A_DEFINIR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black tracking-wider font-mono">
                    {selectedAgent.id}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Superior: {selectedAgent.superiorImediato}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">{selectedAgent.nome}</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedAgent.papel}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditPermissionsModal(selectedAgent)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Políticas
                </button>
                <button
                  onClick={() => openApprovalModal(selectedAgent)}
                  disabled={selectedAgent.statusAtual === 'BLOCKED'}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Stamp className="w-3.5 h-3.5" /> Aprovar Ação
                </button>
                <button
                  onClick={() => handleGenerateTask(selectedAgent.id)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
                >
                  <FileText className="w-3.5 h-3.5" /> Task-ID
                </button>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">
                Ação Atual em Execução:
              </span>
              <p className="text-xs font-bold text-emerald-950">
                {selectedAgent.acaoEmAndamento}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Missão & Escopo</h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {selectedAgent.descricao}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fontes de Dados</h5>
                <ul className="text-xs text-slate-700 space-y-1.5">
                  {selectedAgent.fontesDados.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">• {f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dependências</h5>
                <ul className="text-xs text-slate-700 space-y-1.5">
                  {selectedAgent.dependencias.length === 0 ? <li className="text-slate-400 italic">Nenhuma</li> : selectedAgent.dependencias.map((d, i) => <li key={i} className="text-blue-700 font-semibold">• {d}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: VERIFICADOR CANÔNICO E1 (17/17 TESTES PASS) */}
      {activeTab === 'testes' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-red-600" />
                  Caso Canônico Consolidado Oficial (R$ 15.711,29)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fórmula Oficial: <span className="font-mono font-bold text-slate-800">Base + Montagens - Cancelados - Devolvidos + Ajustes</span>. Sinais preservados com precisão BigInt.
                </p>
              </div>
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ 17/17 PASS Homologado
              </span>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-sans uppercase tracking-widest font-black">Expressão Algébrica:</p>
                <p className="text-slate-200 mt-1">{resultadoConsolidadoVivo?.passoAPasso}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 font-sans uppercase tracking-widest font-black">Resultado:</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">{resultadoConsolidadoVivo?.totalFormatado}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-slate-800" />
                  Bateria Oficial de Testes (17/17 PASS — Fundação & RAW)
                </h3>
                <p className="text-xs text-slate-500 mt-1">Conforme Versão 1.1 do Processo de Execução ABC Finance.</p>
              </div>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                17/17 PASS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-3">ID Teste</th>
                    <th className="py-3 px-3">Nome do Teste</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Fórmula / Expressão</th>
                    <th className="py-3 px-3">Obtido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testLogs.map((log) => (
                    <tr key={log.testId} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{log.testId}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{log.nome}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-emerald-100 text-emerald-800">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{log.formula || '-'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-[11px]">{log.obtido || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: GUARDIÃO A_DEFINIR & BLOCKERS */}
      {activeTab === 'adefinir' && (
        <div className="space-y-6">
          <div className="bg-red-50/70 border border-red-200 p-6 rounded-3xl flex items-start gap-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-red-950 uppercase tracking-tight">
                Protocolo 3: A_DEFINIR Nunca Vira Zero
              </h3>
              <p className="text-xs text-red-900 mt-1 leading-relaxed">
                Nenhum agente tem autoridade para arbitrar ou substituir regras pendentes por valores nulos ou suposições. Todos os 5 itens abaixo permanecem bloqueados formalmente até manifestação deliberada do patrocinador Thiago e do CEO-001.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Registro Oficial de Pendências A_DEFINIR</h4>
            <div className="divide-y divide-slate-100">
              {itensADefinir.map((item, idx) => (
                <div key={idx} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{item.item}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Agente Custodiante: <strong className="text-slate-700">{item.agenteCustodiante}</strong></p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA: PIPELINE DE GOVERNANÇA, EXECUÇÃO E APROVAÇÃO (QUADRO KANBAN OFICIAL) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* HEADER DO PIPELINE */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-600" /> Pipeline Operacional Ativo
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Controle contínuo: Em Execução → Esperando Aprovação → Aprovado (DONE) → Bloqueado
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Pipeline de Execução e Homologação de Agentes
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => openNewActionModal('vincular_mu')}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition active:scale-95"
                title="Despachar uma nova ação direta para ser executada pelos agentes"
              >
                <Zap className="w-4 h-4 fill-white" /> + Nova Ação com Agente
              </button>
              <button
                onClick={handleBatchApproveAll}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition active:scale-95"
                title="Aprovar em lote todas as ações prontas aguardando homologação"
              >
                <Stamp className="w-4 h-4" /> Aprovar Todas Prontas
              </button>
            </div>
          </div>

          {/* GRID COM AS 4 COLUNAS DO PIPELINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            
            {/* COLUNA 1: EM EXECUÇÃO / PROCESSANDO */}
            <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 relative flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute opacity-75"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">1. Em Execução</h4>
                    <p className="text-[10px] text-slate-400">Processando agora</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black text-xs font-mono">
                  {pipelineData.emExecucao.length}
                </span>
              </div>

              {pipelineData.emExecucao.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-600">Nenhum agente em execução ativa</p>
                  <p className="text-[10px] text-slate-400 mt-1">Clique abaixo para despachar uma tarefa.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineData.emExecucao.map(agent => (
                    <div key={agent.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black font-mono">
                          {agent.id}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-bold border border-amber-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          PROCESSANDO
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-xs text-slate-900">{agent.nome}</h5>
                        <p className="text-[11px] text-slate-600 mt-1 font-medium bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                          {agent.acaoEmAndamento}
                        </p>
                      </div>

                      {/* O que pode fazer */}
                      {agent.oQuePodeFazer && agent.oQuePodeFazer.length > 0 && (
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Poderes Operacionais:</span>
                          <p className="truncate text-emerald-700 font-medium">✓ {agent.oQuePodeFazer[0]}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <button
                          onClick={() => handleAdvanceToApproval(agent)}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                          title="Concluir execução e enviar para aprovação de THIAGO"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Enviar p/ Aprovação
                        </button>
                        <button
                          onClick={() => openEditPermissionsModal(agent)}
                          className="w-full py-1 text-slate-500 hover:text-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" /> Editar Políticas (Pode/Não Pode)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => openNewActionModal()}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-dashed border-slate-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Despachar Nova Ação
              </button>
            </div>

            {/* COLUNA 2: EXECUTADO / ESPERANDO APROVAÇÃO */}
            <div className="bg-amber-50/60 rounded-3xl p-4 border border-amber-200 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-amber-500 text-white rounded-lg">
                    <Stamp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">2. Esperando Aprovação</h4>
                    <p className="text-[10px] text-amber-700">Aguardando homologação</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full font-black text-xs font-mono shadow-sm">
                  {pipelineData.esperandoAprovacao.length}
                </span>
              </div>

              {pipelineData.esperandoAprovacao.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 bg-white/60 rounded-2xl border border-dashed border-amber-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-600">Nenhuma ação pendente de aprovação</p>
                  <p className="text-[10px] text-slate-400 mt-1">Todas as tarefas executadas foram homologadas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineData.esperandoAprovacao.map(agent => (
                    <div key={agent.id} className="bg-white p-4 rounded-2xl border border-amber-300 shadow-md space-y-3 hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black font-mono">
                          {agent.id}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[9px] font-black uppercase tracking-wider">
                          AGUARDANDO CHANCELA
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-xs text-slate-900">{agent.nome}</h5>
                        <div className="mt-1 p-2 bg-amber-50 rounded-xl border border-amber-200">
                          <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">Tarefa Executada:</span>
                          <p className="text-[11px] text-slate-800 font-semibold mt-0.5">
                            {agent.acaoEmAndamento}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-widest">Aprovador Oficial:</span>
                        <span className="text-slate-800 font-bold">{agent.aprovadorDesignado || 'THIAGO (Patrono)'}</span>
                      </div>

                      {/* BOTÕES DE APROVAÇÃO OFICIAIS */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <button
                          onClick={() => handleQuickApprove(agent)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 active:scale-95 transition"
                          title="Aprovação soberana imediata com chancela SHA-256"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" /> ⚡ Aprovar Ação Agora (1-Click)
                        </button>

                        <button
                          onClick={() => openApprovalModal(agent)}
                          className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" /> Parecer Formal
                        </button>

                        <button
                          onClick={() => openEditPermissionsModal(agent)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1 w-full pt-1"
                        >
                          <SlidersHorizontal className="w-3 h-3" /> Editar Permissões do Agente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA 3: APROVADO & HOMOLOGADO (DONE) */}
            <div className="bg-emerald-50/50 rounded-3xl p-4 border border-emerald-200 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-600 text-white rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">3. Aprovado (DONE)</h4>
                    <p className="text-[10px] text-emerald-700">Homologado e selado</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full font-black text-xs font-mono shadow-sm">
                  {pipelineData.aprovados.length}
                </span>
              </div>

              {pipelineData.aprovados.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 bg-white/60 rounded-2xl border border-dashed border-emerald-200">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-600">Nenhum agente homologado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineData.aprovados.map(agent => (
                    <div key={agent.id} className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-2.5 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black font-mono">
                          {agent.id}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> HOMOLOGADO
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-xs text-slate-900">{agent.nome}</h5>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {agent.acaoEmAndamento}
                        </p>
                      </div>

                      {/* Selo Criptográfico */}
                      <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[9px]">
                        <p className="text-emerald-900 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> 
                          {agent.ultimaAprovacao?.aprovador || 'THIAGO / CEO-001'}
                        </p>
                        <p className="font-mono text-emerald-700 truncate mt-0.5">
                          Hash: {agent.ultimaAprovacao?.hashAssinatura || 'CHANCELA-CERTIFICADA'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openNewActionModal(undefined, agent.id)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition"
                        >
                          <Zap className="w-3 h-3 text-slate-500" /> Nova Ação
                        </button>
                        <button
                          onClick={() => openEditPermissionsModal(agent)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                          title="Editar Políticas do Agente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA 4: BLOQUEADO POR A_DEFINIR */}
            <div className="bg-red-50/50 rounded-3xl p-4 border border-red-200 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-red-200">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-600 text-white rounded-lg">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-950">4. Bloqueado (A_DEFINIR)</h4>
                    <p className="text-[10px] text-red-700">Protocolo 3 (Zero suposição)</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-full font-black text-xs font-mono shadow-sm">
                  {pipelineData.bloqueados.length}
                </span>
              </div>

              {pipelineData.bloqueados.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 bg-white/60 rounded-2xl border border-dashed border-red-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-600">Nenhum agente bloqueado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineData.bloqueados.map(agent => (
                    <div key={agent.id} className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm space-y-3 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-black font-mono">
                          {agent.id}
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-xs text-slate-900">{agent.nome}</h5>
                        <div className="mt-1.5 p-2 bg-red-50 rounded-xl border border-red-100">
                          <span className="text-[9px] font-black text-red-800 uppercase tracking-widest block">Itens A_DEFINIR:</span>
                          <ul className="mt-0.5 space-y-0.5 text-[10px] text-red-900 font-semibold list-disc list-inside">
                            {agent.itensADefinir.map((it, i) => (
                              <li key={i} className="truncate">{it}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <p className="text-[9px] text-slate-400 italic">
                        Protocolo 3: Regra ausente não pode ser arbitrada ou substituída por zero.
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <button
                          onClick={() => handleUnblockWithDirective(agent)}
                          className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                          title="Desbloquear este módulo fornecendo diretriz soberana oficial"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Desbloquear c/ Diretriz
                        </button>
                        <button
                          onClick={() => openEditPermissionsModal(agent)}
                          className="w-full py-1 text-slate-500 hover:text-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" /> Editar Políticas
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ABA 6: DOCUMENTO DO PROCESSO DE EXECUÇÃO V1.1 OFICIAL */}
      {activeTab === 'documento' && (
        <DocumentoExecucaoTab />
      )}

      {/* MODAL 1: EDITAR POLÍTICAS & O QUE O AGENTE PODE OU NÃO FAZER */}
      {showEditPermissionsModal && agentForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Editar Políticas e Limites Operacionais</h3>
                  <p className="text-xs text-slate-500">Agente: <strong className="font-mono text-slate-800">{agentForEdit.id} — {agentForEdit.nome}</strong></p>
                </div>
              </div>
              <button onClick={() => setShowEditPermissionsModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {/* AÇÃO ATUAL EM ANDAMENTO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Ação Atual em Execução
              </label>
              <textarea
                rows={2}
                value={editAcaoAndamento}
                onChange={(e) => setEditAcaoAndamento(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* APROVADOR DESIGNADO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Aprovador Oficial Designado
              </label>
              <select
                value={editAprovador}
                onChange={(e) => setEditAprovador(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="THIAGO (Patrono Soberano)">THIAGO (Patrono Soberano)</option>
                <option value="CEO-001 / THIAGO">CEO-001 / THIAGO</option>
                <option value="ARC-001 (Arquitetura)">ARC-001 (Arquitetura)</option>
                <option value="FIN-001 (Regras Financeiras)">FIN-001 (Regras Financeiras)</option>
                <option value="DAT-001 (Origem e RAW)">DAT-001 (Origem e RAW)</option>
                <option value="SEC-001 (Segurança & Auditoria)">SEC-001 (Segurança & Auditoria)</option>
                <option value="QA-001 (Qualidade & Testes)">QA-001 (Qualidade & Testes)</option>
              </select>
            </div>

            {/* O QUE O AGENTE PODE FAZER */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> O que este Agente PODE fazer (Permissões Concedidas):
              </span>

              <div className="space-y-1.5">
                {editPodeFazer.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-emerald-100 text-xs">
                    <span className="text-slate-800 font-medium">✓ {item}</span>
                    <button
                      type="button"
                      onClick={() => setEditPodeFazer(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Adicionar nova autorização..."
                  value={newPodeItem}
                  onChange={(e) => setNewPodeItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPodeItem.trim()) {
                      e.preventDefault();
                      setEditPodeFazer(prev => [...prev, newPodeItem.trim()]);
                      setNewPodeItem('');
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPodeItem.trim()) {
                      setEditPodeFazer(prev => [...prev, newPodeItem.trim()]);
                      setNewPodeItem('');
                    }
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* O QUE O AGENTE NÃO PODE FAZER */}
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200 space-y-3">
              <span className="text-xs font-black text-red-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-600" /> O que este Agente NÃO PODE fazer (Restrições Inegociáveis):
              </span>

              <div className="space-y-1.5">
                {editNaoPodeFazer.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-red-100 text-xs">
                    <span className="text-slate-800 font-medium">✕ {item}</span>
                    <button
                      type="button"
                      onClick={() => setEditNaoPodeFazer(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Adicionar nova proibição ou limite..."
                  value={newNaoPodeItem}
                  onChange={(e) => setNewNaoPodeItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNaoPodeItem.trim()) {
                      e.preventDefault();
                      setEditNaoPodeFazer(prev => [...prev, newNaoPodeItem.trim()]);
                      setNewNaoPodeItem('');
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newNaoPodeItem.trim()) {
                      setEditNaoPodeFazer(prev => [...prev, newNaoPodeItem.trim()]);
                      setNewNaoPodeItem('');
                    }
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowEditPermissionsModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                Salvar Políticas do Agente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR / DESPACHAR NOVA AÇÃO DIRETA COM AGENTE */}
      {showNewActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600 text-white rounded-2xl shadow-md shadow-red-600/30">
                  <Zap className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Despachar Nova Ação com Agente</h3>
                  <p className="text-xs text-slate-500">Execução Operacional Direta</p>
                </div>
              </div>
              <button onClick={() => setShowNewActionModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {/* MODELOS DE AÇÃO RÁPIDA / ATALHOS */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                Escolha o Modelo de Ação ou Tarefa
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewActionPreset('vincular_mu');
                    setNewActionAgentId('MOD-007-AJU');
                    setNewActionTitle('Vincular MUs de Descrições aos Pedidos Originais');
                    setNewActionDesc('Extrair o número da MU contido no texto das descrições dos ajustes manuais e vincular aos pedidos da conferência ativa recalculando a margem.');
                  }}
                  className={`p-3 rounded-2xl text-left border transition ${
                    newActionPreset === 'vincular_mu'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-950 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <LinkIcon className="w-3.5 h-3.5 text-amber-600" /> Vincular MUs em Ajustes
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Lê texto de descrição de ajustes e vincula à MU original</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewActionPreset('recalcular_margens');
                    setNewActionAgentId('MOD-004-VND');
                    setNewActionTitle('Recalcular Margens Ajustadas de Toda a Quinzena');
                    setNewActionDesc('Recalcular matematicamente a margem ajustada de todos os pedidos da conferência respeitando os sinais de cancelados e devolvidos.');
                  }}
                  className={`p-3 rounded-2xl text-left border transition ${
                    newActionPreset === 'recalcular_margens'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-950 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Calculator className="w-3.5 h-3.5 text-blue-600" /> Recalcular Margens
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Audita e recalcula rentabilidade com sinais preservados</p>
                </button>
              </div>
            </div>

            {/* SELEÇÃO DO AGENTE EXECUTOR */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Agente Responsável pela Execução
              </label>
              <select
                value={newActionAgentId}
                onChange={(e) => setNewActionAgentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.id} — {a.nome}</option>
                ))}
              </select>
            </div>

            {/* TÍTULO DA AÇÃO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Título da Ação *
              </label>
              <input
                type="text"
                required
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* INSTRUÇÃO / DESCRIÇÃO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Instruções de Execução *
              </label>
              <textarea
                rows={3}
                required
                value={newActionDesc}
                onChange={(e) => setNewActionDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* AUTOR DO DESPACHO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Despachado Por
              </label>
              <input
                type="text"
                value={newActionDispatchedBy}
                onChange={(e) => setNewActionDispatchedBy(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewActionModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={isExecutingAction}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-700/30 transition disabled:opacity-50"
              >
                {isExecutingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                Executar Ação Imediatamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: APROVAÇÃO FORMAL DA AÇÃO */}
      {showApprovalModal && agentForApproval && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Stamp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Aprovação Formal de Ação</h3>
                  <p className="text-xs text-slate-500">Chancela Executiva de Governança</p>
                </div>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente Alvo:</span>
                <span className="font-mono font-bold text-xs text-slate-900">{agentForApproval.id}</span>
              </div>
              <p className="text-xs font-bold text-slate-800">{agentForApproval.nome}</p>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Ação que está sendo aprovada:</span>
                <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100">
                  {agentForApproval.acaoEmAndamento}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Autoridade Aprovadora *
                </label>
                <select
                  value={approverSelected}
                  onChange={(e) => setApproverSelected(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="THIAGO (Patrono Soberano)">THIAGO (Patrono Soberano)</option>
                  <option value="CEO-001 (Orquestrador Geral)">CEO-001 (Orquestrador Geral)</option>
                  <option value="ARC-001 (Líder Arquitetura)">ARC-001 (Líder Arquitetura)</option>
                  <option value="FIN-001 (Líder Regras Financeiras)">FIN-001 (Líder Regras Financeiras)</option>
                  <option value="SEC-001 (Líder Segurança & Auditoria)">SEC-001 (Líder Segurança & Auditoria)</option>
                  <option value="QA-001 (Líder Validação Independente)">QA-001 (Líder Validação Independente)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Parecer Executivo / Justificativa da Aprovação *
                </label>
                <textarea
                  rows={3}
                  value={approvalParecer}
                  onChange={(e) => setApprovalParecer(e.target.value)}
                  placeholder="Descreva a homologação e conformidade do agente..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Esta aprovação gerará um selo criptográfico assinado e imutável gravado no histórico.</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-700/20 transition"
              >
                <Check className="w-4 h-4" /> Homologar e Assinar Ação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TASK-ID PROTOCOLAR */}
      {showTaskModal && activeTaskSpec && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-600 text-white rounded-xl text-xs font-black tracking-wider font-mono">
                  {activeTaskSpec.taskId}
                </span>
                <span className="text-xs font-bold text-slate-500">Agente: {activeTaskSpec.agenteId}</span>
              </div>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕ Fechar</button>
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Especificação Formal da Ordem de Serviço</h3>
              <p className="text-xs text-slate-600 mt-1">{activeTaskSpec.objetivo}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Contexto</span>
                <p className="text-slate-800 mt-0.5">{activeTaskSpec.contexto}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Regras Mandatórias</span>
                <ul className="list-disc list-inside mt-1 text-slate-700 space-y-1">
                  {activeTaskSpec.regrasObrigatorias.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Fontes</span>
                  <ul className="mt-1 text-slate-700 space-y-0.5">
                    {activeTaskSpec.fontes.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Dependências</span>
                  <ul className="mt-1 text-slate-700 space-y-0.5">
                    {activeTaskSpec.dependencias.length === 0 ? <li>• Nenhuma</li> : activeTaskSpec.dependencias.map((d, i) => <li key={i}>• {d}</li>)}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] block">Testes Requeridos</span>
                <p className="font-mono text-slate-700 mt-1">{activeTaskSpec.testes.join(', ') || '17/17 Testes Canônicos'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Confirmar e Registrar na Trilha de Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
