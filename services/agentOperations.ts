/**
 * ABC Finance - Operações Diretas de Agentes de Execução
 * Permite que THIAGO / CEO-001 despache ações operacionais imediatas para os agentes,
 * movendo-os pelo Pipeline de Governança para aprovação executiva formal.
 */

import { MesConferencia, AjusteExtra, Pedido } from '../types';
import { financeEngine } from './financeEngine';
import { storageService } from './storageService';
import { ExecutionAgentsService } from './executionAgents';
import { SpreadsheetParser } from './spreadsheetParser';

export interface OperationResult {
  sucesso: boolean;
  mensagem: string;
  detalhes: string[];
  totalModificados: number;
  dataAtualizada?: MesConferencia;
  hashOperacao: string;
}

export class AgentOperationsEngine {
  /**
   * AÇÃO OPERACIONAL DIRETA (MOD-007-AJU & DAT-001):
   * Analisa as descrições dos ajustes manuais, localiza números de MU/Pedido,
   * vincula aos pedidos originais da conferência ativa e recalcula a margem ajustada.
   * Coloca a tarefa no Pipeline de Governança em "EXECUTADO / ESPERANDO APROVAÇÃO".
   */
  public static vincularMUsDeDescricoesEmAjustes(
    conferencia: MesConferencia | null,
    onSuccessCallback?: (updated: MesConferencia) => void
  ): OperationResult {
    if (!conferencia || !conferencia.ajustesExtras || conferencia.ajustesExtras.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhum ajuste manual encontrado na sessão ativa para analisar.",
        detalhes: ["A lista de ajustes manuais está vazia."],
        totalModificados: 0,
        hashOperacao: `OP-ERR-${Date.now().toString(16)}`
      };
    }

    const pedidos = [...conferencia.pedidos];
    const ajustes = [...conferencia.ajustesExtras];
    const detalhes: string[] = [];
    let countVinculados = 0;

    const norm = (s: string) => String(s || '').trim().replace(/^0+/, '').replace(/\.0+$/, '').toLowerCase();

    // Mapa rápido de pedidos por ID normalizado
    const pedidosMap: Map<string, Pedido> = new Map();
    const knownMUs: string[] = [];

    pedidos.forEach(p => {
      pedidosMap.set(norm(p.id), p);
      knownMUs.push(p.id);
      if (p.idPedidoMestre) {
        pedidosMap.set(norm(p.idPedidoMestre), p);
        knownMUs.push(p.idPedidoMestre);
      }
    });

    // Reset de créditos e débitos para recalcular do zero sem acumular duplicações
    const pedidosAtualizados = pedidos.map(p => ({
      ...p,
      credito: 0,
      debito: 0
    }));

    // Processa cada ajuste buscando identificar MU
    const ajustesAtualizados = ajustes.map(ajuste => {
      let muEncontrada = ajuste.pedidoMU?.trim() || "";

      // Se não tem vínculo explícito, extrai do texto da descrição ou observação
      if (!muEncontrada && ajuste.descricao) {
        const extraido = SpreadsheetParser.extractMUFromText(ajuste.descricao, knownMUs);
        if (extraido) {
          muEncontrada = extraido;
        }
      }

      if (muEncontrada) {
        const pedidoAlvo = pedidosMap.get(norm(muEncontrada));
        
        if (pedidoAlvo) {
          const ajusteFinal: AjusteExtra = {
            ...ajuste,
            pedidoMU: pedidoAlvo.id // ID oficial do pedido
          };

          // Aplica o crédito ou débito no pedido
          const idxPed = pedidosAtualizados.findIndex(p => p.id === pedidoAlvo.id);
          if (idxPed !== -1) {
            if (ajuste.tipo === 'credito') {
              pedidosAtualizados[idxPed].credito += ajuste.valor;
            } else {
              pedidosAtualizados[idxPed].debito += ajuste.valor;
            }
            pedidosAtualizados[idxPed].margemAjustada = financeEngine.calculateMargemFinal(pedidosAtualizados[idxPed]);
          }

          if (!ajuste.pedidoMU || ajuste.pedidoMU !== pedidoAlvo.id) {
            countVinculados++;
            detalhes.push(`Ajuste "${ajuste.descricao}" (R$ ${ajuste.valor.toFixed(2)}) vinculado à MU ${pedidoAlvo.id} (Margem final: R$ ${pedidosAtualizados[idxPed]?.margemAjustada.toFixed(2)}).`);
          }

          return ajusteFinal;
        } else {
          detalhes.push(`MU "${muEncontrada}" citada na descrição "${ajuste.descricao}" não foi localizada na base de pedidos deste mês.`);
        }
      }

      return ajuste;
    });

