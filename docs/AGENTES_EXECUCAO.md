# ABC Finance — Matriz Oficial de Agentes de Execução & Governança

**Data de Emissão:** 05/10/2026  
**Patrocinador / Sponsor:** THIAGO  
**Orquestrador Executivo:** CEO-001  
**Status de Conformidade:** 100% PROTOCOLAR  

---

## 1. Princípios & Protocolos Mandatórios

1. **A_DEFINIR nunca vira zero:** Regras financeiras não homologadas permanecem formalmente bloqueadas como `A_DEFINIR` / `NAO_DEFINIDO`. É terminantemente proibido assumir 0% ou regras arbitrárias.
2. **BLOCKER não pode ser contornado:** Bloqueios não podem ser ultrapassados por regras inventadas sem deliberação formal.
3. **Estrutura de Task-ID:** Toda ordem de serviço contém obrigatoriamente: objetivo, contexto, regras, fontes, dependências, escopo, testes e riscos.
4. **Critério de DONE:** Exige implementação, testes, integração, persistência, segurança, auditoria, regressão zero, validação de QA, zero blockers e evidências criptográficas.
5. **Fluxo Estrito:** Implementação → Testes → QA-001 → SEC-001 → CEO-001 → APPROVED.
6. **Critério de Valor Oficial:** Todo número financeiro oficial precisa ter origem, evidência, regra, versão do cálculo, componentes e histórico explicáveis e auditáveis.

---

## 2. Hierarquia de Governança

```
THIAGO (Sponsor Soberano)
  └── CEO-001 (Orquestração Executiva e Aprovação Final)
       ├── ARC-001 (Arquitetura, Banco de Dados & Modelagem)
       ├── FIN-001 (Regras Financeiras & Matemática de Precisão)
       ├── DAT-001 (Origem, Proveniência & Ingestão RAW)
       ├── SEC-001 (Segurança, Trilha de Auditoria & Imutabilidade)
       └── QA-001  (Qualidade, Validação Canônica & Testes Independentes)
            └── 19 Agentes de Módulo (MOD-001 a MOD-019)
```

---

## 3. Catálogo dos 19 Agentes de Módulo

