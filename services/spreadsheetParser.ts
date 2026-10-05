/**
 * ABC Finance - Parser Universal e Inteligente de Planilhas
 * Suporta Excel (.xlsx, .xls, .xlsm, .ods) e CSV (.csv).
 * Compatível com formatos do ERP ABC da Construção, Totvs, Excel e transportadoras.
 */

import * as XLSX from 'xlsx';
import { Pedido, AjusteExtra, ConsolidadoOficialABC } from '../types';

export interface ParseResultVendas {
  primeiroMes: string;
  pedidos: Pedido[];
  multiMonthData: Record<string, Pedido[]>;
  consolidadoOficial?: ConsolidadoOficialABC;
  resumo: {
    totalLinhas: number;
    pedidosValidos: number;
    mesesIdentificados: string[];
    colunasIdentificadas: Record<string, string>;
  };
}

export interface ParseResultAjustes {
  ajustes: AjusteExtra[];
  resumo: {
    totalLidos: number;
    totalCreditos: number;
    totalDebitos: number;
    saldoLiquido: number;
    vinculadosMU: number;
    vinculadosPorDescricao: number;
  };
}

export interface ItemFreteImportado {
  mu: string;
  muOriginal: string;
  peso: number;
  custoTotal: number;
  creditoMontagens: number;
  debitoMontagens: number;
  transportadora?: string;
  cidade?: string;
  data?: string;
  status?: string;
}

export interface ParseResultFrete {
  itens: ItemFreteImportado[];
  resumo: {
    totalLinhas: number;
    itensValidos: number;
    totalCustoFrete: number;
    totalPesoKg: number;
    totalCreditoMontagem: number;
    totalDebitoMontagem: number;
    colunasIdentificadas: Record<string, string>;
    exemplosMUs: string[];
  };
}

export class SpreadsheetParser {
  /**
   * Converte número em qualquer formato BR ou internacional para number JavaScript seguro
   */
  public static parseNumber(val: any): number {
    if (val === null || val === undefined || val === '' || val === '-') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let str = String(val).replace(/R\$/g, '').replace(/\s/g, '').trim();

    // Notação contábil com parênteses: (150,00) = -150.00
    let isNegative = false;
    if (str.startsWith('(') && str.endsWith(')')) {
      isNegative = true;
      str = str.slice(1, -1).trim();
    } else if (str.startsWith('-') || str.endsWith('-')) {
      isNegative = true;
      str = str.replace(/-/g, '').trim();
    } else if (str.startsWith('+')) {
      str = str.replace(/\+/g, '').trim();
    }

    // Se tiver vírgula e ponto: ex 1.234,56 -> remove ponto e troca vírgula por ponto
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      // Formato BR 1234,56
      str = str.replace(',', '.');
    }

