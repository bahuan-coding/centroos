# Checklist de Homologação e Testes

## Introdução

Este documento detalha como testar as integrações fiscais sem afetar ambiente de produção, utilizando os ambientes de homologação oficiais e técnicas de teste seguras.

---

## 1. Ambientes de Homologação

### 1.1 NF-e / NFC-e (SEFAZ)

| Estado | Endpoint Homologação |
|--------|---------------------|
| **SP** | https://homologacao.nfe.fazenda.sp.gov.br/ws/ |
| **RS** | https://nfe-homologacao.sefazrs.rs.gov.br/ws/ |
| **SVRS** (contingência) | https://nfe-homologacao.svrs.rs.gov.br/ws/ |
| **AN** (Nacional) | https://hom.nfe.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx |

**Documentação:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=Zz8pvX9JY90=

### 1.2 NFS-e Nacional

| Ambiente | URL |
|----------|-----|
| **Homologação** | https://homologacao.nfse.gov.br |
| **Produção** | https://www.nfse.gov.br |

**Portal desenvolvedor:** https://www.gov.br/nfse/pt-br/acesso-ao-sistema/ambiente-de-desenvolvimento

### 1.3 NFS-e Paulistana (São Paulo)

| Ambiente | Endpoint WSDL |
|----------|---------------|
| **Homologação** | https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?wsdl |
| **Produção** | https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?wsdl |

**Observação:** Usar flag `<tpAmb>2</tpAmb>` para homologação.

### 1.4 Serpro (Consulta CNPJ/CPF)

| Ambiente | URL Base |
|----------|----------|
| **Sandbox** | https://gateway.apiserpro.serpro.gov.br/consulta-cnpj-df-trial/v2 |
| **Produção** | https://gateway.apiserpro.serpro.gov.br/consulta-cnpj-df/v2 |

**Sandbox gratuito:** https://servicos.serpro.gov.br/api-trial

---

## 2. Dados de Teste

### 2.1 CNPJs para Teste

Em ambiente de homologação, usar CNPJs fictícios ou reservados:

| CNPJ | Descrição |
|------|-----------|
| **00.000.000/0001-91** | CNPJ padrão de teste (uso em homologação) |
| **11.111.111/0001-91** | Alternativo |
| **99.999.999/0001-99** | Geralmente inválido (para testar validação) |

### 2.2 CPFs para Teste

| CPF | Descrição |
|-----|-----------|
| **000.000.000-00** | CPF de teste (alguns sistemas aceitam) |
| **123.456.789-09** | CPF válido matematicamente (apenas para teste) |
| **111.111.111-11** | Inválido (para testar validação) |

### 2.3 Certificados de Teste

**Opções:**
1. **Certificado de homologação** - Algumas ACs fornecem certificados para teste
2. **Certificado real em ambiente de homologação** - Pode usar o mesmo certificado
3. **Certificado autoassinado** - Apenas para testes unitários internos

```bash
# Gerar certificado autoassinado para testes locais (NÃO usar em homologação oficial)
openssl req -x509 -newkey rsa:2048 -keyout test-key.pem -out test-cert.pem -days 365 -nodes
openssl pkcs12 -export -out test-certificate.pfx -inkey test-key.pem -in test-cert.pem
```

---

## 3. Checklist por Integração

### 3.1 NFS-e Nacional

#### Pré-requisitos
- [ ] Certificado e-CNPJ A1 válido
- [ ] Município da empresa aderiu ao padrão nacional
- [ ] Cadastro no ADN (Ambiente de Dados Nacional)
- [ ] Código de serviço municipal definido

#### Testes de Homologação

| # | Teste | Resultado Esperado | Status |
|---|-------|-------------------|--------|
| 1 | **Conectividade** - Chamar endpoint de status | HTTP 200 | [ ] |
| 2 | **Emissão simples** - DPS com dados mínimos válidos | NFS-e com chave de acesso | [ ] |
| 3 | **Validação de campos** - DPS sem CNPJ tomador | Erro de validação | [ ] |
| 4 | **Consulta por chave** - Buscar NFS-e emitida | Retorna dados da nota | [ ] |
| 5 | **Cancelamento** - Cancelar NFS-e emitida | Status cancelado | [ ] |
| 6 | **Substituição** - Substituir NFS-e | Nova NFS-e + original cancelada | [ ] |
| 7 | **Timeout** - Simular timeout de rede | Retry automático | [ ] |
| 8 | **Certificado inválido** - Usar cert expirado | Erro de autenticação | [ ] |

#### Script de Teste