| ID | Nome do Agente | Módulo / Escopo | Superior | Status | Regra Crítica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MOD-001-FND** | Fundação / Banco / Money | 1. Fundação e Infraestrutura | ARC-001 | APPROVED | BigInt centavos, sem perda IEEE 754 |
| **MOD-002-RAW** | Importação / RAW | 2. Ingestão e Parser Declarado BR | DAT-001 | IMPLEMENTACAO | Preservação textual de zeros à esquerda |
| **MOD-003-IDN** | Normalização / Identidade | 3. Identidade Pedido vs MU | DAT-001 | IMPLEMENTACAO | Cabeçalho e itens não somados juntos |
| **MOD-004-VND** | Vendas Base / Margem | 4. Vendas Base e Rentabilidade | FIN-001 | IMPLEMENTACAO | Rentabilidade = (Margem R$ / Total Venda) * 100 |
| **MOD-005-CNC** | Cancelados | 5. Cancelados Canônicos | FIN-001 | APPROVED | Caso canônico: +500 -300 +100 -50 = +250 |
| **MOD-006-DEV** | Devolvidos | 6. Devolvidos com Sinal Preservado | FIN-001 | APPROVED | Caso canônico: -51,83 +47,10 +2,19 = -2,54 |
| **MOD-007-AJU** | Ajustes | 7. Ajustes Financeiros Manuais | FIN-001 | APPROVED | Caso canônico: +3.904,88 - 3.656,78 = +248,10 |
| **MOD-008-FRT** | Fretes | 8. Segregação e Logística | FIN-001 | APPROVED | Custo extra de frete NÃO reduz comissão |
| **MOD-009-OCO** | Ocorrências / Reposições | 9. Ocorrências Vinculadas | FIN-001 | BLOCKED | Diferença pura (-50 e -50 = 0); Consolidado A_DEFINIR |
| **MOD-010-CRD** | Créditos | 10. Movimentação de Créditos | FIN-001 | BLOCKED | Gerado != Utilizado; estorno A_DEFINIR |
| **MOD-011-VLD** | Validação Final | 11. Snapshot Pré-Fechamento | CEO-001 | APPROVED | Snapshot conceitual dos 6 componentes |
| **MOD-012-FIN** | Pedidos Finalizados | 12. Rastreabilidade de Pedidos | DAT-001 | APPROVED | Rastreabilidade mestre/filha |
| **MOD-013-CMS** | Comissão | 13. Apuração de Comissões | FIN-001 | APPROVED | >=10%: 1,5%; [7%,10%): 1,0%; <7%: NAO_DEFINIDO |
| **MOD-014-ESP** | Especificadores | 14. Parceiros e Arquitetos | FIN-001 | BLOCKED | Faixas e percentuais permanecem A_DEFINIR |
| **MOD-015-CNS** | Consolidado Canônico | 15. Consolidado Master | FIN-001 | APPROVED | 15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = 15.711,29 |
| **MOD-016-FCH** | Fechamento Terminal | 16. Fechamento Quinzenal | SEC-001 | APPROVED | Imutabilidade estrita pós-fechamento (Q1: 01-15, Q2: 16-fim) |
| **MOD-017-REC** | Contas a Receber | 17. Entradas Financeiras | FIN-001 | IMPLEMENTACAO | Conciliação e vínculo aos pedidos |
| **MOD-018-PAG** | Contas a Pagar | 18. Saídas e Despesas | FIN-001 | IMPLEMENTACAO | Integração com DRE e Fluxo de Caixa |
| **MOD-019-AUD** | Auditoria de Telas / E2E | 19. Validação E2E e Evidências | QA-001 | APPROVED | Zero discrepâncias entre frontend e motor canônico |

---

## 4. Regras Financeiras Oficiais & Casos Canônicos

### 4.1. Preservação Algébrica de Sinais
- **Cancelados:** `+500 -300 +100 -50 = +250`
- **Devolvidos:** `-51,83 +47,10 +2,19 = -2,54`
- **Ajustes:** `+3.904,88 - 3.656,78 = +248,10`
- **Consolidado Canônico:**
  $$\text{Consolidado} = \text{Base} + \text{Montagens} - \text{Cancelados} - \text{Devolvidos} + \text{Ajustes}$$
  $$15.765,38 + 108,11 - 412,84 - (-2,54) + 3.904,88 - 3.656,78 = 15.711,29$$
  *(Note: subtrair a devolução negativa $-(-2,54)$ adiciona $+2,54$ algebricamente).*

### 4.2. Regras de Comissionamento
- **Margem $\ge 10\%$:** $1,5\%$
- **Margem $\ge 7\%$ e $< 10\%$:** $1,0\%$
- **Margem $< 7\%$:** **NAO_DEFINIDO (Bloqueio estrito — NUNCA VIRA ZERO!)**
- **Base da Comissão:** $\text{Total do Pedido} - \text{Frete Cobrado} - \text{Crédito Utilizado}$
- **Extra / Custo Frete:** Não são abatidos da base da comissão do vendedor.

---

## 5. Custódia de Itens A_DEFINIR (Bloqueados)

1. **Comissão para margem < 7%:** Aguarda deliberação oficial de política comercial.
2. **Faixas e percentuais para especificadores:** Aguarda homologação da tabela de arquitetos/designers.
3. **Impacto de ocorrências/reposições no Consolidado:** Aguarda decisão contábil se gera débito direto ou reprocessa margem.
4. **Fórmula de estorno de crédito:** Aguarda definição de conciliação de saldo residual.
5. **Data oficial da quinzena com datas concorrentes:** Aguarda critério de prioridade de campos de data na ingestão.