    const n = parseFloat(str);
    if (isNaN(n)) return 0;
    return isNegative ? -n : n;
  }

  /**
   * Converte percentual para escala 0 a 100
   */
  public static parsePercent(val: any): number {
    let n = this.parseNumber(val);
    if (Math.abs(n) > 0 && Math.abs(n) <= 1) return n * 100;
    return n;
  }

  /**
   * Converte data do Excel (serial number) ou texto para DD/MM/AAAA
   */
  public static parseDateToBR(val: any, fallbackYearMonth?: string): string {
    if (!val) {
      if (fallbackYearMonth) {
        const [y, m] = fallbackYearMonth.split('-');
        return `01/${m}/${y}`;
      }
      return new Date().toLocaleDateString('pt-BR');
    }

    // Se for número serial do Excel (ex: 45321)
    if (typeof val === 'number') {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
      } catch {
        // ignora
      }
    }

    const str = String(val).trim();

    // Formato ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Formato BR: DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
      const parts = str.split('/');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      return `${day}/${month}/${year}`;
    }

    return str;
  }

  public static extractYearMonthFromBRDate(dateStr: string): string | null {
    const parts = dateStr.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }
    return null;
  }

  /**
   * Lê arquivos de planilha de forma segura, suportando CSV (vírgula, ponto-e-vírgula, tabulação)
   * e arquivos binários Excel (.xlsx, .xls, .xlsm, .ods).
   */
  public static async readWorkbookSafe(file: File): Promise<XLSX.WorkBook> {
    const buffer = await file.arrayBuffer();
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      // Para CSV, decodifica texto para detectar delimitador brasileiro ';'
      let text = '';
      try {
        text = new TextDecoder('utf-8').decode(buffer);
      } catch {
        text = new TextDecoder('iso-8859-1').decode(buffer);
      }

      // Se contém ';' com mais frequência que ',', substitui ou formata
      const firstLines = text.split(/\r?\n/).slice(0, 10).join('\n');
      const countSemi = (firstLines.match(/;/g) || []).length;
      const countComma = (firstLines.match(/,/g) || []).length;

      if (countSemi > countComma) {
        // Arquivo CSV com ponto-e-vírgula (padrão ERP BR)
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const rows = lines.map(line => {
          // split simples preservando aspas
          return line.split(';').map(c => c.replace(/^["']|["']$/g, '').trim());
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        return wb;
      }
    }

    // Leitura nativa com XLSX
    try {
      const data = new Uint8Array(buffer);
      return XLSX.read(data, { type: 'array', cellDates: true });
    } catch {
      // Fallback em modo binário
      const binary = Array.from(new Uint8Array(buffer)).map(b => String.fromCharCode(b)).join('');
      return XLSX.read(binary, { type: 'binary', cellDates: true });
    }
  }

  /**
   * Varre a pasta de trabalho e encontra a melhor planilha com dados
   */
  public static findBestSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        if (range.e.r >= 1 && range.e.c >= 1) {
          return sheet;
        }
      }
    }
    return workbook.Sheets[workbook.SheetNames[0]];
  }

  /**
   * Encontra a linha de cabeçalho real nas primeiras 25 linhas
   * Evita falhas quando a planilha tem títulos, filtros ou linhas em branco no topo.
   */
  public static extractRowsWithSmartHeader(sheet: XLSX.WorkSheet): {
    headerRowIndex: number;
    headers: string[];
    rows: Record<string, any>[];
  } {
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
    if (!matrix || matrix.length === 0) {
      throw new Error("Planilha vazia ou sem dados legíveis.");
    }

    // Termos chave que caracterizam linhas de cabeçalho
    const headerClues = [
      'pedido', 'mu', 'data', 'vendedor', 'total', 'valor', 'margem', 
      'frete', 'canal', 'cliente', 'descricao', 'descrição', 'ajuste', 
      'credito', 'crédito', 'debito', 'débito', 'situacao', 'situação', 'status',
      'cte', 'conhecimento', 'peso', 'romaneio', 'rastreamento', 'transportadora',
      'transporte', 'custo', 'nf', 'nota', 'documento', 'doc', 'ordem'
    ];

    let bestRowIdx = 0;
    let maxMatches = -1;

    // Escaneia as primeiras 25 linhas
    const scanLimit = Math.min(matrix.length, 25);
    for (let r = 0; r < scanLimit; r++) {
      const row = matrix[r] || [];
      const rowStrings = row.map(cell => String(cell || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      
      let matches = 0;
      for (const clue of headerClues) {
        if (rowStrings.some(cellStr => cellStr === clue || cellStr.includes(clue))) {
          matches++;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestRowIdx = r;
      }
    }

    const headerRow = matrix[bestRowIdx] || [];
    const headers = headerRow.map((cell, idx) => {
      const txt = String(cell || '').trim();
      return txt ? txt : `COL_${idx + 1}`;
    });

    const rows: Record<string, any>[] = [];
    for (let r = bestRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const hasContent = row.some(c => c !== null && c !== undefined && String(c).trim() !== "");
      if (!hasContent) continue;

      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = row[colIdx] !== undefined ? row[colIdx] : "";
      });
      rows.push(obj);
    }

    return {
      headerRowIndex: bestRowIdx,
      headers,
      rows
    };
  }

  /**
   * Encontra o nome exato da coluna correspondente a uma lista de alvos sinônimos
   */
  public static findColumnKey(availableHeaders: string[], targets: string[]): string | null {
    const normalizedAvailable = availableHeaders.map(h => ({
      original: h,
      clean: h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim()
    }));

    for (const target of targets) {
      const cleanTarget = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
      
      // Match exato limpo
      const exact = normalizedAvailable.find(h => h.clean === cleanTarget);
      if (exact) return exact.original;

      // Match por inclusão
      const partial = normalizedAvailable.find(h => h.clean.includes(cleanTarget) || cleanTarget.includes(h.clean));
      if (partial) return partial.original;
    }

    return null;
  }

  /**
   * Extrai um número de Pedido/MU contido em texto livre (ex: descrições de ajustes, observações).
   * Suporta formatos como:
   * - "MU 00049281"
   * - "Ajuste pedido 49281"
   * - "Ref MU: 102938"
   * - "PED 49281"
   * - "Nº 00049281"
   * - Ou matching direto com lista de MUs conhecidas da conferência ativa.
   */
  public static extractMUFromText(text: string, knownMUs?: string[]): string | null {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    // 1. Se fornecida lista de MUs conhecidas, verifica se alguma está presente no texto
    if (knownMUs && knownMUs.length > 0) {
      for (const mu of knownMUs) {
        const cleanMu = mu.trim();
        if (!cleanMu) continue;
        const noZeros = cleanMu.replace(/^0+/, '');

        // Match exato de palavra para evitar falsos positivos
        const regexExact = new RegExp(`\\b0*${noZeros}\\b`, 'i');
        if (regexExact.test(trimmed)) {
          return cleanMu;
        }
      }
    }

    // 2. Padrões com prefixo semântico explícito (MU, Pedido, etc.)
    const semanticRegex = /(?:mu|pedido|ped|ordem|cte|nf|nota|doc|nº\s*mu|num\s*mu|n[ºo°]|numero)\s*[:#\.\-\/]?\s*([0-9]{4,12})/i;
    const matchSemantic = trimmed.match(semanticRegex);
    if (matchSemantic && matchSemantic[1]) {
      return matchSemantic[1].trim();
    }

    // 3. Sequência numérica padrão de ERP (5 a 9 dígitos isolados)
    const numericRegex = /\b([0-9]{5,9})\b/;
    const matchNum = trimmed.match(numericRegex);
    if (matchNum && matchNum[1]) {
      return matchNum[1].trim();
    }

    return null;
  }

  /**
   * Normaliza um código de MU removendo sufixos float (ex: '49281.0'), espaços, 
   * e estritamente a parte do 'PD' em diante conforme solicitado pelo usuário:
   * "na tela vamos deixar limpo no MU a parte do PD em diante nao precisa trazer só preciso do Mu e os numeros"
   * Retorna apenas a MU e seus números limpos (ex: '6250210').
   */
  public static cleanMU(val: any): string {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    // Se veio do Excel como float: "49281.0"
    if (str.endsWith('.0')) {
      str = str.slice(0, -2);
    }
    // Remove rigorosamente tudo a partir de '/ PD', '- PD', '| PD', ' PD' até o fim
    str = str.replace(/\s*[\/\-\–\|_]\s*PD\b.*$/gi, '').trim();
    str = str.replace(/\s+PD\s*[:#\.\-\s]*\d+.*$/gi, '').trim();
    str = str.replace(/PD\s*[:#\.\-\s]*\d+.*$/gi, '').trim();
    // Remove prefixo literal "MU"
    str = str.replace(/^MU\s*[:#\-\s]*/i, '').trim();
    // Extrai o bloco numérico principal da MU
    const match = str.match(/\b([0-9]{4,14})\b/);
    if (match) return match[1];
    return str.trim();
  }

  /**
   * Formata a exibição do MU na tela: "MU " + números limpos
   */
  public static formatDisplayMU(val: any): string {
    const clean = this.cleanMU(val);
    if (!clean) return '';
    return `MU ${clean}`;
  }

  /**
   * Extrai o número do Pedido Mestre / PD se presente no texto original
   */
  public static extractPD(val: any): string | null {
    if (!val) return null;
    const str = String(val);
    const match = str.match(/PD\s*[:#\.\-\s]*([0-9]{4,12})/i);
    return match ? `PD ${match[1]}` : null;
  }

  /**
   * PARSER DE VENDAS BASE (Conferência Mensal)
   */
  public static async parseVendasBase(file: File, configAutoIgnoreDuplicates = true): Promise<ParseResultVendas> {
    const workbook = await this.readWorkbookSafe(file);
    const sheet = this.findBestSheet(workbook);
    const { headers, rows } = this.extractRowsWithSmartHeader(sheet);

    if (rows.length === 0) {
      throw new Error(`A planilha selecionada ("${file.name}") não contém linhas de dados após a leitura do cabeçalho.`);
    }

    const keyMU = this.findColumnKey(headers, [
      "nº pedido mu", "pedido mu", "mu", "pedido", "nº pedido", "numero pedido", 
      "id pedido", "num pedido", "documento", "venda", "ordem", "nf"
    ]);

    if (!keyMU) {
      throw new Error(
        `Não foi possível localizar a coluna de Identificação do Pedido / MU na planilha.\n` +
        `Colunas encontradas: ${headers.slice(0, 10).join(', ')}...`
      );
    }

    const keyData = this.findColumnKey(headers, [
      "data faturamento", "data pedido", "data fatur", "dt faturamento", "data", "dt. fatur", "emissao", "data emissao"
    ]);
    const keyVendedor = this.findColumnKey(headers, [
      "vendedor", "nome vendedor", "consultor", "atendente", "vendedor(a)", "funcionario", "representante"
    ]);
    const keyTotal = this.findColumnKey(headers, [
      "total pedido (r$)", "total pedido", "valor total", "total venda", "preco total", "preço total", "total (r$)", "total", "valor liquido", "vlr total"
    ]);
    const keyCanal = this.findColumnKey(headers, [
      "canal venda", "canal", "tipo venda", "tipo de pedido", "origem", "canal de venda"
    ]);
    const keyMargemRS = this.findColumnKey(headers, [
      "margem liq. c/ frete", "margem líq. c/ frete", "margem liq", "margem r$", "margem contribuicao", "margem de contribuicao", "margem", "lucro", "resultado"
    ]);
    const keyMargemPct = this.findColumnKey(headers, [
      "margem produto c/frete (%)", "margem %", "rentabilidade", "margem (%)", "rentabilidade (%)"
    ]);
    const keyFrete = this.findColumnKey(headers, [
      "frete", "valor frete", "frete cobrado", "vlr frete", "frete cliente", "frete r$"
    ]);
    const keyStatus = this.findColumnKey(headers, [
      "status pedido", "situacao", "situação", "status", "status da venda", "posicao"
    ]);

    const defaultMonth = new Date().toISOString().slice(0, 7);
    const multiMonthData: Record<string, Record<string, Pedido>> = {};
    let validCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rawMU = this.cleanMU(r[keyMU]);

      if (!rawMU || rawMU.toUpperCase().includes("TOTAL") || rawMU.toUpperCase().includes("SOMA")) {
        continue;
      }

      const dateRaw = keyData ? r[keyData] : null;
      const dateStr = this.parseDateToBR(dateRaw, defaultMonth);
      const monthKey = this.extractYearMonthFromBRDate(dateStr) || defaultMonth;

      if (!multiMonthData[monthKey]) {
        multiMonthData[monthKey] = {};
      }

      if (configAutoIgnoreDuplicates && multiMonthData[monthKey][rawMU]) {
        continue;
      }

      const statusStr = keyStatus ? String(r[keyStatus] || "").toUpperCase() : "";
      const isCancelado = statusStr.includes("CANCEL") || statusStr.includes("ESTORN");
      const isDevolvido = statusStr.includes("DEVOL") || statusStr.includes("TROCA");
      
      const margemOrig = keyMargemRS ? this.parseNumber(r[keyMargemRS]) : 0;
      const margemPct = keyMargemPct ? this.parsePercent(r[keyMargemPct]) : 0;
      const totalVal = keyTotal ? this.parseNumber(r[keyTotal]) : 0;
      const freteVal = keyFrete ? this.parseNumber(r[keyFrete]) : 0;

      multiMonthData[monthKey][rawMU] = {
        id: rawMU,
        data: dateStr,
        canal: keyCanal ? String(r[keyCanal] || "").trim() : "Venda Loja",
        vendedor: keyVendedor ? String(r[keyVendedor] || "").trim() : "Geral",
        total: totalVal,
        frete: freteVal,
        margemOriginal: margemOrig,
        margemOriginalPct: margemPct,
        credito: 0,
        debito: 0,
        isOcorrencia: false,
        isCancelado,
        isDevolvido,
        margemDeduzidaCancelamento: isCancelado ? margemOrig : 0,
        margemDeduzidaDevolucao: isDevolvido ? margemOrig : 0,
        margemAjustada: margemOrig,
        confirmado: false,
        isDivergente: false
      };
      validCount++;
    }

    const monthsFound = Object.keys(multiMonthData);
    if (monthsFound.length === 0 || validCount === 0) {
      throw new Error(`Nenhum pedido ou MU válida pôde ser extraída da planilha "${file.name}". Verifique se o arquivo possui dados na tabela.`);
    }

    const formattedMultiMonth: Record<string, Pedido[]> = {};
    monthsFound.forEach(m => {
      formattedMultiMonth[m] = Object.values(multiMonthData[m]);
    });

    monthsFound.sort().reverse();
    const primeiroMes = monthsFound[0];

    // Detecção automática de aba 'Consolidado' no mesmo arquivo Excel
    const consolidadoOficial = this.parseConsolidadoSheet(workbook);

    return {
      primeiroMes,
      pedidos: formattedMultiMonth[primeiroMes],
      multiMonthData: formattedMultiMonth,
      consolidadoOficial: consolidadoOficial || undefined,
      resumo: {
        totalLinhas: rows.length,
        pedidosValidos: validCount,
        mesesIdentificados: monthsFound,
        colunasIdentificadas: {
          MU: keyMU || 'Não localizada',
          Data: keyData || 'Padrão mês atual',
          Vendedor: keyVendedor || 'Geral',
          Total: keyTotal || 'Zero',
          Margem: keyMargemRS || 'Zero'
        }
      }
    };
  }

  /**
   * PARSER DE AJUSTES MANUAIS (Créditos / Débitos adicionais)
   * Com detecção inteligente de MU em colunas dedicadas OU extração direta das descrições.
   */
  public static async parseAjustes(file: File, knownMUs?: string[]): Promise<ParseResultAjustes> {
    const workbook = await this.readWorkbookSafe(file);
    const sheet = this.findBestSheet(workbook);
    const { headers, rows } = this.extractRowsWithSmartHeader(sheet);

    if (rows.length === 0) {
      throw new Error(`A planilha de ajustes "${file.name}" está vazia ou sem linhas legíveis.`);
    }

    // Busca de colunas de Ajustes
    const keyId = this.findColumnKey(headers, [
      "id", "id ajuste", "id lancamento", "id lançamento", "nº lancamento", "lancamento", "código", "cod", "sequencial"
    ]);

    const keyDescricao = this.findColumnKey(headers, [
      "descricao", "descrição", "motivo", "historico", "histórico", "justificativa", "obs", "observacao", "observação", "detalhe", "lancamento"
    ]);

    const keyValor = this.findColumnKey(headers, [
      "valor", "valor ajuste", "valor (r$)", "vlr ajuste", "r$", "valor liquido", "montante", "total"
    ]);

    const keyCreditoSeparado = this.findColumnKey(headers, ["credito", "crédito", "credito (r$)", "valor credito"]);
    const keyDebitoSeparado = this.findColumnKey(headers, ["debito", "débito", "debito (r$)", "valor debito"]);

    const keyTipo = this.findColumnKey(headers, [
      "tipo", "c/d", "natureza", "operacao", "operação", "tipo ajuste", "credito/debito", "tipo de lancamento"
    ]);

    const keyMU = this.findColumnKey(headers, [
      "pedido mu", "mu", "pedido", "nº pedido mu", "nº pedido", "numero mu", "nº mu", "nota", "documento", "doc", "id pedido"
    ]);

    const keyData = this.findColumnKey(headers, [
      "data", "data ajuste", "data lancamento", "data lançamento", "competencia", "competência", "emissao"
    ]);

    const keyObs = this.findColumnKey(headers, [
      "observacao", "observação", "obs", "notas", "complemento", "referencia", "referência"
    ]);

    const ajustes: AjusteExtra[] = [];
    let totalCred = 0;
    let totalDeb = 0;
    let vinculadosCount = 0;
    let vinculadosPorDescCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      const rawId = keyId ? String(r[keyId] || "").trim() : "";
      let descricao = keyDescricao ? String(r[keyDescricao] || "").trim() : "";
      let mu = keyMU ? this.cleanMU(r[keyMU]) : "";
      const dataStr = keyData ? this.parseDateToBR(r[keyData]) : new Date().toLocaleDateString('pt-BR');

      // Se a coluna de MU não estava presente ou a célula estava vazia,
      // busca automaticamente o número do MU dentro da descrição ou observação!
      if (!mu) {
        const textToSearch = [
          descricao,
          keyObs ? String(r[keyObs] || '') : '',
          // Varre todas as células da linha se necessário
          Object.values(r).map(v => String(v || '')).join(' ')
        ].join(' ');

        const extracted = this.extractMUFromText(textToSearch, knownMUs);
        if (extracted) {
          mu = extracted;
          vinculadosPorDescCount++;
        }
      }

      let tipo: 'credito' | 'debito' = 'credito';
      let valor = 0;

      // Caso 1: Colunas separadas de Crédito e Débito
      if (keyCreditoSeparado || keyDebitoSeparado) {
        const valCred = keyCreditoSeparado ? this.parseNumber(r[keyCreditoSeparado]) : 0;
        const valDeb = keyDebitoSeparado ? this.parseNumber(r[keyDebitoSeparado]) : 0;

        if (Math.abs(valCred) > 0) {
          tipo = 'credito';
          valor = Math.abs(valCred);
        } else if (Math.abs(valDeb) > 0) {
          tipo = 'debito';
          valor = Math.abs(valDeb);
        }
      } 
      
      // Caso 2: Coluna única de Valor + Tipo
      if (valor === 0 && keyValor) {
        const rawValor = this.parseNumber(r[keyValor]);
        
        if (rawValor < 0) {
          tipo = 'debito';
          valor = Math.abs(rawValor);
        } else {
          valor = rawValor;
          
          if (keyTipo) {
            const rawTipo = String(r[keyTipo] || "").toLowerCase().trim();
            if (rawTipo.includes('deb') || rawTipo === 'd' || rawTipo.includes('sub') || rawTipo.includes('-')) {
              tipo = 'debito';
            } else {
              tipo = 'credito';
            }
          }
        }
      }

      if (!descricao) {
        descricao = mu ? `Ajuste Pedido ${mu}` : `Ajuste Linha ${i + 1}`;
      }

      // Ignora linhas sem valor
      if (valor <= 0) continue;

      if (tipo === 'credito') totalCred += valor;
      else totalDeb += valor;

      if (mu) vinculadosCount++;

      const idOficial = rawId || (rawId ? String(rawId) : `AJ-${i + 1}`);

      ajustes.push({
        id: idOficial || crypto.randomUUID(),
        idOficialABC: idOficial,
        descricao,
        valor,
        tipo,
        pedidoMU: mu || undefined,
        data: dataStr,
        origemPlanilha: file.name,
        linhaPlanilha: i + 2,
        statusAlocacao: mu ? 'ALOCADO' : 'NAO_ALOCADO'
      });
    }

    if (ajustes.length === 0) {
      throw new Error(
        `Nenhum ajuste válido foi encontrado na planilha "${file.name}".\n` +
        `Certifique-se de que a planilha contenha colunas como "Descrição", "Valor", "Tipo" (Crédito/Débito) ou colunas específicas.`
      );
    }

    return {
      ajustes,
      resumo: {
        totalLidos: ajustes.length,
        totalCreditos: totalCred,
        totalDebitos: totalDeb,
        saldoLiquido: totalCred - totalDeb,
        vinculadosMU: vinculadosCount,
        vinculadosPorDescricao: vinculadosPorDescCount
      }
    };
  }

  /**
   * PARSER UNIVERSAL DE PLANILHA DE FRETE / LOGÍSTICA
   * Compatível com exportações de transportadoras, CTEs, Romaneios e ERP ABC da Construção.
   */
  public static async parsePlanilhaFrete(file: File, knownMUs?: string[]): Promise<ParseResultFrete> {
    const workbook = await this.readWorkbookSafe(file);
    const sheet = this.findBestSheet(workbook);
    const { headers, rows } = this.extractRowsWithSmartHeader(sheet);

    if (rows.length === 0) {
      throw new Error(`A planilha de frete "${file.name}" está vazia ou sem linhas legíveis.`);
    }

    // Busca ampliada de coluna de Pedido / MU
    const keyMU = this.findColumnKey(headers, [
      "pedido mu", "mu", "nº pedido mu", "nº pedido", "pedido", "numero pedido", 
      "id pedido", "num pedido", "romaneio", "cte", "nº cte", "conhecimento", 
      "nota fiscal", "nf", "nº nf", "documento", "doc", "nº doc", "ordem", 
      "venda", "chave", "rastreamento", "pedido cliente", "codigo"
    ]);

    // Busca de coluna de Custo Total de Frete
    const keyCustoTotal = this.findColumnKey(headers, [
      "custo total", "custo total logistico", "custo logistico", "custo", 
      "valor frete", "frete", "valor pago", "valor cte", "total frete", 
      "vlr frete", "frete real", "frete cobrado", "custo frete", "valor do frete", 
      "valor total", "valor prestacao", "preco frete", "frete liquido", "total"
    ]);

    // Busca de coluna de Peso
    const keyPeso = this.findColumnKey(headers, [
      "peso", "peso real", "peso kg", "peso (kg)", "peso bruto", "peso liquido", 
      "peso taxado", "peso aferido", "kg", "peso total"
    ]);

    // Busca de Crédito e Débito de Montagens
    const keyCredMontagem = this.findColumnKey(headers, [
      "crédito montagens", "credito montagens", "credito montagem", "cred montagem", "montagem credito"
    ]);
    const keyDebMontagem = this.findColumnKey(headers, [
      "débito montagens", "debito montagens", "debito montagem", "deb montagem", "montagem debito"
    ]);

    // Colunas opcionais de contexto
    const keyTransp = this.findColumnKey(headers, ["transportadora", "transp", "transportador", "empresa", "fornecedor"]);
    const keyCidade = this.findColumnKey(headers, ["cidade", "destino", "municipio", "cidade destino"]);
    const keyData = this.findColumnKey(headers, ["data", "data entrega", "data envio", "data cte", "emissao", "dt entrega"]);
    const keyStatus = this.findColumnKey(headers, ["status", "situacao", "situação", "posicao", "status entrega"]);

    // Se nenhuma coluna óbvia de MU foi identificada pelo nome:
    // Tenta encontrar coluna que contenha padrões numéricos nas primeiras linhas
    let effectiveKeyMU = keyMU;
    if (!effectiveKeyMU) {
      for (const h of headers) {
        const sampleValues = rows.slice(0, 10).map(r => String(r[h] || '').trim());
        const hasMuPattern = sampleValues.filter(v => /^[0-9]{4,10}(\.0)?$/.test(v)).length >= 3;
        if (hasMuPattern) {
          effectiveKeyMU = h;
          break;
        }
      }
    }

    if (!effectiveKeyMU) {
      throw new Error(
        `Não foi possível localizar a coluna de Identificação de Pedido / MU na planilha de frete "${file.name}".\n` +
        `Colunas encontradas no arquivo: [${headers.join(', ')}].\n` +
        `Dica: Certifique-se de que há uma coluna com "Pedido", "MU", "Nota Fiscal", "CTE" ou baixe o modelo padrão.`
      );
    }

    const itens: ItemFreteImportado[] = [];
    let totalCustoFrete = 0;
    let totalPesoKg = 0;
    let totalCredMont = 0;
    let totalDebMont = 0;
    const exemplosMUs: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let rawVal = r[effectiveKeyMU];
      let mu = this.cleanMU(rawVal);

      // Se a célula estiver vazia, tenta extrair de outras colunas de texto da linha
      if (!mu) {
        const lineText = Object.values(r).map(v => String(v || '')).join(' ');
        const extracted = this.extractMUFromText(lineText, knownMUs);
        if (extracted) mu = extracted;
      }

      if (!mu || mu.toUpperCase().includes("TOTAL") || mu.toUpperCase().includes("SOMA")) {
        continue;
      }

      const peso = keyPeso ? this.parseNumber(r[keyPeso]) : 0;
      const custoTotal = keyCustoTotal ? this.parseNumber(r[keyCustoTotal]) : 0;
      const credMont = keyCredMontagem ? this.parseNumber(r[keyCredMontagem]) : 0;
      const debMont = keyDebMontagem ? this.parseNumber(r[keyDebMontagem]) : 0;

      totalCustoFrete += custoTotal;
      totalPesoKg += peso;
      totalCredMont += credMont;
      totalDebMont += debMont;

      if (exemplosMUs.length < 5) {
        exemplosMUs.push(mu);
      }

      itens.push({
        mu,
        muOriginal: String(rawVal || mu),
        peso,
        custoTotal,
        creditoMontagens: credMont,
        debitoMontagens: debMont,
        transportadora: keyTransp ? String(r[keyTransp] || '').trim() : undefined,
        cidade: keyCidade ? String(r[keyCidade] || '').trim() : undefined,
        data: keyData ? this.parseDateToBR(r[keyData]) : undefined,
        status: keyStatus ? String(r[keyStatus] || '').trim() : 'entregue'
      });
    }

    if (itens.length === 0) {
      throw new Error(`Nenhum item com código de MU válido foi encontrado na planilha de frete "${file.name}".`);
    }

    return {
      itens,
      resumo: {
        totalLinhas: rows.length,
        itensValidos: itens.length,
        totalCustoFrete,
        totalPesoKg,
        totalCreditoMontagem: totalCredMont,
        totalDebitoMontagem: totalDebMont,
        colunasIdentificadas: {
          'Pedido / MU': effectiveKeyMU,
          'Custo Frete': keyCustoTotal || 'Não identificada (zerado)',
          'Peso (Kg)': keyPeso || 'Não identificada (zerado)',
          'Crédito Montagens': keyCredMontagem || 'Não presente',
          'Débito Montagens': keyDebMontagem || 'Não presente'
        },
        exemplosMUs
      }
    };
  }

  /**
   * Baixa uma planilha modelo de Frete / Logística oficial em Excel (.xlsx)
   */
  public static downloadModeloFrete(): void {
    const data = [
      {
        "Pedido MU": "00049281",
        "Peso (Kg)": 1450.50,
        "Custo Total Frete": 280.00,
        "Crédito Montagens": 50.00,
        "Débito Montagens": 0.00,
        "Transportadora": "TransABC Logística",
        "Cidade": "Itu - SP",
        "Data Entrega": new Date().toLocaleDateString('pt-BR'),
        "Status": "Entregue"
      },
      {
        "Pedido MU": "00049312",
        "Peso (Kg)": 890.00,
        "Custo Total Frete": 195.50,
        "Crédito Montagens": 0.00,
        "Débito Montagens": 30.00,
        "Transportadora": "TransABC Logística",
        "Cidade": "Salto - SP",
        "Data Entrega": new Date().toLocaleDateString('pt-BR'),
        "Status": "Entregue"
      },
      {
        "Pedido MU": "00049455",
        "Peso (Kg)": 2100.00,
        "Custo Total Frete": 412.80,
        "Crédito Montagens": 108.11,
        "Débito Montagens": 0.00,
        "Transportadora": "Expresso Regional",
        "Cidade": "Sorocaba - SP",
        "Data Entrega": new Date().toLocaleDateString('pt-BR'),
        "Status": "Entregue"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logistica_Frete");

    ws['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.writeFile(wb, "modelo_planilha_frete_logistica_abc.xlsx");
  }

  /**
   * Gera e baixa uma planilha modelo de Ajustes Manuais oficial em Excel (.xlsx)
   */
  public static downloadModeloAjustes(): void {
    const data = [
      {
        "Descrição": "Bonificação Excepcional Comercial ref MU 00049281",
        "Valor": 350.00,
        "Tipo": "Crédito",
        "Pedido MU": "00049281",
        "Data": new Date().toLocaleDateString('pt-BR'),
        "Observação": "Crédito autorizado pela gerência"
      },
      {
        "Descrição": "Estorno Parcial de Desconto Indevido (MU 00049312)",
        "Valor": 120.50,
        "Tipo": "Débito",
        "Pedido MU": "00049312",
        "Data": new Date().toLocaleDateString('pt-BR'),
        "Observação": "Débito operacional"
      },
      {
        "Descrição": "Reembolso Despesa Operacional Loja",
        "Valor": 500.00,
        "Tipo": "Crédito",
        "Pedido MU": "",
        "Data": new Date().toLocaleDateString('pt-BR'),
        "Observação": "Ajuste global sem vínculo com MU"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ajustes_Manuais");

    ws['!cols'] = [
      { wch: 45 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 35 }
    ];

    XLSX.writeFile(wb, "modelo_planilha_ajustes_manuais_abc.xlsx");
  }

  /**
   * Extrai os dados oficiais do Consolidado ABC (conforme aba Consolidado da planilha oficial ABC - Imagem 3)
   */
  public static parseConsolidadoSheet(workbook: XLSX.WorkBook): ConsolidadoOficialABC | null {
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) return null;

    // 1. Procura aba cujo nome contenha "consolidado"
    let targetSheetName = workbook.SheetNames.find(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('consolidado'));
    if (!targetSheetName && workbook.SheetNames.length === 1) {
      targetSheetName = workbook.SheetNames[0];
    }
    if (!targetSheetName) return null;

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) return null;

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
    if (!matrix || matrix.length === 0) return null;

    let margemSemFrete = 0;
    let margemComFrete = 0;
    let custoFreteRota = 0;
    let saldoMontagens = 0;
    let cancelamentos = 0;
    let devolucoes = 0;
    let comissaoDuplicatas = 0;
    let negociacaoCredito = 0;
    let negociacaoDebito = 0;
    let totalOficial = 0;
    let franquiaTotal = 0;
    let ecommerceTotal = 0;
    let foundAny = false;

    // Procura cabeçalho de colunas (EVENTO, FRANQUIA, TELEVENDAS, DROPSHIPPING, E-COMMERCE, TOTAL)
    let totalColIdx = -1;
    let franquiaColIdx = -1;
    let ecommerceColIdx = -1;

    for (let r = 0; r < Math.min(matrix.length, 10); r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (val.includes('total do evento') || (val.includes('total') && !val.includes('sem frete') && !val.includes('com frete'))) {
          totalColIdx = c;
        }
        if (val.includes('franquia')) franquiaColIdx = c;
        if (val.includes('e-commerce') || val.includes('ecommerce')) ecommerceColIdx = c;
      }
      if (totalColIdx !== -1) break;
    }

    // Varre as linhas da tabela
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const eventName = String(row[0] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!eventName) continue;

      // Pega o valor do total
      let valTotal = 0;
      if (totalColIdx !== -1 && row[totalColIdx] !== undefined && row[totalColIdx] !== "") {
        valTotal = this.parseNumber(row[totalColIdx]);
      } else {
        // Pega última coluna numérica preenchida da linha
        for (let c = row.length - 1; c >= 1; c--) {
          if (row[c] !== undefined && row[c] !== "") {
            const n = this.parseNumber(row[c]);
            if (!isNaN(n)) {
              valTotal = n;
              break;
            }
          }
        }
      }

      if (eventName.includes('sem frete') && eventName.includes('margem')) {
        margemSemFrete = valTotal;
        foundAny = true;
      } else if (eventName.includes('com frete') && eventName.includes('margem')) {
        margemComFrete = valTotal;
        foundAny = true;
      } else if (eventName.includes('custo do frete') || eventName.includes('frete + rota') || eventName.includes('valor debitado')) {
        custoFreteRota = Math.abs(valTotal);
        foundAny = true;
      } else if (eventName.includes('montagens') || eventName.includes('saldo de montagens')) {
        saldoMontagens = valTotal;
        foundAny = true;
      } else if (eventName.includes('cancelamento')) {
        cancelamentos = valTotal;
        foundAny = true;
      } else if (eventName.includes('devolu')) {
        devolucoes = valTotal;
        foundAny = true;
      } else if (eventName.includes('duplicata') || eventName.includes('compra garantida')) {
        comissaoDuplicatas = valTotal;
        foundAny = true;
      } else if (eventName.includes('negocia') && eventName.includes('credito')) {
        negociacaoCredito = Math.abs(valTotal);
        foundAny = true;
      } else if (eventName.includes('negocia') && eventName.includes('debito')) {
        negociacaoDebito = Math.abs(valTotal);
        foundAny = true;
      } else if (eventName === '(=) total' || eventName === 'total' || eventName.startsWith('(=)')) {
        totalOficial = valTotal;
        if (franquiaColIdx !== -1 && row[franquiaColIdx] !== undefined) {
          franquiaTotal = this.parseNumber(row[franquiaColIdx]);
        }
        if (ecommerceColIdx !== -1 && row[ecommerceColIdx] !== undefined) {
          ecommerceTotal = this.parseNumber(row[ecommerceColIdx]);
        }
        foundAny = true;
      }
    }

    if (!foundAny) return null;

    // Se totalOficial não foi explicitamente lido da linha TOTAL, calcula pela fórmula canônica:
    if (totalOficial === 0 && margemComFrete !== 0) {
      totalOficial = margemComFrete + saldoMontagens - cancelamentos - devolucoes + comissaoDuplicatas + negociacaoCredito - negociacaoDebito;
    }

    return {
      margemSemFrete,
      margemComFrete,
      custoFreteRota,
      saldoMontagens,
      cancelamentos,
      devolucoes,
      comissaoDuplicatas,
      negociacaoCredito,
      negociacaoDebito,
      totalOficial,
      franquiaTotal: franquiaTotal || undefined,
      ecommerceTotal: ecommerceTotal || undefined
    };
  }

  /**
   * Lê um arquivo avulso de Consolidado (Excel ou CSV) e retorna os dados oficiais
   */
  public static async parseConsolidadoFile(file: File): Promise<ConsolidadoOficialABC> {
    const workbook = await this.readWorkbookSafe(file);
    const result = this.parseConsolidadoSheet(workbook);
    if (!result) {
      throw new Error("Não foi possível identificar a estrutura da tabela de Consolidado na planilha informada.");
    }
    return result;
  }
}