    // Recalcula margem final e real de todos os pedidos atualizados
    pedidosAtualizados.forEach(p => {
      p.margemAjustada = financeEngine.calculateMargemFinal(p);
      p.margemReal = p.margemAjustada;
    });

    const hashOperacao = `OP-LINK-${Date.now().toString(16).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const dataFinal: MesConferencia = {
      ...conferencia,
      pedidos: pedidosAtualizados,
      ajustesExtras: ajustesAtualizados
    };

    // Salva no storage e chama callback
    storageService.saveData(dataFinal);
    if (onSuccessCallback) {
      onSuccessCallback(dataFinal);
    }

    // Atualiza status do agente MOD-007-AJU para CEO_APPROVAL (Executado, aguardando aprovação no Pipeline!)
    const allAgents = ExecutionAgentsService.getAgents();
    const aIdx = allAgents.findIndex(a => a.id === 'MOD-007-AJU');
    if (aIdx !== -1) {
      allAgents[aIdx].statusAtual = 'CEO_APPROVAL';
      allAgents[aIdx].acaoEmAndamento = `Vinculação Operacional Concluída: ${countVinculados} MUs vinculadas das descrições. Margens finais recalculadas. Aguardando homologação formal de THIAGO. (Hash: ${hashOperacao})`;
      ExecutionAgentsService.saveAgents(allAgents);
    }

    return {
      sucesso: true,
      mensagem: countVinculados > 0 
        ? `Operação concluída com êxito! ${countVinculados} ajuste(s) vinculados a pedidos originais com margens recalculadas. Aguardando aprovação no Pipeline.`
        : `Análise concluída: todos os ajustes já estavam vinculados ou não continham números de MUs correspondentes na base ativa.`,
      detalhes,
      totalModificados: countVinculados,
      dataAtualizada: dataFinal,
      hashOperacao
    };
  }

  /**
   * AÇÃO OPERACIONAL DIRETA (MOD-004-VND & FIN-001):
   * Recalcula a margem ajustada de todos os pedidos da conferência aplicando as regras canônicas.
   * Coloca no Pipeline em "EXECUTADO / ESPERANDO APROVAÇÃO".
   */
  public static recalcularTodasMargens(
    conferencia: MesConferencia | null,
    onSuccessCallback?: (updated: MesConferencia) => void
  ): OperationResult {
    if (!conferencia || conferencia.pedidos.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhum pedido na sessão para recalcular.",
        detalhes: [],
        totalModificados: 0,
        hashOperacao: `OP-ERR-${Date.now().toString(16)}`
      };
    }

    const pedidosAuditados = financeEngine.auditFretes(
      conferencia.pedidos.map(p => ({
        ...p,
        margemAjustada: financeEngine.calculateMargemFinal(p)
      }))
    );

    const hashOperacao = `OP-RECALC-${Date.now().toString(16).toUpperCase()}`;
    const dataFinal: MesConferencia = {
      ...conferencia,
      pedidos: pedidosAuditados
    };

    storageService.saveData(dataFinal);
    if (onSuccessCallback) {
      onSuccessCallback(dataFinal);
    }

    // Coloca FIN-001 em CEO_APPROVAL
    const allAgents = ExecutionAgentsService.getAgents();
    const aIdx = allAgents.findIndex(a => a.id === 'FIN-001');
    if (aIdx !== -1) {
      allAgents[aIdx].statusAtual = 'CEO_APPROVAL';
      allAgents[aIdx].acaoEmAndamento = `Recálculo Integral de Margens Realizado: ${pedidosAuditados.length} pedidos recalculados com sinais preservados. Aguardando aprovação de THIAGO. (Hash: ${hashOperacao})`;
      ExecutionAgentsService.saveAgents(allAgents);
    }

    return {
      sucesso: true,
      mensagem: `Sucesso! Margem ajustada recalculada para todos os ${pedidosAuditados.length} pedidos. Tarefa enviada para aprovação no Pipeline.`,
      detalhes: [`${pedidosAuditados.length} pedidos auditados com sinais preservados.`],
      totalModificados: pedidosAuditados.length,
      dataAtualizada: dataFinal,
      hashOperacao
    };
  }
}
