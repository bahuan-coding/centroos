/**
 * Tipos para Geração de Recibos de Doação
 */

export interface DadosDoador {
  /** Nome completo */
  nome: string;
  /** CPF ou CNPJ */
  documento: string;
  /** Tipo de documento */
  tipoDocumento: 'cpf' | 'cnpj';
  /** Endereço (opcional) */
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  /** Email (opcional) */
  email?: string;
}

export interface DadosDoacao {
  /** Número do recibo (sequencial) */
  numeroRecibo: string;
  /** Valor da doação */
  valor: number;
  /** Data da doação */
  dataDoacao: Date;
  /** Forma de pagamento */
  formaPagamento: 'dinheiro' | 'pix' | 'transferencia' | 'cheque' | 'cartao' | 'outros';
  /** Descrição ou finalidade */
  descricao?: string;
  /** Referência ao título/baixa no sistema */
  referenciaInterna?: string;
}

export interface DadosEntidade {
  /** Razão Social */
  razaoSocial: string;
  /** CNPJ */
  cnpj: string;
  /** Endereço completo */
  endereco: string;
  /** Cidade e UF */
  cidadeUf: string;
  /** Telefone */
  telefone?: string;
  /** Email */
  email?: string;
  /** Site */
  site?: string;
  /** Inscrição municipal */
  inscricaoMunicipal?: string;
  /** Qualificação (ex: Entidade beneficente de assistência social) */
  qualificacao?: string;
}

export interface ReciboDoacao {
  /** UUID do recibo */
  id: string;
  /** Dados do doador */
  doador: DadosDoador;
  /** Dados da doação */
  doacao: DadosDoacao;
  /** Dados da entidade */
  entidade: DadosEntidade;
  /** PDF gerado (base64) */
  pdfBase64?: string;
  /** Se foi assinado digitalmente */
  assinadoDigitalmente: boolean;
  /** Hash do documento assinado */
  hashDocumento?: string;
  /** Data de geração */
  geradoEm: Date;
}

export interface GerarReciboOptions {
  /** Assinar digitalmente o PDF */
  assinarDigitalmente?: boolean;
  /** Texto adicional no rodapé */
  textoRodape?: string;
  /** Incluir QR Code de validação */
  incluirQrCode?: boolean;
  /** Formato do recibo */
  formato?: 'completo' | 'simplificado';
}


