# Importação

| Campo | Rota | Arquivo |
|-------|------|---------|
| Importação | `/import` | `client/src/pages/Import.tsx` |

## Inputs da Tela

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Arquivo | - | file | Sim | .csv, .ofx, .xls, .xlsx | Usuário | Parser local | Drag & drop |
| Tipo | `tipoImportacao` | select | Sim | enum | Usuário | Parser config | Define parser |

## Tipos de Importação

| Tipo | Extensões | Descrição |
|------|-----------|-----------|
| Extrato Bancário | `.ofx`, `.csv` | Movimentações de conta |
| Títulos | `.csv`, `.xlsx` | Títulos a pagar/receber |
| Pessoas | `.csv` | Cadastro de pessoas |
| Plano de Contas | `.csv` | Estrutura contábil |

## Workflow

| Passo | Descrição |
|-------|-----------|
| 1. Upload | Seleciona arquivo |
| 2. Preview | Visualiza dados parseados |
| 3. Mapeamento | Ajusta colunas se necessário |
| 4. Validação | Verifica erros |
| 5. Importação | Confirma e processa |

## Modal: Mapeamento de Colunas

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Coluna Origem | - | select | Sim |
| Campo Destino | - | select | Sim |
| Transformação | - | select | Não |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `import.parse` | Faz parse do arquivo |
| `import.validate` | Valida dados |
| `import.execute` | Executa importação |

## Observações

- Suporte a drag & drop
- Preview com primeiras 10 linhas
- Detecção automática de encoding
- Log de erros por linha





