# Modelos e Schemas XSD - NFS-e Nacional

> Fonte: `xsd/sefin-adn/`, `xsd/cnc/`, `xsd/painel-municipal/`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Inventario de XSDs

### 1.1 SEFIN/ADN (Anexos I, II, IV)

Localizacao: `xsd/sefin-adn/`

| Arquivo | Elemento Raiz | Descricao |
|---------|---------------|-----------|
| DPS_v1.00.xsd | `<DPS>` | Declaracao Prestacao Servico |
| NFSe_v1.00.xsd | `<NFSe>` | Nota Fiscal Servico Eletronica |
| evento_v1.00.xsd | `<evento>` | Evento de NFS-e |
| pedRegEvento_v1.00.xsd | `<pedRegEvento>` | Pedido Registro Evento |
| tiposComplexos_v1.00.xsd | - | Tipos complexos compartilhados |
| tiposEventos_v1.00.xsd | - | Tipos de eventos |
| tiposSimples_v1.00.xsd | - | Tipos simples (enums, strings) |
| xmldsig-core-schema.xsd | - | Assinatura digital XML |

### 1.2 CNC (Anexo III)

Localizacao: `xsd/cnc/`

| Arquivo | Descricao |
|---------|-----------|
| CNC_v1.00.xsd | Cadastro Nacional Contribuintes |
| tiposCnc_v1.00.xsd | Tipos especificos CNC |
| tiposComplexos_v1.00.xsd | Tipos complexos |
| tiposSimples_v1.00.xsd | Tipos simples |

### 1.3 Painel Municipal (Anexo V)

Localizacao: `xsd/painel-municipal/`

| Arquivo | Descricao |
|---------|-----------|
| PARAM_v1.00.xsd | Parametros municipais |
| tiposComplexos_v1.00.xsd | Tipos complexos |
| tiposSimples_v1.00.xsd | Tipos simples |

---

## 2. Estrutura da DPS (Declaracao Prestacao Servico)

Namespace: `http://www.sped.fazenda.gov.br/nfse`

```xml
<DPS versao="1.00">
  <infDPS Id="DPS...">
    <tpAmb>1</tpAmb>                    <!-- 1=Prod, 2=Hom -->
    <dhEmi>2025-12-24T10:00:00-03:00</dhEmi>
    <verAplic>1.0.0</verAplic>
    <serie>00001</serie>
    <nDPS>000000000000001</nDPS>
    <dCompet>2025-12-24</dCompet>
    <tpEmit>1</tpEmit>                  <!-- 1=Prestador -->
    <cLocEmi>3550308</cLocEmi>          <!-- Cod IBGE -->
    
    <prest>                              <!-- Prestador -->
      <CNPJ>12345678000199</CNPJ>
      <IM>12345678</IM>
      <regTrib>
        <opSimpNac>3</opSimpNac>        <!-- ME/EPP -->
        <regEspTrib>0</regEspTrib>
      </regTrib>
    </prest>
    
    <toma>                               <!-- Tomador (opcional) -->
      <CNPJ>98765432000188</CNPJ>
      <xNome>Empresa Tomadora</xNome>
    </toma>
    
    <serv>                               <!-- Servico -->
      <locPrest>
        <cLocPrestacao>3550308</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>010801</cTribNac>      <!-- LC 116 -->
        <xDescServ>Desenvolvimento de software</xDescServ>
      </cServ>
    </serv>
    
    <valores>
      <vServPrest>
        <vServ>1000.00</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>       <!-- Tributavel -->
          <tpRetISSQN>1</tpRetISSQN>     <!-- Nao retido -->
          <pAliq>5.00</pAliq>
        </tribMun>
        <totTrib>
          <indTotTrib>0</indTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
  <Signature>...</Signature>
</DPS>
```

---

## 3. Campos Obrigatorios da DPS

| Grupo | Campo | Tipo | Descricao |
|-------|-------|------|-----------|
| infDPS | @Id | TSIdDPS | ID unico da DPS |
| infDPS | tpAmb | 1\|2 | Ambiente |
| infDPS | dhEmi | DateTime | Data/hora emissao UTC |
| infDPS | verAplic | String | Versao aplicativo |
| infDPS | serie | String(5) | Serie da DPS |
| infDPS | nDPS | String(15) | Numero da DPS |
| infDPS | dCompet | Date | Data competencia |
| infDPS | tpEmit | 1\|2\|3 | Tipo emitente |
| infDPS | cLocEmi | String(7) | Cod IBGE municipio |
| prest | CNPJ\|CPF | String | Identificacao prestador |
| prest/regTrib | opSimpNac | 1\|2\|3 | Opcao Simples Nacional |
| prest/regTrib | regEspTrib | 0-6 | Regime especial |
| serv/locPrest | cLocPrestacao\|cPaisPrestacao | String | Local prestacao |
| serv/cServ | cTribNac | String(6) | Codigo LC 116 |
| serv/cServ | xDescServ | String(2000) | Descricao servico |
| valores/vServPrest | vServ | Decimal | Valor servico |
| valores/trib/tribMun | tribISSQN | 1-4 | Tributacao ISSQN |
| valores/trib/tribMun | tpRetISSQN | 1-3 | Tipo retencao |
| valores/trib/totTrib | indTotTrib\|vTotTrib\|pTotTrib | - | Total tributos |

