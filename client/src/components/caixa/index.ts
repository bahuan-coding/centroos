// Módulo B - Caixa, Bancos e Conciliação
// Componentes de UI especializados para o módulo financeiro

// Seleção de banco com autocomplete
export { BancoSelect, BANCOS_FEBRABAN, getBancoByCodigo } from './BancoSelect';
export type { Banco } from './BancoSelect';

// Upload de arquivos com drag & drop
export { FileDropzone } from './FileDropzone';
export type { FileType } from './FileDropzone';

// Formulários principais
export { ContaFinanceiraForm } from './ContaFinanceiraForm';
export { ContaFinanceiraWizard } from './ContaFinanceiraWizard';
export { ExtratoImportForm } from './ExtratoImportForm';

// Conciliação
export { ConciliacaoPanel } from './ConciliacaoPanel';
export { ConciliacaoSidebar } from './ConciliacaoSidebar';
export { MatchCard, MatchRow } from './MatchCard';
export { StatusFilter, QuickFilterButton } from './StatusFilter';

// Modais
export { InativarContaModal } from './InativarContaModal';
export { FecharExtratoModal } from './FecharExtratoModal';