```typescript
// scripts/test-nfse-homologacao.ts

import { NfseNacionalService } from '@/integrations/fiscal/nfse';

async function testNfseHomologacao() {
  const service = new NfseNacionalService({ ambiente: 'homologacao' });
  
  console.log('1. Testando conectividade...');
  const status = await service.checkStatus();
  console.log('Status:', status);
  
  console.log('\n2. Testando emissão simples...');
  const dps = {
    competencia: '2024-12',
    prestador: { cnpj: process.env.TEST_CNPJ },
    tomador: {
      cnpj: '00000000000191',
      razaoSocial: 'TOMADOR TESTE HOMOLOGACAO',
      endereco: {
        logradouro: 'RUA TESTE',
        numero: '123',
        bairro: 'CENTRO',
        codigoMunicipio: '3550308', // São Paulo
        uf: 'SP',
        cep: '01000000',
      },
    },
    servico: {
      codigoServico: '01.01',
      descricao: 'TESTE DE HOMOLOGACAO - DESENVOLVIMENTO DE SOFTWARE',
      valorServico: 100.00,
      aliquotaIss: 5,
    },
  };
  
  try {
    const nfse = await service.emitir(dps);
    console.log('NFS-e emitida:', nfse.chaveAcesso);
    
    console.log('\n3. Testando consulta...');
    const consulta = await service.consultar(nfse.chaveAcesso);
    console.log('Consulta OK:', consulta.numeroNfse);
    
    console.log('\n4. Testando cancelamento...');
    await service.cancelar(nfse.chaveAcesso, 'Teste de homologacao');
    console.log('Cancelamento OK');
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testNfseHomologacao();
```

**Comando:**
```bash
FISCAL_ENVIRONMENT=homologation npx tsx scripts/test-nfse-homologacao.ts
```

---

### 3.2 Consulta CNPJ (Serpro)

#### Pré-requisitos
- [ ] Conta no Serpro criada
- [ ] Acesso ao ambiente sandbox liberado
- [ ] Consumer Key e Consumer Secret obtidos

#### Testes

| # | Teste | Resultado Esperado | Status |
|---|-------|-------------------|--------|
| 1 | **Autenticação** - Obter token OAuth | Token válido | [ ] |
| 2 | **CNPJ válido** - Consultar CNPJ existente | Dados cadastrais | [ ] |
| 3 | **CNPJ inválido** - Consultar CNPJ inexistente | 404 Not Found | [ ] |
| 4 | **CNPJ malformado** - Consultar sem dígitos | 400 Bad Request | [ ] |
| 5 | **Rate limit** - Múltiplas consultas rápidas | 429 Too Many Requests | [ ] |
| 6 | **Cache** - Segunda consulta mesmo CNPJ | Resposta do cache | [ ] |

#### Script de Teste

```typescript
// scripts/test-serpro-cnpj.ts

import { SerproCnpjClient } from '@/integrations/fiscal/serpro';

async function testSerproCnpj() {
  const client = new SerproCnpjClient({
    apiKey: process.env.SERPRO_API_KEY,
    ambiente: 'sandbox',
  });
  
  console.log('1. Testando CNPJ válido (Banco do Brasil)...');
  const bb = await client.consultar('00.000.000/0001-91');
  console.log('Resultado:', bb?.razaoSocial);
  
  console.log('\n2. Testando CNPJ inválido...');
  const invalido = await client.consultar('99.999.999/9999-99');
  console.log('Resultado (deve ser null):', invalido);
  
  console.log('\n3. Testando cache...');
  console.time('Consulta sem cache');
  await client.consultar('00.000.000/0001-91');
  console.timeEnd('Consulta sem cache');
  
  console.time('Consulta com cache');
  await client.consultar('00.000.000/0001-91');
  console.timeEnd('Consulta com cache');
}

testSerproCnpj();
```

---

### 3.3 NF-e (SEFAZ) - Se Aplicável

#### Pré-requisitos
- [ ] Credenciamento na SEFAZ do estado como emissor de NF-e
- [ ] Inscrição Estadual ativa
- [ ] Certificado e-CNPJ ou e-NFe A1
- [ ] Código CSC para NFC-e (se aplicável)

#### Testes

| # | Teste | Resultado Esperado | Status |
|---|-------|-------------------|--------|
| 1 | **Status serviço** - Consultar disponibilidade | Status operacional | [ ] |
| 2 | **Consulta cadastro** - Verificar IE | Contribuinte ativo | [ ] |
| 3 | **Autorização** - Emitir NF-e de teste | Protocolo de autorização | [ ] |
| 4 | **Consulta protocolo** - Buscar NF-e | Dados da nota | [ ] |
| 5 | **Cancelamento** - Cancelar dentro de 24h | Evento registrado | [ ] |
| 6 | **Inutilização** - Inutilizar faixa | Protocolo de inutilização | [ ] |
| 7 | **CCe** - Carta de correção | Evento registrado | [ ] |
| 8 | **Contingência** - Simular SEFAZ offline | Fallback para SVC | [ ] |