---

## 4. Estrutura da NFS-e

```xml
<NFSe versao="1.00">
  <infNFSe Id="NFSe...">
    <xLocEmi>SAO PAULO</xLocEmi>
    <xLocPrestacao>SAO PAULO</xLocPrestacao>
    <nNFSe>000000123</nNFSe>
    <cLocIncid>3550308</cLocIncid>
    <xTribNac>Desenvolvimento de software</xTribNac>
    <verAplic>1.0.0</verAplic>
    <ambGer>1</ambGer>
    <tpEmis>1</tpEmis>
    <cStat>100</cStat>
    <dhProc>2025-12-24T10:00:15-03:00</dhProc>
    <nDFSe>000000001</nDFSe>
    
    <emit>
      <CNPJ>12345678000199</CNPJ>
      <xNome>Empresa Prestadora</xNome>
      <enderNac>...</enderNac>
    </emit>
    
    <valores>
      <vBC>1000.00</vBC>
      <pAliqAplic>5.00</pAliqAplic>
      <vISSQN>50.00</vISSQN>
      <vLiq>950.00</vLiq>
    </valores>
    
    <DPS>...</DPS>                       <!-- DPS original -->
  </infNFSe>
  <Signature>...</Signature>
</NFSe>
```

---

## 5. Estrutura do Evento

```xml
<evento versao="1.00">
  <infEvento Id="EVT...">
    <verAplic>1.0.0</verAplic>
    <ambGer>1</ambGer>
    <nSeqEvento>1</nSeqEvento>
    <dhProc>2025-12-24T11:00:00-03:00</dhProc>
    <nDFe>000000001</nDFe>
    
    <pedRegEvento versao="1.00">
      <infPedReg Id="PED...">
        <tpAmb>1</tpAmb>
        <verAplic>1.0.0</verAplic>
        <dhEvento>2025-12-24T10:55:00-03:00</dhEvento>
        <CNPJAutor>12345678000199</CNPJAutor>
        <chNFSe>NFSe35250612345678000195...</chNFSe>
        <nPedRegEvento>1</nPedRegEvento>
        
        <!-- Tipo especifico do evento -->
        <e101101>
          <xDesc>Cancelamento de NFS-e</xDesc>
          <cMotivo>1</cMotivo>
          <xMotivo>Erro na emissao</xMotivo>
        </e101101>
      </infPedReg>
      <Signature>...</Signature>
    </pedRegEvento>
  </infEvento>
  <Signature>...</Signature>
</evento>
```

---

## 6. Tipos Simples Importantes

### 6.1 Enumeracoes

| Tipo | Valores | Descricao |
|------|---------|-----------|
| TSTipoAmbiente | 1, 2 | 1=Producao, 2=Homologacao |
| TSEmitenteDPS | 1, 2, 3 | 1=Prestador, 2=Tomador, 3=Intermediario |
| TSOpSimpNac | 1, 2, 3 | Simples Nacional |
| TSRegEspTrib | 0-6 | Regime especial tributacao |
| TSTribISSQN | 1-4 | 1=Tributavel, 2=Imune, 3=Export, 4=NaoIncid |
| TSTipoRetISSQN | 1-3 | 1=NaoRetido, 2=Tomador, 3=Intermediario |

### 6.2 Formatos

| Tipo | Formato | Exemplo |
|------|---------|---------|
| TSCNPJ | \d{14} | 12345678000199 |
| TSCPF | \d{11} | 12345678901 |
| TSCodMunIBGE | \d{7} | 3550308 |
| TSCodTribNac | \d{6} | 010801 |
| TSDec15V2 | Decimal(15,2) | 1000.00 |
| TSDateTimeUTC | ISO 8601 | 2025-12-24T10:00:00-03:00 |

---

## 7. Mapeamento XSD → Operacao

| XSD | Operacao | Endpoint |
|-----|----------|----------|
| DPS_v1.00.xsd | Emissao | POST /nfse |
| NFSe_v1.00.xsd | Resposta emissao, Consulta | GET /nfse/{ch} |
| evento_v1.00.xsd | Resposta evento | GET /eventos |
| pedRegEvento_v1.00.xsd | Registro evento | POST /eventos |
| CNC_v1.00.xsd | Cadastro contribuinte | POST /CNC |
| PARAM_v1.00.xsd | Parametros | GET /parametros |

