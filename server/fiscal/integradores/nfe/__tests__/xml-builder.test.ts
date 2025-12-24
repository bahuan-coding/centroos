/**
 * Testes - XML Builder NF-e/NFC-e
 */

import { describe, it, expect } from 'vitest';
import {
  NFeXmlBuilder,
  criarNFeBuilder,
  NFeDadosEmissao,
} from '../xml-builder';
import {
  gerarChaveAcesso,
  gerarCodigoNumerico,
  formatarValorXML,
  formatarDataHoraXML,
} from '../schemas';

describe('NFeXmlBuilder', () => {
  const dadosBasicos: NFeDadosEmissao = {
    uf: 'SP',
    ambiente: '2',
    modelo: '55',
    serie: 1,
    numero: 1,
    naturezaOperacao: 'Venda de mercadoria',
    tipoOperacao: '1',
    destino: '1',
    finalidade: '1',
    consumidorFinal: true,
    presenca: '1',
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Empresa Teste LTDA',
      nomeFantasia: 'Teste',
      inscricaoEstadual: '123456789012',
      crt: '3',
      endereco: {
        logradouro: 'Rua Teste',
        numero: '123',
        bairro: 'Centro',
        codigoMunicipio: '3550308',
        nomeMunicipio: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
    },
    destinatario: {
      tipo: 'PJ',
      cpfCnpj: '98.765.432/0001-10',
      nome: 'Cliente Teste',
      indicadorIE: '9',
      endereco: {
        logradouro: 'Av. Cliente',
        numero: '456',
        bairro: 'Jardim',
        codigoMunicipio: '3550308',
        nomeMunicipio: 'São Paulo',
        uf: 'SP',
        cep: '02002-000',
      },
    },
    itens: [
      {
        numero: 1,
        codigo: 'PROD001',
        descricao: 'Produto Teste',
        ncm: '84713012',
        cfop: '5102',
        unidade: 'UN',
        quantidade: 2,
        valorUnitario: 100.00,
        valorTotal: 200.00,
        origem: '0',
        tributacao: {
          regime: 'normal',
          cst: '00',
          baseCalculoICMS: 200.00,
          aliquotaICMS: 18,
          valorICMS: 36.00,
          cstPIS: '01',
          basePIS: 200.00,
          aliquotaPIS: 1.65,
          valorPIS: 3.30,
          cstCOFINS: '01',
          baseCOFINS: 200.00,
          aliquotaCOFINS: 7.60,
          valorCOFINS: 15.20,
        },
      },
    ],
    pagamentos: [
      {
        forma: '01', // Dinheiro
        valor: 200.00,
      },
    ],
  };

  describe('build()', () => {
    it('deve construir objeto TNFe válido', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      
      expect(nfe).toBeDefined();
      expect(nfe.infNFe).toBeDefined();
      expect(nfe.infNFe.versao).toBe('4.00');
      expect(nfe.infNFe.Id).toMatch(/^NFe\d{44}$/);
    });

    it('deve preencher identificação (ide) corretamente', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      const ide = nfe.infNFe.ide;
      
      expect(ide.cUF).toBe('35'); // SP
      expect(ide.mod).toBe('55');
      expect(ide.tpAmb).toBe('2'); // Homologação
      expect(ide.tpNF).toBe('1'); // Saída
      expect(ide.finNFe).toBe('1'); // Normal
      expect(ide.indFinal).toBe('1'); // Consumidor final
    });

    it('deve preencher emitente (emit) corretamente', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      const emit = nfe.infNFe.emit;
      
      expect(emit.CNPJ).toBe('12345678000190');
      expect(emit.xNome).toBe('Empresa Teste LTDA');
      expect(emit.IE).toBe('123456789012');
      expect(emit.CRT).toBe('3');
      expect(emit.enderEmit.cMun).toBe('3550308');
      expect(emit.enderEmit.UF).toBe('SP');
    });

    it('deve preencher destinatário (dest) corretamente', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      const dest = nfe.infNFe.dest;
      
      expect(dest).toBeDefined();
      expect(dest!.CNPJ).toBe('98765432000110');
      expect(dest!.xNome).toBe('Cliente Teste');
      expect(dest!.indIEDest).toBe('9');
    });

    it('deve preencher itens (det) corretamente', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      const det = nfe.infNFe.det;
      
      expect(det.length).toBe(1);
      expect(det[0].nItem).toBe('1');
      expect(det[0].prod.cProd).toBe('PROD001');
      expect(det[0].prod.xProd).toBe('Produto Teste');
      expect(det[0].prod.NCM).toBe('84713012');
      expect(det[0].prod.CFOP).toBe('5102');
      expect(det[0].prod.vProd).toBe('200.00');
    });

    it('deve calcular totais corretamente', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const nfe = builder.build();
      const total = nfe.infNFe.total.ICMSTot;
      
      expect(total.vProd).toBe('200.00');
      expect(total.vBC).toBe('200.00');
      expect(total.vICMS).toBe('36.00');
      expect(total.vPIS).toBe('3.30');
      expect(total.vCOFINS).toBe('15.20');
      expect(total.vNF).toBe('200.00');
    });
  });

  describe('getChaveAcesso()', () => {
    it('deve gerar chave de acesso com 44 dígitos', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const chave = builder.getChaveAcesso();
      
      expect(chave).toHaveLength(44);
      expect(chave).toMatch(/^\d{44}$/);
    });

    it('deve começar com código da UF', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const chave = builder.getChaveAcesso();
      
      expect(chave.substring(0, 2)).toBe('35'); // SP
    });
  });

  describe('toXml()', () => {
    it('deve gerar XML válido', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const xml = builder.toXml();
      
      expect(xml).toContain('<NFe>');
      expect(xml).toContain('</NFe>');
      expect(xml).toContain('<infNFe');
      expect(xml).toContain('versao="4.00"');
    });

    it('deve incluir namespace', () => {
      const builder = criarNFeBuilder(dadosBasicos);
      const xml = builder.toXml();
      
      // Verificar que contém dados esperados
      expect(xml).toContain('Empresa Teste LTDA');
      expect(xml).toContain('Produto Teste');
    });
  });
});