---

## 4. Testes Automatizados

### 4.1 Estrutura de Testes

```
server/integrations/fiscal/__tests__/
├── unit/
│   ├── certificate-manager.test.ts
│   ├── xml-signer.test.ts
│   └── xml-builder.test.ts
├── integration/
│   ├── nfse-nacional.test.ts       # Requer ambiente homologação
│   ├── serpro-cnpj.test.ts         # Requer sandbox Serpro
│   └── nfe-sefaz.test.ts           # Requer credenciamento
└── e2e/
    └── fiscal-flow.test.ts          # Fluxo completo
```

### 4.2 Configuração de Testes

```typescript
// vitest.config.ts ou jest.config.ts

export default {
  // ...
  testMatch: [
    // Testes unitários rodam sempre
    '<rootDir>/server/integrations/fiscal/__tests__/unit/**/*.test.ts',
  ],
  
  // Testes de integração apenas com flag
  testPathIgnorePatterns: process.env.RUN_INTEGRATION_TESTS
    ? []
    : ['<rootDir>/server/integrations/fiscal/__tests__/integration/**'],
};
```

### 4.3 Mocks para Testes Unitários

```typescript
// __tests__/mocks/fiscal-mocks.ts

export const mockNfseResponse = {
  chaveAcesso: 'NFSe123456789',
  numeroNfse: '000001',
  dataEmissao: new Date('2024-12-01'),
  xml: '<NFS-e>...</NFS-e>',
};

export const mockCnpjResponse = {
  cnpj: '63552022000184',
  razaoSocial: 'PAYCUBED STACK FINANCEIRO LTDA',
  situacaoCadastral: { codigo: 2, descricao: 'Ativa' },
  // ...
};

// Mock do CertificateManager
export const mockCertificateManager = {
  loadCertificate: jest.fn().mockResolvedValue({
    cert: Buffer.from('mock-cert'),
    key: Buffer.from('mock-key'),
    info: {
      thumbprint: 'abc123',
      subjectCN: 'PAYCUBED STACK FINANCEIRO LTDA:63552022000184',
      validUntil: new Date('2025-12-31'),
      isValid: true,
    },
  }),
  validateCertificate: jest.fn().mockResolvedValue({ isValid: true }),
};
```

### 4.4 Exemplo de Teste Unitário

```typescript
// __tests__/unit/xml-signer.test.ts

import { XmlSigner } from '../../core/xml-signer';
import { mockCertificateManager } from '../mocks/fiscal-mocks';

describe('XmlSigner', () => {
  let signer: XmlSigner;
  
  beforeEach(() => {
    signer = new XmlSigner(mockCertificateManager);
  });
  
  describe('sign', () => {
    it('deve assinar XML válido', async () => {
      const xml = '<root><data>teste</data></root>';
      
      const signed = await signer.sign(xml, 'org-123');
      
      expect(signed).toContain('<Signature');
      expect(signed).toContain('<SignedInfo>');
    });
    
    it('deve rejeitar XML malformado', async () => {
      const invalidXml = '<root><data>teste</root>'; // Tag não fechada
      
      await expect(signer.sign(invalidXml, 'org-123')).rejects.toThrow();
    });
    
    it('deve falhar com certificado inválido', async () => {
      mockCertificateManager.validateCertificate.mockResolvedValueOnce({
        isValid: false,
        validationErrors: ['Certificado expirado'],
      });
      
      await expect(signer.sign('<root/>', 'org-123')).rejects.toThrow('Certificado inválido');
    });
  });
});
```

### 4.5 Exemplo de Teste de Integração

```typescript
// __tests__/integration/nfse-nacional.test.ts

import { NfseNacionalService } from '../../nfse/nfse-nacional-service';

// Este teste requer ambiente de homologação configurado
describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)('NFS-e Nacional Integration', () => {
  let service: NfseNacionalService;
  let emittedChave: string;
  
  beforeAll(() => {
    service = new NfseNacionalService({
      ambiente: 'homologacao',
      certificatePath: process.env.TEST_CERTIFICATE_PATH,
      certificatePassword: process.env.TEST_CERTIFICATE_PASSWORD,
    });
  });
  
  it('deve verificar status do serviço', async () => {
    const status = await service.checkStatus();
    expect(status.disponivel).toBe(true);
  });
  
  it('deve emitir NFS-e em homologação', async () => {
    const dps = createTestDps();
    
    const result = await service.emitir(dps);
    
    expect(result.chaveAcesso).toBeDefined();
    expect(result.numeroNfse).toBeDefined();
    emittedChave = result.chaveAcesso;
  }, 30000); // Timeout de 30s para operações de rede
  
  it('deve consultar NFS-e emitida', async () => {
    const result = await service.consultar(emittedChave);
    
    expect(result.chaveAcesso).toBe(emittedChave);
  });
  
  it('deve cancelar NFS-e', async () => {
    await service.cancelar(emittedChave, 'Teste de homologação');
    
    const consulta = await service.consultar(emittedChave);
    expect(consulta.status).toBe('cancelada');
  });
});
```

