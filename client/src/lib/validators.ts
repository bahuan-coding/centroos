/**
 * Utilitários de validação e formatação de documentos brasileiros
 */

// =============================================================================
// CPF
// =============================================================================

/**
 * Remove caracteres não numéricos
 */
export function cleanDocument(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida CPF com dígito verificador
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf);
  
  if (cleaned.length !== 11) return false;
  
  // CPFs inválidos conhecidos (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  
  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

/**
 * Formata CPF com máscara: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

// =============================================================================
// CNPJ
// =============================================================================

/**
 * Valida CNPJ com dígito verificador
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // CNPJs inválidos conhecidos (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validar primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned.charAt(12))) return false;
  
  // Validar segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
}

/**
 * Formata CNPJ com máscara: 00.000.000/0000-00
 */
export function formatCNPJ(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
}

// =============================================================================
// Telefone
// =============================================================================

/**
 * Formata telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 2) return cleaned.length > 0 ? `(${cleaned}` : '';
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  // Celular: (00) 00000-0000
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = cleanDocument(phone);
  return cleaned.length === 10 || cleaned.length === 11;
}

// =============================================================================
// CEP
// =============================================================================

/**
 * Formata CEP: 00000-000
 */
export function formatCEP(value: string): string {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
}

/**
 * Valida CEP (8 dígitos)
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cleanDocument(cep);
  return cleaned.length === 8;
}

// =============================================================================
// Email
// =============================================================================

/**
 * Valida email com regex robusto
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

// =============================================================================
// Funções auxiliares
// =============================================================================

/**
 * Valida documento baseado no tipo
 */
export function validateDocument(tipo: string, numero: string): { valid: boolean; message?: string } {
  const cleaned = cleanDocument(numero);
  
  switch (tipo) {
    case 'cpf':
      if (cleaned.length === 0) return { valid: false, message: 'CPF é obrigatório' };
      if (cleaned.length !== 11) return { valid: false, message: 'CPF deve ter 11 dígitos' };
      if (!isValidCPF(cleaned)) return { valid: false, message: 'CPF inválido (dígito verificador incorreto)' };
      return { valid: true };
      
    case 'cnpj':
      if (cleaned.length === 0) return { valid: false, message: 'CNPJ é obrigatório' };
      if (cleaned.length !== 14) return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
      if (!isValidCNPJ(cleaned)) return { valid: false, message: 'CNPJ inválido (dígito verificador incorreto)' };
      return { valid: true };
      
    case 'rg':
      if (cleaned.length < 5) return { valid: false, message: 'RG deve ter pelo menos 5 dígitos' };
      return { valid: true };
      
    default:
      return { valid: cleaned.length > 0, message: cleaned.length === 0 ? 'Número é obrigatório' : undefined };
  }
}

/**
 * Formata documento baseado no tipo
 */
export function formatDocument(tipo: string, numero: string): string {
  switch (tipo) {
    case 'cpf':
      return formatCPF(numero);
    case 'cnpj':
      return formatCNPJ(numero);
    default:
      return numero;
  }
}

/**
 * Valida contato baseado no tipo
 */
export function validateContact(tipo: string, valor: string): { valid: boolean; message?: string } {
  if (!valor.trim()) return { valid: false, message: 'Valor é obrigatório' };
  
  switch (tipo) {
    case 'email':
      if (!isValidEmail(valor)) return { valid: false, message: 'E-mail inválido' };
      return { valid: true };
      
    case 'telefone':
    case 'celular':
    case 'whatsapp':
      if (!isValidPhone(valor)) return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
      return { valid: true };
      
    default:
      return { valid: true };
  }
}

/**
 * Formata contato baseado no tipo
 */
export function formatContact(tipo: string, valor: string): string {
  switch (tipo) {
    case 'telefone':
    case 'celular':
    case 'whatsapp':
      return formatPhone(valor);
    default:
      return valor;
  }
}


