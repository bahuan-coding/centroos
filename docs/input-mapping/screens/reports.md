# Relatórios

| Campo | Rota | Arquivo |
|-------|------|---------|
| Relatórios | `/reports` | `client/src/pages/Reports.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Tipo de Relatório | `tipoRelatorio` | select | Sim | - | Lista fixa | Query filter | Seleciona relatório |
| Período Início | `periodoInicio` | date | Sim | - | Usuário | Query filter | - |
| Período Fim | `periodoFim` | date | Sim | >= início | Usuário | Query filter | - |
| Formato | `formato` | select | Não | - | `pdf`, `xlsx`, `csv` | Exportação | Default: PDF |

## Tipos de Relatório

| Relatório | Descrição | Módulo |
|-----------|-----------|--------|
| Balancete | Saldos por conta | Contabilidade |
| DRE | Demonstração de Resultado | Contabilidade |
| Balanço Patrimonial | Ativo/Passivo/PL | Contabilidade |
| Fluxo de Caixa | Entradas e saídas | Financeiro |
| Contribuições | Por pessoa e período | Pessoas |
| Inadimplência | Títulos vencidos | Financeiro |
| Razão Analítico | Lançamentos por conta | Contabilidade |

## Filtros Adicionais (dependem do relatório)

| Label | name/id | Tipo | Relatórios |
|-------|---------|------|------------|
| Conta | `contaId` | select | Razão |
| Pessoa | `pessoaId` | combobox | Contribuições |
| Status | `status` | select | Inadimplência |
| Centro de Custo | `centroCustoId` | select | Vários |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `reports.generate` | Gera relatório |
| `reports.download` | Baixa arquivo |
| `reports.schedule` | Agenda envio por email |

## Ações

| Ação | Descrição |
|------|-----------|
| Gerar | Processa e exibe preview |
| Exportar PDF | Download em PDF |
| Exportar Excel | Download em XLSX |
| Enviar por Email | Agenda envio |
| Salvar Favorito | Salva configuração |

## Observações

- Preview antes de exportar
- Relatórios seguem NBC T 10.19
- Suporte a período fiscal customizado
- Agendamento de envio automático








