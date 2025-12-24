/**
 * Mocks de respostas SEFAZ para testes
 */

export const MOCK_STATUS_OK = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <retConsStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>107</cStat>
        <xMotivo>Serviço em Operação</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
        <tMed>1</tMed>
      </retConsStatServ>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_STATUS_INDISPONIVEL = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <retConsStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>108</cStat>
        <xMotivo>Serviço Paralisado Momentaneamente</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
      </retConsStatServ>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_AUTORIZACAO_SUCESSO = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>104</cStat>
        <xMotivo>Lote processado</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
        <protNFe versao="4.00">
          <infProt>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_008l</verAplic>
            <chNFe>35241212345678000190550010000000011123456789</chNFe>
            <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
            <nProt>135241234567890</nProt>
            <digVal>abcdef123456</digVal>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
          </infProt>
        </protNFe>
      </retEnviNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_AUTORIZACAO_REJEICAO = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>104</cStat>
        <xMotivo>Lote processado</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
        <protNFe versao="4.00">
          <infProt>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_008l</verAplic>
            <chNFe>35241212345678000190550010000000011123456789</chNFe>
            <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
            <cStat>539</cStat>
            <xMotivo>Rejeição: Duplicidade de NF-e</xMotivo>
          </infProt>
        </protNFe>
      </retEnviNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_CONSULTA_AUTORIZADA = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
        <chNFe>35241212345678000190550010000000011123456789</chNFe>
        <protNFe versao="4.00">
          <infProt>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_008l</verAplic>
            <chNFe>35241212345678000190550010000000011123456789</chNFe>
            <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
            <nProt>135241234567890</nProt>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
          </infProt>
        </protNFe>
      </retConsSitNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_CONSULTA_CANCELADA = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>101</cStat>
        <xMotivo>Cancelamento de NF-e homologado</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
        <chNFe>35241212345678000190550010000000011123456789</chNFe>
      </retConsSitNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_CONSULTA_NAO_ENCONTRADA = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cStat>217</cStat>
        <xMotivo>NF-e não consta na base de dados da SEFAZ</xMotivo>
        <cUF>35</cUF>
        <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
      </retConsSitNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_CANCELAMENTO_SUCESSO = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <idLote>123456</idLote>
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cOrgao>35</cOrgao>
        <cStat>128</cStat>
        <xMotivo>Lote de Evento Processado</xMotivo>
        <retEvento versao="1.00">
          <infEvento>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_008l</verAplic>
            <cOrgao>35</cOrgao>
            <cStat>135</cStat>
            <xMotivo>Evento registrado e vinculado a NF-e</xMotivo>
            <chNFe>35241212345678000190550010000000011123456789</chNFe>
            <tpEvento>110111</tpEvento>
            <xEvento>Cancelamento</xEvento>
            <nSeqEvento>1</nSeqEvento>
            <dhRegEvento>2024-12-24T11:00:00-03:00</dhRegEvento>
            <nProt>135241234567891</nProt>
          </infEvento>
        </retEvento>
      </retEnvEvento>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_CANCELAMENTO_FORA_PRAZO = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <idLote>123456</idLote>
        <tpAmb>2</tpAmb>
        <verAplic>SP_NFE_PL_008l</verAplic>
        <cOrgao>35</cOrgao>
        <cStat>128</cStat>
        <xMotivo>Lote de Evento Processado</xMotivo>
        <retEvento versao="1.00">
          <infEvento>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_008l</verAplic>
            <cOrgao>35</cOrgao>
            <cStat>501</cStat>
            <xMotivo>Rejeição: Prazo de Cancelamento Superior ao Previsto</xMotivo>
            <chNFe>35241212345678000190550010000000011123456789</chNFe>
            <tpEvento>110111</tpEvento>
          </infEvento>
        </retEvento>
      </retEnvEvento>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

export const MOCK_INUTILIZACAO_SUCESSO = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">
      <retInutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <infInut>
          <tpAmb>2</tpAmb>
          <verAplic>SP_NFE_PL_008l</verAplic>
          <cStat>102</cStat>
          <xMotivo>Inutilização de número homologado</xMotivo>
          <cUF>35</cUF>
          <ano>24</ano>
          <CNPJ>12345678000190</CNPJ>
          <mod>55</mod>
          <serie>1</serie>
          <nNFIni>10</nNFIni>
          <nNFFin>20</nNFFin>
          <dhRecbto>2024-12-24T10:30:00-03:00</dhRecbto>
          <nProt>135241234567892</nProt>
        </infInut>
      </retInutNFe>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;