---

## 5. Comandos de Execução

### 5.1 Testes Unitários

```bash
# Rodar apenas testes unitários fiscais
npm test -- --testPathPattern="fiscal.*unit"

# Com coverage
npm test -- --testPathPattern="fiscal.*unit" --coverage
```

### 5.2 Testes de Integração

```bash
# Configurar variáveis de ambiente
export FISCAL_ENVIRONMENT=homologation
export TEST_CERTIFICATE_PATH=/path/to/test-cert.pfx
export TEST_CERTIFICATE_PASSWORD=senha-teste
export SERPRO_API_KEY=sua-api-key-sandbox

# Rodar testes de integração
RUN_INTEGRATION_TESTS=true npm test -- --testPathPattern="fiscal.*integration"
```

### 5.3 Script de Validação Completa

```bash
#!/bin/bash
# scripts/validate-fiscal-integration.sh

echo "=== Validação de Integrações Fiscais ==="

echo "\n1. Verificando variáveis de ambiente..."
required_vars=("FISCAL_ENVIRONMENT" "FISCAL_ENCRYPTION_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERRO: $var não definida"
    exit 1
  fi
done
echo "OK"

echo "\n2. Rodando testes unitários..."
npm test -- --testPathPattern="fiscal.*unit" --silent
if [ $? -ne 0 ]; then
  echo "ERRO: Testes unitários falharam"
  exit 1
fi
echo "OK"

echo "\n3. Verificando conectividade com serviços..."
npx tsx scripts/check-fiscal-connectivity.ts
if [ $? -ne 0 ]; then
  echo "ERRO: Conectividade falhou"
  exit 1
fi
echo "OK"

echo "\n4. Rodando testes de integração..."
RUN_INTEGRATION_TESTS=true npm test -- --testPathPattern="fiscal.*integration"
if [ $? -ne 0 ]; then
  echo "AVISO: Alguns testes de integração falharam"
fi

echo "\n=== Validação Concluída ==="
```

---

## 6. Troubleshooting

### 6.1 Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `SSL_ERROR_HANDSHAKE_FAILURE` | Certificado não aceito | Verificar cadeia de certificação |
| `SOAP Fault: Certificado inválido` | Cert expirado ou revogado | Renovar certificado |
| `HTTP 403` | IP não autorizado | Verificar whitelist (alguns órgãos) |
| `Timeout` | SEFAZ lenta/indisponível | Implementar retry, verificar contingência |
| `XML Schema validation failed` | Campos obrigatórios faltando | Revisar payload contra XSD |

### 6.2 Logs de Debug

```typescript
// Habilitar logs detalhados para debug
process.env.FISCAL_DEBUG = 'true';

// Em desenvolvimento, logar request/response (SEM dados sensíveis)
if (process.env.FISCAL_DEBUG === 'true') {
  console.log('Request headers:', request.headers);
  console.log('Response status:', response.status);
  console.log('Response body (sanitized):', sanitizeForLog(response.body));
}
```

---

## 7. Checklist Final de Go-Live

### 7.1 Pré-Produção

- [ ] Todos os testes unitários passando
- [ ] Testes de integração em homologação passando
- [ ] Certificado de produção obtido e armazenado seguro
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Backup de certificado em local seguro
- [ ] Monitoramento configurado (alertas de erro)
- [ ] Documentação atualizada

### 7.2 Primeira Emissão em Produção

- [ ] Ambiente = produção configurado
- [ ] Primeira NFS-e emitida com valor baixo (teste)
- [ ] Consulta da nota confirmada
- [ ] XML armazenado corretamente
- [ ] Evento de auditoria registrado
- [ ] PDF/visualização funcionando

### 7.3 Rollback Plan

```
Se algo der errado:
1. Reverter FISCAL_ENVIRONMENT para 'homologation'
2. Investigar logs
3. Corrigir issue
4. Testar novamente em homologação
5. Retornar para produção
```

---

## 8. Referências

- [Portal NF-e - Ambiente de Homologação](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=Zz8pvX9JY90=)
- [NFS-e Nacional - Desenvolvedor](https://www.gov.br/nfse/pt-br/acesso-ao-sistema/ambiente-de-desenvolvimento)
- [Serpro - API Trial](https://servicos.serpro.gov.br/api-trial)
- [Nota Fiscal Paulistana - Documentação](https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx)

---

**Voltar para:** [README.md](README.md) - Índice da documentação