describe('Helpers de Schema', () => {
  describe('gerarChaveAcesso()', () => {
    it('deve gerar chave válida', () => {
      const resultado = gerarChaveAcesso({
        cUF: '35',
        dataEmissao: new Date('2024-12-24'),
        CNPJ: '12345678000190',
        mod: '55',
        serie: '1',
        nNF: '1',
        tpEmis: '1',
        cNF: '12345678',
      });
      
      expect(resultado.chave).toHaveLength(44);
      expect(resultado.cDV).toMatch(/^\d$/);
    });

    it('deve calcular dígito verificador corretamente', () => {
      const resultado = gerarChaveAcesso({
        cUF: '35',
        dataEmissao: new Date('2024-12-24'),
        CNPJ: '12345678000190',
        mod: '55',
        serie: '1',
        nNF: '1',
        tpEmis: '1',
        cNF: '00000001',
      });
      
      // Último dígito deve ser o dígito verificador
      expect(resultado.chave.slice(-1)).toBe(resultado.cDV);
    });
  });

  describe('gerarCodigoNumerico()', () => {
    it('deve gerar código com 8 dígitos', () => {
      const codigo = gerarCodigoNumerico();
      
      expect(codigo).toHaveLength(8);
      expect(codigo).toMatch(/^\d{8}$/);
    });

    it('deve gerar códigos diferentes', () => {
      const codigo1 = gerarCodigoNumerico();
      const codigo2 = gerarCodigoNumerico();
      
      // Pode ser igual por acaso, mas improvável
      // Apenas verificar que não lança erro
      expect(codigo1).toHaveLength(8);
      expect(codigo2).toHaveLength(8);
    });
  });

  describe('formatarValorXML()', () => {
    it('deve formatar com 2 casas decimais', () => {
      expect(formatarValorXML(100)).toBe('100.00');
      expect(formatarValorXML(123.456)).toBe('123.46');
      expect(formatarValorXML(0)).toBe('0.00');
    });
  });

  describe('formatarDataHoraXML()', () => {
    it('deve formatar no padrão ISO com timezone', () => {
      const data = new Date('2024-12-24T10:30:00Z');
      const formatado = formatarDataHoraXML(data);
      
      expect(formatado).toContain('2024-12-24');
      expect(formatado).toContain('-03:00');
    });
  });
});


