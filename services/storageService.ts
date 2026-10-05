
import { MesConferencia, HistoricoConsolidado, Pedido, ContaPagar, Recebimento } from '../types';

// Centralização da versão para evitar fragmentação de dados
const VERSION = 'v10';
const STORAGE_KEY = `abc_gestao_vendas_data_${VERSION}`;
const HISTORY_KEY = `abc_gestao_vendas_history_${VERSION}`;
const CONTAS_PAGAR_KEY = `abc_gestao_contas_pagar_${VERSION}`;
const RECEBIMENTOS_KEY = `abc_gestao_recebimentos_${VERSION}`;
const CANCELADOS_LOG_KEY = `abc_cancelados_log_${VERSION}`;
const DEVOLVIDOS_LOG_KEY = `abc_devolvidos_log_${VERSION}`;

export const storageService = {
  // Dados de trabalho atual (Staging)
  saveData: (data: MesConferencia) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  getData: (): MesConferencia | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },
  clearData: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CANCELADOS_LOG_KEY);
    localStorage.removeItem(DEVOLVIDOS_LOG_KEY);
  },

  // Histórico de meses fechados (Consolidado)
  saveToHistory: (mes: MesConferencia) => {
    const history = storageService.getHistory();
    const existingMonthIndex = history.meses.findIndex(m => m.mesReferencia === mes.mesReferencia);

    if (existingMonthIndex > -1) {
      history.meses[existingMonthIndex] = mes;
    } else {
      history.meses.push(mes);
    }

    history.meses.sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  getHistory: (): HistoricoConsolidado => {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : { meses: [] };
  },
  saveHistory: (history: HistoricoConsolidado) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  // Contas a Pagar
  saveContasPagar: (contas: ContaPagar[]) => {
    localStorage.setItem(CONTAS_PAGAR_KEY, JSON.stringify(contas));
  },
  getContasPagar: (): ContaPagar[] => {
    const data = localStorage.getItem(CONTAS_PAGAR_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Recebimentos (Entradas de Fluxo de Caixa)
  saveRecebimentos: (recebimentos: Recebimento[]) => {
    localStorage.setItem(RECEBIMENTOS_KEY, JSON.stringify(recebimentos));
  },
  getRecebimentos: (): Recebimento[] => {
    const data = localStorage.getItem(RECEBIMENTOS_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Logs de Importação
  saveCanceladosLog: (log: any[]) => localStorage.setItem(CANCELADOS_LOG_KEY, JSON.stringify(log)),
  getCanceladosLog: () => JSON.parse(localStorage.getItem(CANCELADOS_LOG_KEY) || '[]'),
  
  saveDevolvidosLog: (log: any[]) => localStorage.setItem(DEVOLVIDOS_LOG_KEY, JSON.stringify(log)),
  getDevolvidosLog: () => JSON.parse(localStorage.getItem(DEVOLVIDOS_LOG_KEY) || '[]'),

  // Limpeza total
  clearAll: () => {
    const keys = [STORAGE_KEY, HISTORY_KEY, CONTAS_PAGAR_KEY, RECEBIMENTOS_KEY, CANCELADOS_LOG_KEY, DEVOLVIDOS_LOG_KEY];
    keys.forEach(k => localStorage.removeItem(k));
  }
};
