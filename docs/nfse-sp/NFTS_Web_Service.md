# NFTS_Web_Service

*Fonte:* `NFTS_Web_Service.pdf`  

*Páginas:* 54


---


## Página 1

Nota Fiscal de 
Serviços 
Eletrônica - NFS-e 
 
 
Manual de Utilização 
Web Service da NFTS 
 
 
Versão 2.0

## Página 2

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 2 
 
 
Manual de Utilização 
Web Service 
 
ÍNDICE 
 
1. INTRODUÇÃO .................................................................................................................................................... 4 
2. INTERFACES DISPONÍVEIS .................................................................................................................................. 4 
2.1. ENVIO DE NFTS ................................................................................................................................................... 4 
2.2. ENVIO DE LOTE DE NFTS ..................................................................................................................................... 4 
2.3. TESTE DE ENVIO DE LOTE DE NFTS ...................................................................................................................... 4 
2.4. CONSULTA DE NFTS ............................................................................................................................................ 4 
2.7. CONSULTA DE LOTE ............................................................................................................................................ 5 
2.8. CONSULTA INFORMAÇÕES DO LOTE .................................................................................................................. 5 
2.9. CANCELAMENTO DE NFTS .................................................................................................................................. 5 
2.10. CONSULTA EMISSÃO ........................................................................................................................................ 5 
3. ARQUITETURA DE COMUNICAÇÃO .................................................................................................................... 5 
3.1. MODELO CONCEITUAL ....................................................................................................................................... 5 
3.2. PADRÕES TÉCNICOS ........................................................................................................................................... 6 
3.2.1. Padrão de Comunicação ............................................................................................................................. 6 
3.2.2. Padrão de Certificado Digital ...................................................................................................................... 6 
3.2.3. Padrão de Assinatura Digital ...................................................................................................................... 7 
3.2.4. Validação de Assinatura Digital pelo Sistema de NFTS ............................................................................... 7 
3.2.5. Resumo dos Padrões Técnicos ................................................................................................................... 8 
3.3. MODELO OPERACIONAL..................................................................................................................................... 9 
3.3.1. Serviços....................................................................................................................................................... 9 
3.4. PADRÃO DAS MENSAGENS XML ......................................................................................................................... 9 
3.4.1. Validação da estrutura das Mensagens XML.............................................................................................. 9 
3.4.2. Schemas XML (arquivos XSD) ................................................................................................................... 10 
3.4.3. Versão dos Schemas XML ......................................................................................................................... 10 
3.4.4. Regras de preenchimento dos campos .................................................................................................... 11 
3.4.5. Tratamento de caracteres especiais no texto de XML ............................................................................. 12 
4. WEB SERVICE LOTE NFTS .................................................................................................................................. 12 
4.1. WSDL ................................................................................................................................................................ 12 
4.2. TIPOS UTILIZADOS ............................................................................................................................................ 13 
4.2.1. Tipos Simples ............................................................................................................................................ 13 
4.2.1.1. TiposNFTS_v01.xsd (versão 1).............................................................................................................................. 14

## Página 3

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 3 
 
 
4.2.2. Tipos Complexos....................................................................................................................................... 19 
4.2.2.1. TiposNFTS_v01.xsd (versão 1).............................................................................................................................. 19 
4.3. SERVIÇOS E MÉTODOS ..................................................................................................................................... 32 
4.3.1. Regras Gerais ............................................................................................................................................ 33 
4.3.2. Envio de NFTS ........................................................................................................................................... 34 
4.3.2.1. Assinatura da NFTS .............................................................................................................................................. 35 
4.3.3. Envio de Lote de NFTS (EnvioLoteNFTS) ................................................................................................... 37 
4.3.4. Teste de Envio de Lote de NFTS (TesteEnvioLoteNFTS) ........................................................................... 40 
4.3.5. Pedido de Consulta de NFTS (ConsultaNFTS) ........................................................................................... 40 
4.3.6. Pedido de Consulta de NFTS Emitidas (ConsultaEmissaoNFTS) ............................................................... 42 
4.3.8. Pedido de Consulta de Lote (ConsultaLote) ............................................................................................. 43 
4.3.9. Pedido de Informações do Lote (ConsultaInformacoesLote) ................................................................... 44 
4.3.10. Pedido de Cancelamento de NFTS (CancelamentoNFTS) ....................................................................... 46 
4.3.10.1. Assinatura do Cancelamento ............................................................................................................................. 47 
4.4. TABELA DE ERROS E ALERTAS ........................................................................................................................... 48 
4.4.1. Erros ......................................................................................................................................................... 49 
4.4.2. Alertas ...................................................................................................................................................... 53 
5. ARQUIVOS DE EXEMPLOS ................................................................................................................................. 54 
ANEXO I................................................................................................................................................................ 54 
TABELA DE MUNICÍPIOS .......................................................................................................................................... 54

## Página 4

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 4 
 
 
1. INTRODUÇÃO 
 
 
Este manual tem como objetivo apresentar a definição das especificações e critérios técnicos 
necessários para utilização do Web Service NFTS disponibilizado pela Prefeitura de São Paulo para as 
empresas tomadoras e/ou intermediárias de serviços. 
 
Por meio do Web Service as empresas poderão integrar seus próprios sistemas de informações com o 
Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo. Desta forma, é possível automatizar-se 
o processo de emissão, consulta e cancelamento de NFTS. 
 
Manual Versão 
Alterações 
Data 
2.0 
Novos campos do ISS na NFTS 
Novos campos na NFTS para a Reforma Tributária 2026 
 
ATENÇÃO: Os arquivos XSD versão 2.0 com os novos campos já 
estão disponíveis para consulta. No entanto, os Webservices 
ainda não estão habilitados para receber esses novos campos. 
Recomendamos que, por enquanto, os sistemas continuem utilizando 
os campos atualmente suportados pelos Webservices em produção. 
Assim que os serviços forem atualizados para aceitar os novos 
campos, comunicaremos oficialmente. 
 
Alteração: 
Foram adicionados no tpNFTS os novos campos de ISS.  
Foram adicionados os novos campos para a Reforma Tributária 2026. 
 
Orientações: no cabeçalho, o campo “Versao” deverá ser igual a 2 
quando forem informados os novos campos da Reforma Tributária 
2026. 
 
 
Novembro/2025 
 
2. INTERFACES DISPONÍVEIS 
 
 
Através do Web Service, o Sistema de Notas Fiscais Eletrônicas® da Prefeitura de São Paulo 
disponibiliza uma série de interfaces que poderão ser acessadas pelos sistemas dos contribuintes. A 
seguir, estão resumidas as interfaces disponíveis e suas respectivas funcionalidades básicas. 
 
2.1. ENVIO DE NFTS 
 
Através desta interface, os tomadores de serviços poderão enviar uma NFTS emitida por seu sistema. 
Esta interface destina-se aos tomadores que desejam emitir NFTS “on-line” e individualmente. Para 
emissões de grandes volumes recomendamos a utilização da interface Envio de Lote de NFTS. 
 
2.2. ENVIO DE LOTE DE NFTS 
 
Através desta interface, os prestadores de serviços poderão enviar lotes de NFTS emitidos por seus 
sistemas. Esta interface destina-se aos tomadores que desejam emitir NFTS “off-line” e em grandes 
volumes. 
 
2.3. TESTE DE ENVIO DE LOTE DE NFTS 
 
O uso desta interface é opcional. A interface de Envio de Lote de NFTS faz exatamente as mesmas 
verificações, entretanto na interface de Teste nenhuma NFTS é gerada. Esta interface deverá ser usada 
apenas na fase de adaptação dos sistemas dos usuários emitentes. Nos casos de sistemas já 
adaptados, seu uso resulta em duplicidade de esforços desnecessários. 
 
2.4. CONSULTA DE NFTS

## Página 5

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 5 
 
 
Esta interface permite os tomadores e intermediários de serviços consultarem as NFTS emitidas por ele. 
 
2.7. CONSULTA DE LOTE 
 
Após o envio bem-sucedido de um Lote de NFTS, o Web Service retorna diversas informações, entre 
elas o número do lote processado. Com esta interface, basta informar o número do lote desejado para 
receber as informações de todas as NFTS geradas neste lote. 
 
2.8. CONSULTA INFORMAÇÕES DO LOTE 
 
Após o envio bem-sucedido de um Lote de NFTS, o Web Service retorna diversas informações, entre 
elas o número do lote processado. Com esta interface, basta informar o número do lote desejado para 
receber informações resumidas: data/hora de envio do lote, quantidade de notas processadas, tempo de 
processamento, etc. 
Para ter informações das notas processadas, deve-se usar a interface de Consulta de Lote. 
 
2.9. CANCELAMENTO DE NFTS 
 
Com esta interface, os tomadores e/ou intermediários de serviços poderão cancelar as NFTS emitidas 
por ele, informando apenas os números da NFTS que deverão ser canceladas. 
 
2.10. CONSULTA EMISSÃO 
 
Esta interface possibilita aos tomadores, intermediários e/ou prestadores de serviços consultarem quais 
Inscrições Municipais (CCM) estão vinculadas a um determinado CNPJ e se estes contribuintes já 
emitem NFS-e. 
 
3. ARQUITETURA DE COMUNICAÇÃO 
 
 
3.1. MODELO CONCEITUAL 
 
O Web Service do Sistema de Notas Fiscais Eletrônicas® da Prefeitura de São Paulo irá disponibilizar as 
seguintes funcionalidades: 
 
A. Envio de NFTS; 
B. Envio de Lote de NFTS; 
C. Teste de Envio de Lote de NFTS; 
D. Consulta de NFTS; 
E. Consulta de Lote; 
F. Consulta de Informações de Lote; 
G. Cancelamento de NFTS; 
H. Consulta de Emissão. 
 
Existirá um único Web Service com todos os serviços apresentados acima. O fluxo de comunicação é 
sempre iniciado pelo sistema do contribuinte através do envio de uma mensagem XML ao Web Service 
com o pedido do serviço desejado. 
O pedido de serviço será atendido na mesma conexão (todos os serviços serão síncronos). O 
processamento do pedido do serviço é concluído na mesma conexão, com a devolução de uma 
mensagem XML contendo o retorno do processamento do serviço pedido;

## Página 6

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 6 
 
 
O diagrama a seguir ilustra o fluxo conceitual de comunicação entre o sistema do contribuinte e o 
Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo: 
 
 
 
 
 
3.2. PADRÕES TÉCNICOS 
3.2.1. Padrão de Comunicação 
 
A comunicação entre os sistemas de informações dos contribuintes e o Sistema de Notas Fiscais 
Eletrônicas da Prefeitura de São Paulo será baseada em um Web Service disponibilizado no Sistema de 
Notas Fiscais Eletrônicas. O meio físico de comunicação utilizado será a Internet, com o uso do 
protocolo SSL, que além de garantir um duto de comunicação seguro na Internet, permite a identificação 
do servidor e do cliente através de certificados digitais, eliminando a necessidade de identificação do 
usuário através de nome ou código de usuário e senha. 
 
O modelo de comunicação segue o padrão de Web Services definido pelo WS-I Basic Profile. A troca de 
mensagens entre o Web Service do Sistema de Notas Fiscais Eletrônicas® da Prefeitura de São Paulo e 
o sistema do contribuinte será realizada no padrão SOAP, com troca de mensagens XML no padrão 
Style/Enconding: Document/Literal, wrapped. A opção “wrapped” representa a chamada aos métodos 
disponíveis com a passagem de mais de um parâmetro. 
 
3.2.2. Padrão de Certificado Digital 
 
Os certificados digitais utilizados no Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo 
serão emitidos por Autoridade Certificadora credenciada pela Infra-estrutura de Chaves Públicas 
Brasileira – ICP-Brasil, tipo A1, A3 ou A4, devendo conter o CNPJ do proprietário do certificado digital. 
 
Os certificados digitais serão exigidos no mínimo* em dois (2) momentos distintos: 
 
A. Assinatura de Mensagens XML: 
 
Quem pode assinar a Mensagem XML: 
 
 
▪ 
Todas as Mensagens XML podem ser assinadas pelo próprio contribuinte. Neste caso o 
certificado digital utilizado deverá conter o CNPJ do contribuinte que gerou a mensagem 
XML; 
 
Todas as mensagens XML deverão conter o CPF/CNPJ de quem estará autorizado a efetuar a 
sua transmissão (TAG CPFCNPJRemetente).

## Página 7

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 7 
 
 
B. Autenticação na transmissão das mensagens entre os servidores do contribuinte e da Prefeitura 
de São Paulo: O certificado digital utilizado para identificar essa função deverá conter o 
CPF/CNPJ do responsável pela transmissão das mensagens. Este CPF/CNPJ deverá ser o 
mesmo que consta na TAG CPFCNPJRemetente da mensagem XML. 
 
* Adicionalmente os certificados digitais também poderão ser exigidos conforme a necessidade 
específica de cada serviço (exemplo: itens 4.3.2 e 4.3.10). 
 
3.2.3. Padrão de Assinatura Digital 
 
As mensagens enviadas ao Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo são 
documentos eletrônicos elaborados no padrão XML e devem ser assinados digitalmente utilizando 
certificado digital, descrito no item 3.2.2. 
 
Os elementos abaixo estão presentes dentro do Certificado do contribuinte tornando desnecessária a 
sua representação individualizada na mensagem XML. Portanto, a mensagem XML não deve conter os 
elementos: 
 
 
<X509SubjectName> 
<X509IssuerSerial> 
<X509IssuerName> 
<X509SerialNumber> 
<X509SKI> 
 
Analogamente, as TAGs abaixo não deverão ser informadas, pois as informações serão obtidas a partir 
do Certificado do emitente: 
 
<KeyValue> 
<RSAKeyValue> 
<Modulus> 
<Exponent> 
 
Para o processo de assinatura, o contribuinte não deve fornecer a Lista de Certificados Revogados, já 
que a mesma será montada e validada pelo Sistema de Notas Fiscais Eletrônicas® da Prefeitura de São 
Paulo. 
 
A assinatura digital do documento eletrônico deverá atender aos seguintes padrões adotados: 
 
A. Padrão de assinatura: “XML Digital Signature”, utilizando o formato “Enveloped” 
(http://www.w3c.org/TR/xmldsig-core/); 
B. Certificado digital: Emitido por AC credenciada no ICP-Brasil 
(http://www.w3c.org/2000/09/xmldsig#X509Data); 
C. Cadeia de Certificação: EndCertOnly (Incluir na assinatura apenas o certificado do usuário final); 
D. Tipo do certificado: A1, A3 ou A4 (o uso de HSM é recomendado); 
E. Tamanho da Chave Criptográfica: Compatível com os certificados A1 e A3 (1024bits) ou A4 
(2048 bits); 
F. Função criptográfica assimétrica: RSA (http://www.w3c.org/2000/09/xmldsig#rsa-sha1); 
G. Função de “message digest”: SHA-1 (http://www.w3c.org/2000/09/xmldsig#sha1); 
H. Codificação: Base64 (http://www.w3c.org/2000/09/xmldsig#base64); 
I. 
Transformações exigidas: Útil para realizar a canonicalização do XML enviado para realizar a 
validação correta da Assinatura Digital. São elas: 
(1) Enveloped (http://www.w3c.org/2000/09/xmldsig#enveloped-signature); 
(2) C14N (http://www.w3c.org/TR/2001/REC-xml-c14n-20010315). 
 
3.2.4. Validação de Assinatura Digital pelo Sistema de NFTS 
 
Para a validação da assinatura digital, seguem as regras que serão adotadas pelo Sistema de Notas

## Página 8

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 8 
 
 
Fiscais Eletrônicas da Prefeitura de São Paulo: 
 
A. Extrair a chave pública do certificado digital e não utilizar a chave indicada na TAG XML 
(ds:KeyValue); 
B. Verificar o prazo de validade do certificado utilizado; 
C. Montar e validar a cadeia de confiança dos certificados validando também a LCR (Lista de 
Certificados Revogados) de cada certificado da cadeia; 
D. Validar o uso da chave utilizada (Assinatura Digital) de tal forma a aceitar certificados somente 
do tipo A (não serão aceitos certificados do tipo S); 
E. Garantir que o certificado utilizado é de um usuário final e não de uma Autoridade Certificadora; 
F. Adotar as regras definidas pelo RFC 3280 para LCRs e cadeia de confiança; 
G. Validar a integridade de todas as LCR utilizadas pelo sistema; 
H. Prazo de validade de cada LCR utilizada (verificar data inicial e final). 
 
A forma de conferência da LCR pelo Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo 
pode ser feita de 2 (duas) maneiras: On-line ou Download periódico. As assinaturas digitais das 
mensagens serão verificadas considerando o horário fornecido pelo Observatório Nacional. 
 
3.2.5. Resumo dos Padrões Técnicos 
 
A tabela a seguir resume os principais padrões de tecnologia utilizados: 
CARACTERÍSTICA 
DESCRIÇÃO 
Web Services 
Padrão definido pelo WS-I Basic Profile 1.1 
(http://www.wsi.org/Profiles/BasicProfile-1.1-2004-08-24.html). 
Meio lógico de comunicação 
Web Service, disponibilizados pelo Sistema de NF-e da Prefeitura de São 
Paulo. 
Meio físico de comunicação 
Internet 
Protocolo Internet 
TLS versão 1.2, com autenticação mútua através de certificados digitais. 
Padrão de troca de mensagens 
SOAP versão 1.2. 
Padrão da mensagem XML 
XML no padrão Style/Encoding: Document/Literal, wrapped. 
Padrão de certificado digital 
X.509 versão 3, emitido por Autoridade Certificadora credenciada pela Infra-
estrutura de Chaves Públicas Brasileira – ICP-Brasil, do tipo A1, A3 ou A4, 
devendo conter o CNPJ do proprietário do certificado digital. 
 
Para assinatura de mensagens, utilizar o certificado digital do 
estabelecimento emissor da NFTS. 
 
Opcionalmente as Mensagens XML de Consulta de NFTS Emitidas, e 
Informações de lote, podem ser assinadas pelo contador (desde que 
cadastrado na tela de “Configurações do Perfil do Contribuinte”) ou por um 
terceiro (ex.: funcionário da empresa contribuinte), desde que o contribuinte 
tenha concedido a este permissão de acesso a consultas (através do menu 
“Gerenciamento de Usuários” do Sistema de Notas Fiscais Eletrônicas). 
Neste caso o certificado digital utilizado deverá conter o CPF/CNPJ do 
contador / usuário autorizado. 
 
Para autenticação, utilizar o certificado digital do responsável pela 
transmissão. 
Padrão de assinatura digital 
XML Digital Signature, Enveloped, com certificado digital X.509 versão 3, 
com chave privada de 1024 bits (A1 / A3) ou 2048 bits (A4), com padrões de 
criptografia assimétrica RSA, algoritmo message digest SHA-1 e utilização 
das transformações Enveloped e C14N. 
Validação de assinatura digital 
Será validado além da integridade e autoria, a cadeia de confiança com a 
validação das LCRs.

## Página 9

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 9 
 
 
CARACTERÍSTICA 
DESCRIÇÃO 
Padrões de preenchimento XML 
• Campos não obrigatórios do Schema que não possuam conteúdo terão 
suas tags suprimidas na mensagem XML. 
• Máscara de números decimais e datas estão definidas no Schema XML. 
• Nos campos numéricos inteiro, não incluir a vírgula ou ponto decimal. 
• Nos campos numéricos com casas decimais, utilizar o “ponto decimal” na 
separação da parte inteira. 
 
3.3. MODELO OPERACIONAL 
 
Como dito anteriormente, a forma de processamento dos pedidos de serviços do Web Service do 
Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo será síncrona, atendo ao pedido de 
serviço na mesma conexão. 
3.3.1. Serviços 
 
Os pedidos de serviços são processados imediatamente e o resultado do processamento é obtido em 
uma única conexão. 
 
Abaixo, o fluxo simplificado de funcionamento: 
 
 
 
Etapas do processo ideal: 
 
1. O sistema do contribuinte inicia a conexão enviando uma mensagem XML de pedido do serviço para o 
Web Service; 
2. O Web Service recebe a mensagem XML de pedido do serviço e encaminha ao Sistema NFS-e; 
3. O Sistema NFS-e recebe a mensagem XML de pedido do serviço e realiza o processamento*, 
devolvendo uma mensagem XML de retorno ao Web Service; 
4. O Web Service recebe a mensagem XML de retorno e a encaminha ao sistema do contribuinte; 
5. O sistema do contribuinte recebe a mensagem XML de retorno e encerra a conexão. 
 
 
 
3.4. PADRÃO DAS MENSAGENS XML 
 
A especificação adotada para as mensagens XML é a recomendação W3C para XML 1.0, disponível em 
www.w3.org/TR/REC-xml e a codificação dos caracteres será em UTF-8. 
 
3.4.1. Validação da estrutura das Mensagens XML 
 
Para garantir minimamente a integridade das informações prestadas e a correta formação das 
mensagens XML, o contribuinte deverá submeter cada uma das mensagens XML de pedido de serviço 
para validação pelo seu respectivo arquivo XSD (XML Schema Definition, definição de esquemas XML) 
antes de seu envio. Neste manual utilizaremos a nomenclatura Schema XML para nos referir a arquivo 
XSD.

## Página 10

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 10 
 
 
Um Schema XML define o conteúdo de uma mensagem XML, descrevendo os seus atributos, elementos 
e a sua organização, além de estabelecer regras de preenchimento de conteúdo e de obrigatoriedade de 
cada elemento ou grupo de informação. 
 
A validação da estrutura da mensagem XML é realizada por um analisador sintático (parser) que verifica 
se a mensagem XML atende as definições e regras de seu respectivo Schema XML. 
 
Qualquer divergência da estrutura da mensagem XML em relação ao seu respectivo Schema XML, 
provoca um erro de validação do Schema XML. Neste caso o conteúdo da mensagem XML de pedido do 
serviço não poderá ser processado. 
 
A primeira condição para que a mensagem XML seja validada com sucesso é que ela seja submetida ao 
Schema XML correto. Assim, os sistemas de informação dos contribuintes devem estar preparados para 
gerar mensagens XML em seus respectivos Schemas XML em vigor. 
 
3.4.2. Schemas XML (arquivos XSD) 
 
O Schema XML (arquivo XSD) correspondente a cada uma das mensagens XML de pedido e de retorno 
utilizadas pelo Web Service LoteNFTS pode ser obtido na internet acessando o Portal do Sistema de 
Notas Fiscais Eletrônicas da Prefeitura de São Paulo. Para obter os Schemas XML do Web Service da 
NFTS acione o navegador Web (Firefox, Internet Explorer, por exemplo) e digite o endereço a seguir: 
 
a) Notas (NFS-e e NFTS) emitidas até 22/02/2015 
https://nfe.prefeitura.sp.gov.br/ws/schemas.zip 
 
b) (NFS-e e NFTS) emitidas a partir de 23/02/2015 
https://nfe.prefeitura.sp.gov.br/ws/schemasV02.zip 
 
c) Reforma Tributária  
https://notadomilhao.sf.prefeitura.sp.gov.br/wp-content/uploads/2025/11/Tipos-NFTS.7z 
 
3.4.3. Versão dos Schemas XML 
 
Toda mudança de layout das mensagens XML do Web Service implica na atualização do seu respectivo 
Schema XML. A identificação da versão dos Schemas XML será realizada com o acréscimo do número 
da versão no nome do arquivo XSD precedida da literal ‘_v’, como segue: 
 
▪ 
PedidoEnvioLoteNFTS_v02.xsd (Schema XML de Envio de Lote de NFTS, versão 2); 
▪ 
RetornoEnvioLoteNFTS_v03.xsd (Schema XML do Retorno de Envio de Lote de NFTS, versão 
3); 
▪ 
TiposNFTS_v03.xsd (Schema XML dos tipos básicos da NFTS, versão 3). 
 
A maioria dos Schemas XML definidos para a utilização do Web Service do Sistema de Notas Fiscais 
Eletrônicas da Prefeitura de São Paulo utiliza as definições de tipos simples ou tipos complexos que 
estão definidos em outros Schemas XML (ex.: TiposNFTS.xsd e xmldsig-core-schema.xsd), nestes 
casos, a modificação de versão do Schema básico será repercutida no Schema principal. 
 
Por exemplo, o tipo NFTS (tpNFTS) utilizado no Schema PedidoEnvioLoteNFTS_V04.xsd está definido 
no Schema TiposNFTS_V01.xsd, caso ocorra alguma modificação na definição deste tipo, e um 
consequente incremento da versão do Schema TiposNFTS_V01.xsd para TiposNFTS_V02.xsd o 
Schema PedidoEnvioLoteNFTS_V04.xsd (bem como todos os Schemas que utilizam o tipo RPS) deve 
ter a declaração “import” atualizada com o nome do Schema TiposNFTS_V02.xsd e a versão atualizada 
para PedidoEnvioLoteNFTS_V05.xsd. 
 
Exemplo Parcial de Schema XML de Pedido de Envio de Lote de NFTS (arquivo 
PedidoEnvioLoteNFTS_v01.xsd):

## Página 11

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 11 
 
 
 
 
As modificações de layout das mensagens XML do Web Service podem ser causadas por necessidades 
técnicas ou em razão da modificação de alguma legislação. As modificações decorrentes de alteração da 
legislação deverão ser implementadas nos prazos previstos no ato normativo que introduziu a alteração. 
As modificações de ordem técnica serão divulgadas pela Prefeitura de São Paulo e poderão ocorrer 
sempre que se fizerem necessárias. 
 
3.4.4. Regras de preenchimento dos campos 
 
▪ 
Campos que representam CPF e CNPJ (respectivamente 11 e 14 caracteres) devem ser informados 
com o tamanho fixo previsto, sem formatação e com o preenchimento dos zeros não significativos; 
▪ 
Campos numéricos que representam valores e quantidades são de tamanho variável, respeitando o 
tamanho máximo previsto para o campo e a quantidade de casas decimais (quando houver). O 
preenchimento de zeros não significativos causa erro de validação do Schema XML. 
▪ 
Os campos numéricos devem ser informados sem o separador de milhar, com uso do ponto decimal 
para indicar a parte fracionária (quando houver) respeitando-se a quantidade de dígitos prevista no 
layout; 
▪ 
As datas devem ser informadas no formato “AAAA-MM-DD”. 
 
Para reduzir o tamanho final das mensagens XML alguns cuidados de programação deverão ser 
assumidos: 
 
▪ 
Na geração das mensagens XML, excetuados os campos identificados como obrigatórios no 
respectivo Schema XML, não incluir as TAGs de campos zerados (para campos tipo numérico) ou 
vazios (para campos tipo caractere); 
▪ 
Não incluir "espaços" no início e/ou no final de campos alfanuméricos; 
▪ 
Não incluir comentários na mensagem XML; 
▪ 
Não incluir anotação e documentação na mensagem XML (TAG annotation e TAG documentation); 
▪ 
Não incluir caracteres de formatação na mensagem XML: “LF” (Line Feed ou salto de linha, 
caractere ASCII 10), "CR" (Carriage Return ou retorno do carro, caractere ASCII 13), "tab", 
(caractere de "espaço" entre as TAGs).

## Página 12

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 12 
 
 
 
3.4.5. Tratamento de caracteres especiais no texto de XML 
 
Todos os textos de uma mensagem XML passam por uma análise do “parser” específico da linguagem. 
Alguns caracteres afetam o funcionamento deste “parser”, não podendo aparecer no texto de uma forma 
não controlada. Estes caracteres devem ser substituídos conforme a tabela a seguir: 
 
CARACTERES QUE AFETAM O “PARSER” 
DESCRIÇÃO 
SUBSTITUIR POR 
> 
Sinal de maior 
&gt; 
< 
Sinal de menor 
&lt; 
& 
E-comercial 
&amp; 
“ 
Aspas 
&quot; 
‘ 
Sinal de apóstrofe 
&apos; 
 
 
 
 
 
 
 
 
 
4. Web Service Lote NFTS 
 
O Web Service LoteNFTS, do Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo, 
disponibiliza os serviços que serão utilizados pelos sistemas de informação dos contribuintes. O 
mecanismo de utilização do Web Service LoteNFTS segue as seguintes premissas: 
 
Será disponibilizado um Web Service (LoteNFTS) para todos os serviços, existindo um método Web para 
cada tipo de serviço. 
Os serviços disponibilizados serão síncronos, por tanto o envio da mensagem XML de pedido do serviço 
e a obtenção da mensagem XML de retorno serão realizados na mesma conexão através de um único 
método. 
As mensagens XML de pedido de serviço que excederem o tamanho limite previsto (500 KB) obterão 
como retorno uma mensagem XML de erro. Por tanto os sistemas de informação dos contribuintes não 
poderão permitir a geração de mensagens XML com tamanho superior a 500 KB. 
 
Primeiramente cada mensagem XML de pedido de serviço será recebida pelo Web Service LoteNFTS 
para validação de seu respectivo Schema XML (arquivo XSD). Caso ocorram erros de validação do 
Schema XML, o conteúdo da mensagem XML não será processado e será retornada uma mensagem 
XML contendo o(s) erro(s) ocorrido(s). 
 
 
4.1. WSDL 
 
Para que os sistemas de informação dos contribuintes saibam quais parâmetros enviar ao Web Service 
LoteNFTS e quais parâmetros serão retornados, os contribuintes deverão utilizar o arquivo WSDL (Web 
Service Description Language, linguagem de descrição de serviço Web). Trata-se de um arquivo XML 
que configura como ocorrerá a interação entre um Web Service e seus consumidores (sistemas de 
informação dos contribuintes). 
 
O WSDL é uma linguagem baseada em XML, com a finalidade de documentar as mensagens XML que o 
Web service aceita (pedidos de serviço) e gera (retornos). Esse mecanismo padrão facilita a 
interpretação dos contratos pelos desenvolvedores e ferramentas de desenvolvimento.

## Página 13

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 13 
 
 
Para enxergar o valor do WSDL, imagine que um contribuinte quer invocar um dos métodos que é 
fornecido pelo Web Service LoteNFTS. O contribuinte pode pedir alguns exemplos de mensagens XML 
de pedido e de retorno e escrever sua aplicação para produzir e consumir mensagens XML que se 
parecem com os exemplos, mas isso pode gerar muitos erros. Por exemplo, o contribuinte pode assumir 
que um campo é um inteiro, quando de fato é uma string. O WSDL especifica o que a mensagem XML 
de pedido deve conter e como vai ser a mensagem XML de retorno, em uma notação não ambígua. 
 
A notação que o arquivo WSDL usa para descrever o formato das mensagens é baseada no padrão 
XML, o que significa que é uma linguagem de programação neutra e baseada em padrões, o que a torna 
adequada para descrever as interfaces dos Web services, que são acessíveis por uma grande variedade 
de plataformas e linguagens de programação. Além de descrever o conteúdo das mensagens, o WSDL 
define onde o serviço está disponível e quais protocolos de comunicação são usados para conversar 
com o serviço. Isso significa que o arquivo WSDL define tudo que é necessário para escrever um 
programa que utilize o XML Web service. Há várias ferramentas disponíveis para ler o arquivo WSDL e 
gerar o código para comunicar com o XML Web service. 
 
A documentação do WSDL pode ser obtida na internet acessando o endereço do Web Service do 
Sistema de Notas Fiscais Eletrônicas da Prefeitura de São Paulo. 
 
Para obter o WSDL do Web Service da NFTS acione o navegador Web (Firefox, Internet Explorer, por 
exemplo) e digite o endereço a seguir: https://nfe.prefeitura.sp.gov.br/ws/LoteNFTS.asmx?WSDL.  
 
 
4.2. TIPOS UTILIZADOS 
 
A seguir são apresentados os tipos Simples e Complexos utilizados nos Schemas XML de pedido e de 
retorno. Estes tipos estão definidos no Schema XML de TiposNFTS. 
 
 
 
Para obter a versão mais recente do Schema XML de TiposNFTS (bem como os demais Schemas XML) 
acesse o link: https://nfe.prefeitura.sp.gov.br/ws/schemas.zip.  
 
4.2.1. Tipos Simples 
 
Descrição dos nomes e abreviações utilizadas nas colunas de cabeçalho do layout da tabela de Tipos 
Simples: 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para 
informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpCidade 
Código da cidade de endereço. 
N 
7 
 
O código informado deverá 
pertencer à Tabela de Municípios 
(do IBGE) disponibilizada pela 
Prefeitura de São Paulo. 
 
A. Coluna Nome do Tipo: Nome do tipo simples; 
B. Coluna Descrição: Descrição do tipo simples; 
C. Coluna Tipo Base: tipo base utilizado na criação do tipo simples. 
B – boolean; 
Base64Binary; 
C – campo alfanumérico; 
D – campo data; 
N – campo numérico; 
D. Coluna Tamanho: x-y, onde x indica o tamanho mínimo e y o tamanho máximo; a existência de 
um único valor indica que o campo tem tamanho fixo, devendo-se informar a quantidade de 
caracteres exigidos, preenchendo-se os zeros não significativos; tamanhos separados por 
vírgula indicam que o campo deve ter um dos tamanhos fixos da lista; 
E. Coluna Dec: indica a quantidade máxima de casas decimais do campo.

## Página 14

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 14 
 
 
Tabelas de tipos simples 
 
4.2.1.1. TiposNFTS_v01.xsd (versão 1) 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpAliquota 
Tipo utilizado para valor de 
alíquota 
 
N 
3-5 
4 
Exemplo: 
5% - 0.05 
2,5% - 0.025 
1,75% - 0.0175 
tpAssinatura 
Assinatura digital de emissão da 
NFTS 
Base64
Binary 
 
 
Assinatura digital do RPS emitido. A 
NFTS deverá ser assinada 
digitalmente. O contribuinte deverá 
assinar uma instância do tipo 
tpNFTS. O certificado digital utilizado 
na assinatura de deverá ser o mesmo 
utilizado na assinatura da mensagem 
XML. 
tpAssinaturaCancelamento 
Assinatura digital de 
cancelamento da NFTS. 
 
Base64
Binary 
 
 
Cada NFTS a ser cancelada deverá 
ter sua respectiva assinatura de 
cancelamento. Cada NFTS a ser 
cancelada deverá ter sua respectiva 
assinatura de cancelamento. O 
contribuinte deve assinar uma 
instancia de DetalheNFTS. O 
certificado digital utilizado na 
assinatura de cancelamento deverá 
ser o mesmo utilizado na assinatura 
da mensagem XML. 
tpBairro 
Bairro do endereço 
C 
0-30 
 
Bairro 
tpCEP 
CEP do endereço 
N 
7-8 
 
CEP 
tpCidade 
Código da cidade do endereço 
N 
7 
 
O código informado deverá pertencer 
à Tabela de Municípios (do IBGE) 
disponibilizada pela Prefeitura de São 
Paulo. 
tpCidadeTexto 
Tipo cidade em formato texto. 
C 
3-50 
 
 
tpCNPJ 
Número no Cadastro Nacional da 
Pessoa Jurídica 
C 
14 
 
 
tpCodigoServico 
Códigos de Serviço 
N 
4-5 
 
O código informado deverá pertencer 
à Tabela de Serviços disponibilizada 
pela Prefeitura de São Paulo. 
tpDescricaoServico 
Descrição do Serviço 
C 
250 
 
 
tpCodigoEvento 
Código do Evento 
N 
3-4 
 
O código informado deverá pertencer 
a Tabela de Erros ou a Tabela de 
Alertas disponibilizada pela Prefeitura 
de São 
Paulo. 
tpCodigoVerificacao 
Código de Verificação da NFTS 
C 
8 
 
Código de verificação da NFTS 
gerado pelo Sistema de Notas Fiscais 
Eletrônicas. 
tpComplementoEndereco 
Complemento do Endereço 
C 
0-30 
 
 
tpCPF 
Número no Cadastro de Pessoas 
Físicas 
C 
11 
 
 
tpDescricaoEvento 
Descrição do Evento 
C 
0-300 
 
Descrição correspondente ao código 
do evento ocorrido.

## Página 15

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 15 
 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpDiscriminacao 
Discriminação dos Serviços 
C 
1-2000 
 
Texto contínuo descritivo dos 
serviços. O conjunto de caracteres 
correspondentes ao código ASCII 13 
e ASCII 10 deverá ser substituído 
pelo caracter | (pipe ou barra vertical. 
ASCII 124). 
 
Exemplo: 
Digitado na NF “Lavagem de carro 
com lavagem de motor” 
Preenchimento do arquivo: 
“Lavagem de carro com lavagem de 
motor” 
Não devem ser colocados espaços 
neste campo para completar seu 
tamanho máximo, devendo o campo 
ser preenchido apenas com conteúdo 
a ser processado /armazenado. 
(*) Este campo é impresso num 
retângulo com 95 caracteres 
(largura) e 24 linhas (altura). É 
permitido (não recomendável), o 
uso de mais de 2000 caracteres. 
Caso seja ultrapassado o limite de 
24 linhas, o conteúdo será 
truncado durante a impressão da 
Nota. 
tpEmail 
E-mail 
C 
0-75 
 
 
tpInscricaoMunicipal 
Inscrição Municipal 
N 
8 
 
Versão 1 do XSD 
tpInscricaoMunicipal 
Inscrição Municipal 
N 
12 
 
Versão 2 do XSD 
tpLogradouro 
Endereço 
C 
0-50 
 
 
tpNumero 
Número 
N 
1-12 
 
Tipo utilizado para informar número 
de NFTS, número de Lote, número de 
página, ... 
tpNumeroEndereco 
Número do Endereço 
C 
0-10 
 
 
tpQuantidade 
Tipo padrão para quantidades 
N 
1-15 
 
 
tpRazaoSocial 
Tipo Razão Social 
C 
0-75 
 
Nome / Razão Social 
tpStatusNFTS 
Tipo referente aos possíveis 
status de NFTS. 
C 
1 
 
Status da NFTS: 
N – Normal; 
C – Cancelada; 
tpSucesso 
Tipo que indica se o pedido do 
serviço obteve sucesso. 
B 
 
 
O conteúdo deste campo indica se o 
pedido do serviço obteve sucesso ou 
não (conforme descrito no item 
(4.3.1). 
tpTempoProcessamento 
Tempo de processamento do lote 
(segundos). 
N 
1-15 
 
 
tpTipoLogradouro 
Tipo de endereço. 
C 
0-3 
 
Rua, Av, ...

## Página 16

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 16 
 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpTributacaoNFTS 
Tipo referente aos modos de 
tributação da NFTS. 
C 
1 
 
Tipos de tributação: 
a) NFS-e emitidas até 31/12/2025: 
poderá ser preenchido com:T – 
Operação normal; 
I – Imune; 
J – ISS suspenso por decisão judicial. 
 
b) NFS-e emitidas a partir de 
01/01/2026: poderá ser preenchido 
com: 
T – Tributado em SP 
F – Tributado fora de SP 
E – Tributado em SP, porém com 
indicação de isenção subjetiva 
O - Tributado Fora de SP, porém com 
indicação de isenção subjetiva 
G – Tributado em SP, porém com 
indicação de isenção subjetiva parcial 
H – Tributado Fora de SP, porém 
com indicação de isenção subjetiva 
parcial 
K – Tributado em SP, porém com 
indicação de isenção objetiva 
L – Tributado fora de SP, porém com 
indicação de isenção objetiva 
Q – Tributado em SP, porém com 
indicação de isenção objetiva parcial 
U - Tributado fora de SP, porém com 
indicação de isenção objetiva parcial 
M – Tributado em SP, porém com 
indicação de imunidade subjetiva 
N – Tributado fora de SP, porém com 
indicação de imunidade subjetiva 
R – Tributado em SP, porém com 
indicação de imunidade objetiva 
S – Tributado fora de SP, porém com 
indicação de imunidade objetiva 
X - Tributado em SP, porém com 
exigibilidade suspensa 
V - Tributado fora de SP, porém com 
exigibilidade suspensa 
W – Importação de serviço 
tpUF 
Sigla da UF do endereço. 
C 
2 
 
Sigla da UF do endereço. 
tpValor 
Valores 
N 
0-15 
2 
Tipo utilizado para valores com 15 
dígitos, sendo 13 de corpo e 2 
decimais. 
Exemplo: 
R$ 500,85 – 500.85 
R$ 826,00 – 826 
tpVersao 
Versão do Schema 
N 
1-3 
 
O conteúdo deste campo indica a 
versão do Schema XML utilizado. 
Exemplo: 
Versão 1 – 1 
Versão 10 – 10 
Versão 100 – 100

## Página 17

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 17 
 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpTipoDocumentoNFTS 
Tipo referente aos possíveis tipos 
da NFTS. 
C 
2 
 
Tipos de NFTS: 
1 – Dispensado de emissão de 
documento fiscal; 
2 – Com emissão de documento 
fiscal autorizado pelo município; 
3 – Sem emissão de documento fiscal 
embora obrigado; 
tpSerieNFTS 
Tipo série de documento NFTS. 
C  
1-5 
 
 
tpNumeroDocumento 
Número do documento da NTFS. 
N 
12 
 
 
tpNumeroNFTS 
Número da NTFS. 
N 
12 
 
 
tpCodigoSubitem 
Código do Subitem da lista de 
serviços. 
N  
3-4 
 
 
tpISSRetidoTomador 
Informe a retenção. 
B 
 
 
Informe a retenção: 
True – ISS retido pelo tomador; 
False – NFTS sem ISS retido. 
tpISSRetidoIntermediario 
Informe a retenção. 
B  
 
 
Informe a retenção: 
True – ISS retido pelo intermediário; 
False – NFTS sem ISS retido. 
tpDescumpreLeiComplementar
1572016 
Serviço objeto de concessão de 
isenção, incentivo ou benefício 
tributários ou financeiro, inclusive 
de redução de base de cálculo ou 
de 
crédito 
presumido 
ou 
outorgado, ou sob qualquer outra 
forma que resulte, direta ou 
indiretamente, em carga tributária 
menor que a decorrente da 
aplicação da alíquota mínima de 
2%. 
B 
 
 
True – descumprimento da alíquota 
mínima efetiva de 2%; 
False – não descumprimento da 
alíquota mínima efetiva de 2%. 
tpTipoNFTS 
Tipo da NFTS 
N 
1 
 
Informe o tipo da NFTS: 
1 – Nota Fiscal do Tomador; 
2 – Nota Fiscal do Intermediário. 
tpRegimeTributacao 
Tipo do regime de tributação. 
N 
1 
 
Regime de tributação: 
0 – Normal ou Simples Nacional 
(DAMSP); 
4 – Simples Nacional (DAS); 
5 – Microempreendedor Individual 
MEI; 
tpNumeroLote 
Número do lote gerado pelo 
processamento. 
Non 
Negative 
Integer 
15 
 
 
tpSituacaoCPOM 
Situação do cadastro no CPOM. 
C 
200 
 
Situação do cadastro no CPOM em 
formato texto. 
tpSituacaoEmissaoNFTS 
Situação da autorização de 
emissão da NFTS. 
C 
200 
 
Situação da autorização de emissão 
da NFTS em formato texto. 
tpSituacaoInscricaoMunicipal 
Situação da Inscrição Municipal. 
C 
200 
 
Situação da Inscrição Municipal em 
formato de texto. 
tpExigibilidadeSuspensa 
Tipo emissão com exigibilidade 
suspensa 
C 
1 
 
0 = Não 
1 = Sim 
tpPagamentoParceladoAntecip
ado 
Tipo do indicador de nota fiscal 
de pagamento parcelado 
antecipado (realizado antes do 
fornecimento) 
C 
1 
 
0 = Não 
1 = Sim

## Página 18

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 18 
 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpCodigoNCM 
Código da lista de Nomenclatura 
Comum do Mercosul (NCM) 
C 
8 
 
Exemplo: 
3404.90.29 - 34049029  
tpCodigoPaisISO 
Tipo Código do País segundo 
tabela ISO 
C 
2 
 
Exemplo: 
CA – Canadá 
tpCodigoNBS 
Código da lista de Nomenclatura 
Brasileira de Serviços (NBS) 
C 
9 
 
Exemplo: 
1.1805.40.00 – 118054000 
tpReferencia 
Tipo de referência da Nota 
C 
1 
 
0 - Nota fiscal referenciada para 
emissão de nota de multa e juros 
1 - Nota fiscal de pagamento 
parcelado antecipado 
tpTipoNotaReferenciada 
Tipo de nota fiscal referenciada. 
C 
1 
 
0 – NFS-e 
1 – NFTS 
 
tpCClassTribIBSCBS 
Código de classificação Tributária 
do IBS e da CBS principal 
N 
6 
 
Exemplo: 
550016 
tpCClassTribReg 
Código de classificação Tributária 
do IBS e da CBS secundário, que 
informa a tributação original ser 
utilizada caso os requisitos da 
suspensão não sejam cumpridos 
N 
6 
 
Exemplo: 
200045 
tpEnteGov 
Tipo do ente da compra 
governamental 
C 
1 
 
1 – União 
2 – Estados 
3 - Distrito Federal 
4 – Municípios 
tpEstadoProvinciaRegiao 
Estado, província ou região 
C 
60 
 
Estado, província ou região 
tpNaoNIF 
Tipo do motivo para não 
informação do NIF. 
C 
1 
 
0 - Não informado na nota de origem 
1 - Dispensado do NIF 
2 - Não exigência do NIF 
tpNIF 
Tipo NIF (Número de 
Identificação Fiscal) - fornecido 
por um órgão de administração 
tributária no exterior. 
C 
40 
 
 
tpCCIB 
Cadastro de imóveis.  
C 
8 
 
 
tpNomeCidade 
Nome da Cidade 
C 
60 
 
 
tpChaveNotaNacional 
Tipo da chave da Nota Nacional. 
C 
50 
 
Chave da nota nacional 
tpFinalidadeEmissao 
Indicador da finalidade de 
emissão da Nota 
N 
1 
 
0 - NFS-e regular 
tpIndicadorOperacaoUso 
Indica operação de uso ou 
consumo pessoal.  
N 
1 
 
0 - Não  
1 – Sim 
tpCodigoOperacaoEnte 
Tipo de Operação com Entes 
Governamentais ou outros 
serviços sobre bens imóveis. 
N 
1 
 
1 – Fornecimento com pagamento 
posterior;  
2 - Recebimento do pagamento com 
fornecimento já realizado;  
3 – Fornecimento com pagamento já 
realizado;  
4 – Recebimento do pagamento com 
fornecimento posterior;  
5 – Fornecimento e recebimento do 
pagamento concomitantes. 
tpIdObraCadNacionalCEI 
Identificação da obra, do 
Cadastro Nacional de Obras, ou 
do Cadastro Específico do INSS 
C 
30

## Página 19

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 19 
 
 
NOME DO TIPO 
DESCRIÇÃO  
(tipo utilizado para informar...) 
TIPO 
BASE 
TAMANHO 
DEC 
OBSERVAÇÃO 
tpInscImobFiscImovelObra 
Inscrição Imobiliária fiscal (código 
fornecido pela prefeitura para 
identificação da obra ou para fins 
de recolhimento do IPTU). 
Exemplos: SQL ou INCRA. 
C 
30 
 
 
tpTipoChaveDFE 
Documento fiscal a que se refere 
a chaveDfe que seja um dos 
documentos do Repositório 
Nacional 
N 
1 
 
1 - NFS-e 
2 - NF-e 
3 - CT–e 
9 - Outro 
tpDescricaoChaveDFE 
Descrição da DF -e a que se 
refere a chaveDfe que seja um 
dos documentos do Repositório 
Nacional. Deve ser preenchido 
apenas quando tipoChaveDFe = 
9 (Outro). 
C 
255 
 
 
tpChaveDFE 
Chave do Documento Fiscal 
eletrônico do repositório nacional 
referenciado para os casos de 
operações já tributadas. 
C 
50 
 
 
tpNumeroDocumentoFiscal 
Número do documento fiscal que 
não se encontra no repositório 
nacional. 
C 
255 
 
 
tpDescricaoDocumentoFiscal 
Descrição do documento fiscal. 
C 
255 
 
 
tpNumeroDocumentoNaoFiscal 
Número do documento não fiscal 
C 
255 
 
 
tpDescricaoDocumentoNaoFisc
al 
Descrição do documento não 
fiscal 
C 
255 
 
 
tpNomeEvento 
Tipo Nome do evento cultural, 
artístico, esportivo 
C 
255 
 
 
tpIdAtividadeEvento 
Identificação da Atividade de 
Evento (código identificador de 
evento determinado pela 
Administração Tributária 
Municipal) 
C 
30 
 
 
4.2.2. Tipos Complexos 
Layout da tabela utilizada para representar a estrutura XML dos Tipos Complexos: 
 
 
* Ocorrência: x - y, onde x indica a ocorrência mínima e y a ocorrência máxima. 
 
 
4.2.2.1. TiposNFTS_v01.xsd (versão 1) 
 
tpEvento 
Tipo que representa a ocorrência de eventos de erro/alerta durante o processamento da mensagem XML. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição

## Página 20

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 20 
 
 
Codigo 
tpCodigoEvento 
1-1 
Código do evento ocorrido. 
Descricao 
tpDescricaoEvento 
0-1 
Descrição do evento. 
IdentificacaoDocumento 
tpIdentificacaoDocumento 
0-1 
Informações que irão identificar o documento no 
qual ocorreu o problema. 
IdentificacaoNFTS 
tpIdentificacaoNFTS 
0-1 
Informações que irão identificar a NFTS na qual 
ocorreu o problema. 
 
tpInformacoesLoteNFTS 
Tipo que representa as informações do lote processado. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
NumeroLote 
tpNumeroLote 
1-1 
Número do lote gerado pelo processamento. 
Remetente 
tpRemetente 
1-1 
Dados do remetente do lote da mensagem XML 
transmitida. 
dtEnvioLote 
dateTime 
1-1 
Retorna a data de envio do lote 
(AAAA-MM-DDTHH:mm:ss); 
QtdeNFTSProcessadas 
tpQuantidade 
1-1 
Retorna a quantidade de NFTS processadas. 
TempoProcessamento 
tpTempoProcessamento 
1-1 
Retorna o tempo de processamento do lote. 
ValorTotalServicos 
tpValor 
1-1 
Retorna o valor total dos serviços das NFTS 
contidos na mensagem XML. 
 
tpCabecalho 
Tipo que representa as informações do cabeçalho do retorno. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Sucesso 
tpSucesso 
1-1 
Campo indicativo do sucesso do pedido do 
serviço. 
InformacoesLoteNFTS 
tpInformacoesLoteNFTS 
0-1 
Informações sobre o lote processado. 
Versao 
tpVersao 
1-1 
Informações sobre a versão do Schema XML 
utilizado. 
tpCabecalhoRetorno 
Tipo que representa as informações do cabeçalho do retorno para consultas. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Sucesso 
tpSucesso 
1-1 
Campo indicativo do sucesso do pedido do 
serviço. 
Versao 
tpVersao 
1-1 
Informações sobre a versão do Schema XML 
utilizado. 
 
tpListaRetornoLote 
Tipo que representa a lista de mensagens de retorno do lote. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Alerta 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de alerta durante o processamento da 
mensagem XML. 
Erro 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de erro durante o processamento da 
mensagem XML. 
 
tpListaRetornoNFTS

## Página 21

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 21 
 
 
Tipo que representa a lista de mensagens de retorno da NFTS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Alerta 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de alerta durante o processamento da 
mensagem XML. 
Erro 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de erro durante o processamento da 
mensagem XML. 
 
tpListaRetornoConsultaNFTS 
Tipo que representa a lista de mensagens de retorno do lote. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
ListaRetornoLote 
tpListaRetornoLote 
0-n 
Elemento que representa a ocorrência de 
eventos de erro/alerta durante o 
processamento da mensagem XML. 
NFTS 
tpNFTSRetorno 
0-50 
Elemento que representa a lista de NFTS. 
 
tpIdentificacaoDocumento 
Tipo que identifica a NFTS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Posicao 
int 
1-1 
Indica a posição da NFTS no arquivo XML. 
ChaveDocumento 
tpChaveDocumento 
1-1 
Informa a chave do documento Inscrição 
Municipal/Sério/Número documento da NFTS. 
 
tpIdentificacaoNFTS 
Tipo que identifica a NFTS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Posicao 
Int 
1-1 
Indica a posição da NFTS no arquivo XML. 
ChaveNFTS 
tpChaveNFTS 
1-1 
Informa a chave do documento Inscrição 
Municipal/Número NFTS/Código de Verificação 
da NFTS. 
 
tpCPFCNPJ 
Tipo que representa um CPF/CNPJ. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPF 
tpCPF 
0-1 
Número no Cadastro de Pessoas Físicas 
CNPJ 
tpCNPJ 
0-1 
Número no Cadastro Nacional da Pessoa 
Jurídica 
 
tpRemetente 
Tipo que representa os dados do remetente (CPF/CNPJ) . 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJ 
tpCPFCNPJ 
1-1 
Informa o CPF/CNPJ do remetente autorizado 
a transmitir a mensagem XML.

## Página 22

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 22 
 
 
tpRemetente_ComCCM 
Tipo que representa os dados do remetente (CPF/CNPJ) e Inscricao Municipal . 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJ 
tpCPFCNPJ 
1-1 
Informa o CPF/CNPJ do remetente autorizado 
a transmitir a mensagem XML de 
cancelamento de NFTS. 
InscricaoMunicipal 
tpInscricaoMunicipal 
0-1 
Informa a Inscrição Municipal do Remetente 
autorizado a transmitir a mensagem XML de 
cancelamento de NFTS. 
 
tpChaveDocumento 
Tipo que representa a chave identificadora da NFTS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
InscricaoMunicipal 
tpInscricaoMunicipal 
1-1 
Informa a Inscrição Municipal da NFTS. 
SerieNFTS 
tpSerieNFTS 
0-1 
Informa a série da NFTS. 
NumeroDocumento 
tpNumeroDocumento 
0-1 
Informa o número do documento. 
 
tpChaveNFTS 
Tipo que define a chave de uma NFTS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
InscricaoMunicipal 
tpInscricaoMunicipal 
1-1 
Informa a Inscrição Municipal da NFTS. 
NumeroNFTS 
tpNumeroNFTS 
1-1 
Número da NFTS. 
CodigoVerificacao 
tpCodigoVerificacao 
0-1 
Código de verificação da NFTS. 
 
tpChaveNFTS (complemento para a versão 2.0) 
Acréscimo da ChaveNotaNacional para Reforma tributária 2026. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
ChaveNotaNacional 
tpChaveNotaNacional 
0-1 
Identificador da nota no ambiente nacional.  
 
 
 
 
tpEndereco 
Tipo que representa um endereço. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
TipoLogradouro 
tpTipoLogradouro 
0-1 
Tipo do endereço. 
Logradouro 
tpLogradouro 
0-1 
Endereço. 
NumeroEndereco 
tpNumeroEndereco 
0-1 
Número do endereço. 
ComplementoEndereco 
tpComplementoEndereco 
0-1 
Complemento do endereço. 
Bairro 
tpBairro 
0-1 
Bairro do endereço. 
Cidade 
tpCidadeTexto 
0-1 
Cidade do endereço. 
UF 
tpUF 
0-1 
Sigla da UF do endereço. 
CEP 
tpCEP 
0-1 
CEP do endereço.

## Página 23

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 23 
 
 
 
tpEndereco (complemento para a versão 2.0) 
Acréscimo no tpEndereco para Reforma tributária 2026. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
EnderecoExterior 
tpEnderecoExterior 
0-1 
Tipo endereço no exterior. 
 
tpPrestador 
Tipo que representa os dados do prestador de serviço . 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJ 
tpCPFCNPJ 
0-1 
Informa o CPF/CNPJ do prestador do serviço. 
Para prestador de serviço estrangeiro, não 
enviará esta TAG. 
Caso o campo ISS Retido esteja preenchido 
com 3, o preenchimento deste campo é com 
zeros. 
InscricaoMunicipal 
tpInscricaoMunicipal 
0-1 
Informa a Inscrição Municipal do Prestador. 
ATENÇÃO: Este campo só deverá ser 
preenchido para prestadores estabelecidos no 
município de São Paulo (CCM). 
Quando este campo for preenchido, seu 
conteúdo será considerado como prioritário 
com relação ao campo de CPF/CNPJ do 
Prestador, sendo utilizado para identificar o 
Prestador e recuperar seus dados da base de 
dados da Prefeitura. 
RazaoSocialPrestador 
tpRazaoSocial 
0-1 
Informe o Nome/Razão Social do Prestador. 
Este campo será ignorado caso seja fornecido 
um CPF/CNPJ ou a Inscrição Municipal do 
prestador pertença a São Paulo. 
Endereco 
tpEndereco 
0-1 
Informe o endereço do prestador. 
O conteúdo destes campos será ignorado caso 
seja fornecido um CNPJ/CPF ou a Inscrição 
Municipal do prestador pertença ao município 
de São Paulo. 
Se estes campos estiverem informados, serão 
considerados no caso de prestador sem 
Inscrição Municipal. Nesta situação os dados 
da Receita Federal não serão considerados. 
Os dados da Receita Federal serão utilizados 
apenas se estes dados não estiverem 
informados. 
Email 
tpEmail 
0-1 
Informe o e-mail do prestador. 
 
tpTomador 
Tipo que representa os dados do tomador de serviço . 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJ 
tpCPFCNPJ 
1-1 
Informa o CPF/CNPJ do tomador do serviço. 
Para os casos em que a NFTS se tratar de 
nota fiscal do intermediário, obrigatório informar

## Página 24

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 24 
 
 
o CPF/CNPJ do tomador. 
RazaoSocial 
tpRazaoSocial 
0-1 
Informe o Nome/Razão Social do Tomador. 
Para os casos em que a NFTS se tratar de 
nota fiscal do intermediário, obrigatório informar 
a Razão Social do tomador. 
 
tpNFTS 
Tipo que representa uma NFTS . 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
TipoDocumento 
tpTipoDocumentoNFTS 
1-1 
Informe o tipo do documento 
NFTS. 
01 - Dispensado de emissão de 
documento fiscal. 
02 - Com emissão de 
documento fiscal autorizado 
pelo município. 
03 - Sem emissão de 
documento fiscal embora 
obrigado. 
ChaveDocumento 
tpChaveDocumento 
1-1 
Informe a série da NFTS. 
DataPrestacao 
dateTime 
1-1 
Informe a data da prestação de 
serviços (Formato: 
AAAAMMDD). 
StatusNFTS 
tpStatusNFTS 
1-1 
Informe o Status da NFTS. 
TributacaoNFTS 
tpTributacaoNFTS 
1-1 
Informe o tipo de tributação da 
NFTS. 
ValorServicos 
tpValor 
1-1 
Informe o valor dos serviços. 
ValorDeducoes 
tpValor 
1-1 
Informe o valor das deduções. 
CodigoServico 
tpCodigoServico 
1-1 
Informe o código do serviço da 
NFTS. Este código deve 
pertencer à lista de serviços. 
CodigoSubItem 
tpCodigoSubitem 
0-1 
Informe o código do Subitem da 
lista de serviços. 
AliquotaServicos 
tpAliquota 
1-1 
Informe o valor da alíquota. 
ISSRetidoTomador 
tpISSRetidoTomador 
1-1 
Informe true para retenção do 
tomador ou false para sem 
retenção. 
ISSRetidoIntermediario 
tpISSRetidoIntermediario 
0-1 
Informe true para retenção de 
intermediário ou false para sem 
retenção. 
DescumpreLeiComplementar1572016 
tpDescumpreLeiComplementar1572016 
0-1 
Informe true para 
descumprimento ou false para 
não descumprimento. 
Prestador 
tpPrestador 
1-1 
Informe o e-mail do prestador. 
RegimeTributacao 
tpRegimeTributacao 
1-1 
Informe o Regime de

## Página 25

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 25 
 
 
Tributação. 
DataPagamento 
dateTime 
0-1 
Informe a data em que o 
serviço foi pago ao prestador. 
Esta informação somente será 
considerada para tomadores de 
serviço de Orgãos Públicos. 
Discriminacao 
tpDiscriminacao 
0-1 
Informe a discriminação dos 
serviços. 
TipoNFTS 
tpTipoNFTS 
1-1 
Define se a NFTS é do tomador 
ou intermediário. 
Tomador 
tpTomador 
0-1 
Dados do tomador de serviço. 
Assinatura 
tpAssinatura 
1-1 
Assinatura digital da NFTS. 
CodigoCEI 
tpNumero 
0-1 
Número CEI. 
MatriculaObra 
tpNumero 
0-1 
Número da matrícula de obra. 
clocalPrestServ 
tpCidade 
0-1 
Código da cidade do município 
da prestação do serviço. 
cPaisPrestServ 
tpCodigoPaisISO 
0-1 
Código do país (Tabela de 
Países ISO) 
ValorPIS 
tpValor 
0-1 
Valor da retenção do PIS. 
ValorCOFINS 
tpValor 
0-1 
Valor da retenção do COFINS. 
ValorINSS 
tpValor 
0-1 
Valor da retenção do INSS. 
ValorIR 
tpValor 
0-1 
Valor da retenção do IR. 
ValorCSLL 
tpValor 
0-1 
Valor da retenção do CSLL. 
ValorIPI 
tpValor 
0-1 
Valor de IPI. 
 
tpNFTSRetorno 
Tipo que representa uma NFTS  de retorno. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
TipoDocumento 
tpTipoDocumentoNFTS 
1-1 
Informe o tipo do documento NFTS. 
01 - Dispensado de emissão de documento 
fiscal. 
02 - Com emissão de documento fiscal 
autorizado pelo município. 
ChaveDocumento 
tpChaveDocumento  
1-1 
Dados do documento. Inscrição 
Municipal/Série/NumroDocumento. 
CodigoVerificacao 
tpCodigoVerificacao 
1-1 
Código de verificação da NFTS. 
DataPrestacao 
dateTime 
1-1 
Informe a data da prestação de serviços 
(Formato: AAAAMMDD). 
StatusNFTS 
tpStatusNFTS 
1-1 
Informe o Status da NFTS. 
TributacaoNFTS 
tpTributacaoNFTS 
1-1 
Informe o tipo de tributação da NFTS.

## Página 26

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 26 
 
 
ValorServicos 
tpValor 
1-1 
Informe o valor dos serviços. 
ValorDeducoes 
tpValor 
1-1 
Informe o valor das deduções. 
CodigoServico 
tpCodigoServico 
1-1 
Informe o código do serviço da NFTS.  
Este código deve pertencer à lista de serviços. 
CodigoSubItem 
tpCodigoSubitem 
0-1 
Informe o código do Subitem da lista de 
serviços. 
AliquotaServicos 
tpAliquota 
1-1 
Informe o valor da alíquota. 
ISSRetidoTomador 
tpISSRetidoTomador 
1-1 
Informe true para retenção do tomador ou false 
para sem retenção. 
ISSRetidoIntermediario 
tpISSRetidoIntermediario 
0-1 
Informe true para retenção de intermediário ou 
false para sem retenção. 
Prestador 
tpPrestador 
1-1 
Informe o e-mail do prestador. 
RegimeTributacao 
tpRegimeTributacao 
1-1 
Informe o Regime de Tributação. 
DataPagamento 
dateTime 
0-1 
Informe a data em que o serviço foi pago ao 
prestador. 
Esta informação somente será considerada 
para tomadores de serviço de Orgãos Públicos. 
Discriminacao 
tpDiscriminacao 
0-1 
Informe a discriminação dos serviços. 
Tomador 
tpTomador 
0-1 
Dados do tomador de serviço. 
clocalPrestServ 
tpCidade 
0-1 
Código da cidade do município da prestação 
do serviço. 
cPaisPrestServ 
tpCodigoPaisISO 
0-1 
Código do país (Tabela de Países ISO) 
ValorPIS 
tpValor 
0-1 
Valor da retenção do PIS. 
ValorCOFINS 
tpValor 
0-1 
Valor da retenção do COFINS. 
ValorINSS 
tpValor 
0-1 
Valor da retenção do INSS. 
ValorIR 
tpValor 
0-1 
Valor da retenção do IR. 
ValorCSLL 
tpValor 
0-1 
Valor da retenção do CSLL. 
ValorIPI 
tpValor 
0-1 
Valor de IPI. 
 
tpNFTS (complemento para a versão 2.0) 
Atenção: utilizar como complemento da versão 1.0 do tpNFTS, são os campos adicionados que correspondem à 
versão 2.0 para atendimento da Reforma Tributária 2026. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
ValorInicialCobrado 
tpValor 
0-1 
Valor Inicial. 
ValorFinalCobrado 
tpValor 
1-1 
Valor total cobrado pela prestação do 
serviço. 
ValorMulta 
tpValor 
0-1 
Valor da multa. 
ValorJuros 
tpValor 
0-1 
Valor dos juros. 
ValorIPI 
tpValor 
1-1 
Valor IPI 
ExigibilidadeSuspensa 
tpExigibilidadeSuspensa 
1-1 
Informe se é uma emissão com 
exigibilidade suspensa. 
0 – Não 
1 – Sim 
PagamentoParceladoAntecipado  tpPagamentoParceladoAntecipado 
1-1 
Informe se a nota teve pagamento 
parcelado antecipado. 
NCM 
tpCodigoNCM 
0-1 
Informe o número NCM (Nomenclatura

## Página 27

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 27 
 
 
tpNFTS (complemento para a versão 2.0) 
Atenção: utilizar como complemento da versão 1.0 do tpNFTS, são os campos adicionados que correspondem à 
versão 2.0 para atendimento da Reforma Tributária 2026. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Comum do Mercosul). 
NBS 
tpCodigoNBS 
1-1 
Informe o número NBS (Nomenclatura 
Brasileira de Serviços). 
IBSCBS 
tpIBSCBS 
0-1 
Informações declaradas pelo emitente 
referentes ao IBS e à CBS. 
RetornoComplementarIBSCBS 
tpRetornoComplementarIBSCBS 
0-1 
Informações 
de 
valores 
complementares do IBS e CBS 
 
tpRetornoComplementarIBSCBS (complemento para a versão 2.0) 
ValorBCIBSCBS 
tpValor 
0-1 
Valor Base de Cálculo para o IBS e 
CBS 
ValorAliqEstadualIBS 
tpValor 
0-1 
Valor da alíquota estadual IBS 
ValorPercRedEstadualIBS 
tpValor 
0-1 
Valor do percentual redutor estadual 
IBS 
ValorAliqEfetivaEstadualIBS 
tpValor 
0-1 
Valor da alíquota efetiva estadual 
IBS 
ValorEstadualBS 
tpValor 
0-1 
Valor do IBS estadual 
ValorAliqMunicipalIBS 
tpValor 
0-1 
Valor da alíquota municipal IBS 
ValorPercRedMunicipalIBS 
tpValor 
0-1 
Valor do percentual redutor IBS 
ValorAliqEfetivaMunicipalIBS 
tpValor 
0-1 
Valor da alíquota efetiva municipal 
IBS 
ValorMunicipalIBS 
tpValor 
0-1 
Valor municipal do IBS 
ValorIBS 
tpValor 
0-1 
Valor do IBS 
ValorAliqCBS 
tpValor 
0-1 
Valor da alíquota do CBS 
ValorPercRedCBS 
tpValor 
0-1 
Valor do percentual redutor CBS 
ValorAliqEfetivaCBS 
 
tpValor 
0-1 
Valor da alíquota efetiva CBS 
ValorCBS 
tpValor 
0-1 
Valor CBS 
ValorTotalReeRepRes 
tpValor 
0-1 
Valor total dos valores não inclusos 
na base de cálculo, somatória dos 
valores informados pelo contribuinte 
no campo ValorReeRepRes 
ValorAliqEstadualIBSCompraGov 
tpValor 
0-1 
Valor da alíquota estadual para o 
IBS, 
referente 
a 
compra 
governamental. 
ValorEstadualBSCompraGov 
tpValor 
0-1 
Valor do IBS estadual referente a 
compra governamental 
ValorAliqMunicipalIBSCompraGov 
tpValor 
0-1 
Valor da alíquota municipal para o 
IBS, 
referente 
a 
compra 
governamental. 
ValorMunicipalIBSCompraGov 
tpValor 
0-1 
Valor do IBS municipal referente a 
compra governamental 
ValorAliqCBSCompraGov 
tpValor 
0-1 
Valor da alíquota da CBS, referente 
a compra governamental. 
ValorCBSCompraGov 
tpValor 
0-1 
Valor da CBS referente a compra 
governamental 
 
 
 
tpRetornoCPOM 
Tipo que representa a lista de mensagens de retorno. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Alerta 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de alerta durante o processamento da

## Página 28

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 28 
 
 
mensagem XML. 
Erro 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de erro durante o processamento da 
mensagem XML. 
DetalheCPOM 
tpDetalheCPOMRetorno 
0-1 
Elemento que representa os detalhes de 
retorno da consulta ao CPOM no 
processamento da mensagem XML. 
 
tpDetalheCPOMRetorno 
Tipo que representa os detalhes de retorno da consulta ao CPOM. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJPrestador 
tpCPFCNPJ 
1-1 
Informa o CPF/CNPJ do remetente autorizado 
a transmitir a mensagem XML de 
cancelamento de NFTS. 
SituacaoCPOM 
tpSituacaoCPOM 
1-1 
Situação do cadastro no CPOM em formato 
texto. 
Servicos 
tpServicos 
1-n 
Tipo que representa o código e descrição da 
atividade. 
 
tpServicos 
Tipo que representa o código e descrição da atividade. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CodigoServico 
tpCodigoServico 
1-1 
O código informado deverá pertencer à Tabela 
de Serviços disponibilizada pela Prefeitura de 
São Paulo. 
DescricaoServico 
tpDescricaoServico 
1-1 
Descrição do serviço. 
 
tpDetalheNFTSRetorno 
Tipo que representa os detalhes de retorno. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
CPFCNPJPrestador 
tpCPFCNPJ 
1-1 
Informa o CPF/CNPJ do remetente autorizado a 
transmitir a mensagem XML de cancelamento de 
NFTS. 
ListaInscricaoMunicipal 
tpListaInscricaoMunicipal 
1-n 
Tipo que representa a lista de inscrições 
municipais. 
 
tpListaInscricaoMunicipal 
Tipo que representa a lista de inscrições municipais. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
InscricaoMunicipal 
tpInscricaoMunicipal 
1-1 
Inscrição Municipal 
SituacaoInscricaoMunicipal 
tpSituacaoInscricaoMunicipal 
1-1 
Situação da Inscrição Municipal em formato de 
texto. 
SituacaoEmissaoNFTS 
tpSituacaoEmissaoNFTS 
1-1 
Situação da autorização de emissão da NFTS 
em formato texto. 
 
tpRetornoEmissaoNFTS

## Página 29

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 29 
 
 
Tipo que representa a lista de mensagens de retorno. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Alerta 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de alerta durante o processamento da 
mensagem XML. 
Erro 
tpEvento 
0-n 
Elemento que representa a ocorrência de 
eventos de erro durante o processamento da 
mensagem XML. 
DetalheEmissaoNFTS 
tpDetalheNFTSRetorno 
0-1 
Elemento que representa os detalhes de retorno 
da consulta ao CPOM no processamento da 
mensagem XML. 
 
tpCPFCNPJNIF (complemento para a versão 2.0) 
Tipo que representa um CPF/CNPJ/NIF 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
(Choice) 
CPF 
tpCPF 
1-1 
Número no Cadastro de Pessoas Físicas. 
 
CNPJ 
tpCNPJ 
1-1 
Número no Cadastro de Pessoa Jurídica 
NIF 
tpNIF 
1-1 
Tipo NIF (Número de Identificação Fiscal) - 
fornecido por um órgão de administração 
tributária no exterior. 
NaoNIF 
tpNaoNIF 
1-1 
Tipo do motivo para não informação do NIF. 
0 - Não informado na nota de origem 
1 - Dispensado do NIF 
2 - Não exigência do NIF 
 
tpEnderecoExterior (complemento para a versão 2.0) 
Tipo endereço no exterior 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
cPais 
tpCodigoPaisISO 
1-1 
Código do país (Tabela de Países ISO) 
cEndPost 
tpCodigoEndPostal 
1-1 
Código alfanumérico do Endereçamento Postal 
no exterior do prestador do serviço. 
xCidade 
tpNomeCidade 
1-1 
Nome da cidade no exterior do prestador do 
serviço. 
xEstProvReg 
tpEstadoProvinciaRegiao 
1-1 
Estado, província ou região da cidade no 
exterior do prestador do serviço. 
 
tpInformacoesPessoa (complemento para a versão 2.0) 
Tipo de informações de pessoa 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
(Choice) 
CPF 
tpCPF 
1-1 
Número no Cadastro de Pessoas Físicas. 
 
CNPJ 
tpCNPJ 
1-1 
Número no Cadastro de Pessoa Jurídica 
NIF 
tpNIF 
1-1 
Tipo NIF (Número de Identificação Fiscal) - 
fornecido por um órgão de administração 
tributária no exterior. 
NaoNIF 
tpNaoNIF 
1-1 
Tipo do motivo para não informação do NIF. 
0 - Não informado na nota de origem 
1 - Dispensado do NIF 
2 - Não exigência do NIF 
xNome 
tpRazaoSocial 
1-1 
Razão Social 
end 
tpEndereco 
0-1 
Endereço 
email 
tpEmail 
0-1 
Endereço eletrônico 
 
tpServico (complemento para a versão 2.0) 
Tipo com as informações do serviço 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
(Choice) 
clocalPrestServ 
tpCidade 
1-1 
Código da cidade do município da 
prestação do serviço. 
cPaisPrestServ 
tpCodigoPaisISO 
1-1 
Informar quando o serviço é prestado 
fora do país. 
tpEnteGov 
tpEnteGov 
0-1 
Tipo 
do 
ente 
da 
compra 
governamental. 
finalidadeEmissao 
tpFinalidadeEmissao 
1-1 
Indicador de finalidade de emissão da

## Página 30

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 30 
 
 
tpServico (complemento para a versão 2.0) 
Tipo com as informações do serviço 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
NFS-e 
indicadorOperacaoUso 
tpIndicadorOperacaoUso 
1-1 
Indica operação de uso ou consumo 
pessoal. 
codigoOperacaoFornecimento 
tpCodigoOperacaoFornecimento 
1-1 
Código indicador da operação de 
fornecimento 
codigoOperacaoEnte 
tpCodigoOperacaoEnte 
1-1 
Tipo 
de 
Operação 
com 
Entes 
Governamentais ou outros serviços 
sobre bens imóveis 
referenciaNFSe 
tpChaveNotaNacional 
0-100 
Grupo de notas referenciadas 
 
tpGIBSCBS (complemento para a versão 2.0) 
Informações relacionadas ao IBS e à CBS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
cClassTribIBSCBS 
tpCClassTribIBSCBS 
1-1 
Informações relacionadas aos tributos IBS 
e à CBS. 
CClassTribReg 
tpCClassTribReg 
0-1 
Código de classificação Tributária do IBS 
e da CBS regular, que informa a 
tributação original ser utilizada caso os 
requisitos da suspensão não sejam 
cumpridos. 
 
tpTrib (complemento para a versão 2.0) 
Informações relacionadas aos valores do serviço prestado para IBS e à CBS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
gIBSCBS 
tpGIBSCBS 
1-1 
Informações relacionadas aos tributos IBS 
e à CBS. 
 
tpValores (complemento para a versão 2.0) 
Informações relacionadas aos valores do serviço prestado para IBS e à CBS. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
trib 
tpTrib 
1-1 
Informações relacionadas aos valores do 
serviço prestado para IBS e à CBS. 
 
tpIBSCBS (complemento para a versão 2.0) 
Tipo das informações do IBS/CBS 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
dest 
tpInformacoesPessoa 
0-1 
Informações do destinatário 
adq 
tpInformacoesPessoa 
0-1 
Informações do adquirente 
tmdr 
tpInformacoesPessoa 
0-1 
Informações do tomador 
serv 
tpServico 
1-1 
Informações relativas ao serviço prestado 
para IBS/CBS. 
obra 
tpObra 
0-1 
Informações para o tipo de obra 
documento 
tpdocumento 
0-1 
Informações relativas a valores incluídos 
neste documento e recebidos por motivo 
de estarem relacionadas a operações de 
terceiros, objeto de reembolso, repasse 
ou ressarcimento pelo recebedor, já 
tributados e aqui referenciados 
evento 
tpEventoIBSCBS 
0-1 
Informações dos tipos de evento 
valores 
tpValores 
1-1 
Informações relacionadas aos valores do 
serviço prestado para IBS e à CBS. 
 
 
tpObra (complemento para a versão 2.0) 
Informações relacionadas a bens imóveis ou obras 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
(Choice) 
cCIB 
tpCIB 
1-1 
Código do Cadastro Imobiliário Brasileiro. 
IdObraCadNacionalCEI 
tpIdObraCadNacionalCEI 
1-1 
Número de identificação da obra. 
 Cadastro Nacional de Obras (CNO) ou 
Cadastro Específico do INSS (CEI). 
InscImobFiscImovelObra 
tpInscImobFiscImovelObra 
0-1 
Inscrição 
Imobiliária 
fiscal 
(código 
fornecido pela prefeitura para identificação 
da obra ou para fins de recolhimento do 
IPTU). Provavelmente será tratará do SQL

## Página 31

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 31 
 
 
tpObra (complemento para a versão 2.0) 
Informações relacionadas a bens imóveis ou obras 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
ou INCRA. 
EnderecoObra 
tpEndereco 
1-1 
Endereço da obra 
 
 
tpEventoIBSCBS (complemento para a versão 2.0) 
Informações relativas às atividades de eventos 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
NomeEvento 
tpNomeEvento 
1-1 
Nome 
do 
evento 
cultural, 
artístico, 
esportivo 
DataInicioEvento 
Date 
1-1 
Data de início da atividade de evento.Ano, 
Mês e Dia (AAAA-MM-DD). 
DataFimEvento 
Date 
1-1 
Data de fim da atividade de evento. Ano, 
Mês e Dia (AAAA-MM-DD). 
IdAtividadeEvento 
tpIdAtividadeEvento 
1-1 
Identificação da Atividade de Evento 
(código 
identificador 
de 
evento 
determinado 
pela 
Administração 
Tributária Municipal) 
EnderecoEvento 
tpEndereco 
1-1 
Endereço do evento 
 
 
tpdocumento (complemento para a versão 2.0) 
Informações do documento  
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
(Choice) 
RepositorioNacional 
tpRepositorioNacional 
1-1 
Tipo 
de 
documento 
do 
repositório 
nacional. 
SemRepositorioNacional 
tpSemRepositorioNacional 
1-1 
informações 
de 
documento 
fiscais, 
eletrônicos ou não, que não se encontram 
no repositório nacional. 
DocumentoNaoFiscal 
tpDocumentoNaoFiscal 
1-1 
Informações de documento não fiscal. 
DocumentoFornecedor 
tpDocumentoFornecedor 
0-1 
informações do fornecedor do documento 
referenciado. 
 
tpRepositorioNacional (complemento para a versão 2.0) 
Informações de documentos fiscais eletrônicos que se encontram no repositório nacional. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
TipoChaveDFE 
tpTipoChaveDFE 
1-1 
Documento fiscal a que se refere a 
chaveDfe que seja um dos documentos do 
Repositório Nacional 
DescricaoChaveDFE 
tpDescricaoChaveDFE 
1-1 
Descrição da DF -e a que se refere a 
chaveDfe que seja um dos documentos do 
Repositório Nacional. Deve ser preenchido 
apenas quando tipoChaveDFe = 9 (Outro). 
ChaveDFE 
tpChaveDFE 
1-1 
Chave do Documento Fiscal eletrônico do 
repositório nacional referenciado para os 
casos de operações já tributadas. 
 
tpSemRepositorioNacional (complemento para a versão 2.0) 
Informações de documento fiscais, eletrônicos ou não, que não se encontram no repositório nacional.  
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
Cidade 
tpCidade 
1-1 
Código do município emissor do 
documento fiscal que não se encontra no 
repositório nacional. 
NumeroDocumentoFiscal 
tpNumeroDocumentoFiscal 
1-1 
Número do documento fiscal que não se 
encontra no repositório nacional. 
DescricaoDocumentoFiscal 
tpDescricaoDocumentoFiscal 
1-1 
Descrição do documento fiscal. 
 
tpDocumentoNaoFiscal (complemento para a versão 2.0) 
Informações de documento não fiscal 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
NumeroDocumentoNaoFiscal 
tpNumeroDocumentoNaoFiscal 
1-1 
Número do documento não fiscal 
DescricaoDocumentoNaoFiscal 
tpDescricaoDocumentoNaoFiscal 
1-1 
Descrição do documento não fiscal

## Página 32

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 32 
 
 
tpDocumentoFornecedor (complemento para a versão 2.0) 
Informações do fornecedor do documento referenciado. 
Nome do Elemento 
Tipo do Elemento 
Ocorrência 
Descrição 
FornecedorDocumento 
tpInformacoesPessoa 
1-1 
Informações do fornecedor 
DataEmissaoDocumentoDedutivel 
date 
1-1 
Data da emissão do 
documento dedutível. Ano, 
mês e dia (AAAA -MM -DD). 
DataCompetenciaDocumentoDedutivel 
date 
1-1 
Data da competência do 
documento dedutível. Ano, 
mês e dia (AAAA -MM -DD). 
TipoReeRepRes 
tpTipoReeRepRes 
1-1 
Tipo de valor incluído neste 
documento, recebido por 
motivo de estarem 
relacionadas a operações de 
terceiros, objeto de 
reembolso, repasse ou 
ressarcimento pelo 
recebedor, já tributados e 
aqui referenciados 
01 = Repasse de 
remuneração por 
intermediação de imóveis a 
demais corretores envolvidos 
na operação  
02 = Repasse de valores a 
fornecedor relativo a 
fornecimento intermediado 
por agência de turismo  
03 = Reembolso ou 
ressarcimento recebido por 
agência de propaganda e 
publicidade por valores 
pagos relativos a serviços de 
produção externa por conta e 
ordem de terceiro  
04 = Reembolso ou 
ressarcimento recebido por 
agência de propaganda e 
publicidade por valores 
pagos relativos a serviços de 
mídia por conta e ordem de 
terceiro  
99 = Outros reembolsos ou 
ressarcimentos recebidos por 
valores pagos relativos a 
operações por conta e ordem 
de terceiro 
DescricaoComplementarReeRepRes 
tpDescricaoComplementarReeRepRes 
0-1 
Descrição do reembolso ou 
ressarcimento quando a 
opção é "99 – Outros 
reembolsos ou 
ressarcimentos recebidos por 
valores pagos relativos a 
operações por conta e ordem 
de terceiro" 
ValorReeRepRes 
tpValor 
1-1 
Valor monetário (total ou 
parcial, conforme documento 
informado) utilizado para não 
inclusão na base de cálculo 
do ISS e do IBS e da CBS da 
NFS-e que está sendo 
emitida (R$) 
 
 
4.3. SERVIÇOS E MÉTODOS 
 
A seguir são descritos cada um dos serviços disponibilizados pelo Web Service LoteNFTS, bem como 
seus respectivos métodos e Schemas XML de pedido e de retorno do serviço.

## Página 33

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 33 
 
 
4.3.1. Regras Gerais 
 
Parâmetros 
Todos os métodos de pedido de serviço disponíveis recebem dois parâmetros conforme o exemplo: 
<Nome do Método>(<Parâmetro VersaoSchema>, <Parâmetro MensagemXML>). 
 
Onde, 
Parâmetro VersaoSchema: Versão do Schema XML utilizado para montar a mensagem XML de pedido 
do serviço (tipo de dado: Integer); 
Parâmetro MensagemXML: Mensagem XML de pedido do serviço (tipo de dado: String). 
 
Todos os métodos retornam uma mensagem XML de retorno no respectivo Schema XML de retorno do 
serviço pedido (string). Todos os Schemas XML de retorno contem uma TAG chamada “Sucesso” no 
cabeçalho. Esta TAG indica se o pedido foi atendido com sucesso (true) ou não (false) conforme descrito 
a seguir: 
 
 
▪ 
Sucesso: True 
Caso todo o pedido do serviço tenha sido processado sem que ocorram eventos de erro. Sendo 
assim, o Web Service transmitirá uma mensagem XML de retorno do respectivo serviço 
informando o sucesso da operação (TAG sucesso = true) e as demais informações pertinentes 
ao respectivo Schema de Retorno. Caso ocorram eventos de alerta durante o processamento, os 
alertas gerados serão apresentados na mensagem XML de retorno. Eventos de alerta não 
impedem que o pedido seja atendido com sucesso. 
 
▪ 
Sucesso: False 
Caso ocorra algum evento de erro durante o processamento do pedido do serviço. Sendo assim, 
o Web Service transmitirá uma mensagem XML de retorno do respectivo serviço informando o 
não sucesso da operação (TAG sucesso = false) e as demais Informações sobre os eventos de 
erro/alerta ocorridos. 
 
Observações: 
 
Descrição dos nomes e abreviações utilizadas no cabeçalho das tabelas que representam à estrutura 
definida nos Schemas XML: 
 
 
 
A. Coluna #: Código de identificação do campo. Este código é utilizado por um elemento “filho” 
identificar seu elemento “pai” na coluna “Pai”; 
B. Coluna Descrição: Descrição do campo; 
C. Coluna Ele: 
A - indica que o campo é um atributo do Elemento anterior; 
E - indica que o campo é um Elemento; 
CE – indica que o campo é um Elemento que deriva de uma Escolha (Choice); 
G – indica que o campo é um Elemento de Grupo; 
CG - indica que o campo é um Elemento de Grupo que deriva de uma Escolha (Choice); 
D. Coluna Pai: Indica qual é o elemento pai; 
E. Coluna Tipo: 
Tipos Base: 
N – campo numérico; 
C – campo alfanumérico; 
D – campo data; 
Tipos Simples e Tipos Complexos:

## Página 34

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 34 
 
 
F. Coluna Ocorr.: x - y, onde x indica a ocorrência mínima e y a ocorrência máxima. 
 
Para obter a versão mais recente dos Schemas XML acesse o link: 
https://nfe.prefeitura.sp.gov.br/ws/schemas.zip  
 
4.3.2. Envio de NFTS 
 
 
 
I. Descrição: Este método é responsável por atender aos pedidos de Envio Individual de NFTS. 
 
II. Método: EnvioNFTS. 
 
III. Mensagem XML: O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme 
tabela a seguir: 
 
* Representação da estrutura definida no Schema XML PedidoEnvioNFTS.xsd. 
 
 
 
Observação: Assinatura Adicional 
 
A NFTS deverá ter uma assinatura digital. Esta assinatura utilizará o mesmo certificado digital usado na 
assinatura da mensagem XML (item 3.2.2A), com os mesmos padrões de criptografia assimétrica RSA e 
algoritmo message digest SHA-1. 
Para criar a assinatura deverá ser gerado um Hash (utilizando SHA1) de uma cadeia de caracteres 
(ASCII) com informações da NFTS emitida. Este Hash deverá ser assinado utilizando RSA. A assinatura 
do Hash será informada na TAG Assinatura (tipo NFTS apresentado no item 4.2.1). 
 
PedidoEnvioNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do pedido da 
NFTS. 
G 
- 
- 
1-1 
 
 
Remetente 
Dados do remetente 
autorizado a transmitir a 
mensagem XML. 
G 
P1 
tpRemetente 
1-1 
 
 
Versão 
Versão do XML Schema 
utilizado. 
A 
P1 
tpVersao 
1-1 
 
P2 
NTFS 
NFTS a ser emitida. 
G  
- 
tpNFTS 
1-1 
 
P3 
Signature 
Assinatura digital do 
contribuinte que gerou as 
NFTS contidas na 
mensagem XML. 
G  
- 
SignatureType 
1-1 
“Signature” é o elemento 
raiz de uma assinatura 
XML. Este elemento é 
descrito no arquivo 
xmldsig-core-
schema_v01.xsd

## Página 35

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 35 
 
 
 
4.3.2.1. Assinatura da NFTS 
A assinatura, sempre será feita usando a representação xml da NFTS. Desevolvedores que tenham 
sistemas em ASP.NET podem usar o código abaixo em conjunto com as classes fornecidas no arquivo 
de schemas, que pode ser obtido usando o link do item 4.2. TIPOS UTILIZADOS.  
 
Código exemplo para assinatura de uma NFTS (C#) 
 
public TpNFTS ToXML(X509Certificate2 x509certificate){ 
  var nfts = new TpNFTS(); 
   
  // Preencher todos os campos da NFTS exceto “Assinatura” 
   
  nfts.Assinatura = Assinar(x509certificate, nfts); 
  return nfts; 
} 
 
private static byte[] Assinar(X509Certificate2 x509certificate, Object detalheItem){ 
  byte[] arrayToSign = SimpleXmlFragment(detalheItem); 
  return CreateSignaturePKCS1(x509certificate, arrayToSign); 
} 
 
private static byte[] CreateSignaturePKCS1(X509Certificate2 x509, byte[] Value){ 
  RSACryptoServiceProvider rsa = (RSACryptoServiceProvider)x509.PrivateKey; 
  RSAPKCS1SignatureFormatter rsaF = new RSAPKCS1SignatureFormatter(rsa); 
  SHA1CryptoServiceProvider sha1 = new SHA1CryptoServiceProvider(); 
  byte[] hash = null; 
  hash = sha1.ComputeHash(Value); 
  rsaF.SetHashAlgorithm("SHA1"); 
  return rsaF.CreateSignature(hash); 
} 
 
public static byte[] SimpleXmlFragment(Object objectGraph){ 
  if (objectGraph == null){ 
    throw new InvalidOperationException("Nenhum Grafo de Objetos foi especificado."); 
  }     
             
  MemoryStream memorySteam = new MemoryStream(); 
  XmlTextWriter textWriter = new XmlFragmentWriter(memorySteam, Encoding.UTF8); 
  textWriter.Namespaces = false; 
  textWriter.Formatting = Formatting.None; 
             
  XmlSerializer xmlSerializer = new XmlSerializer(objectGraph.GetType()); 
  XmlSerializerNamespaces xmlSerializerNamespaces = new XmlSerializerNamespaces(); 
  xmlSerializerNamespaces.Add(String.Empty, String.Empty); 
 
  xmlSerializer.Serialize(textWriter, objectGraph, xmlSerializerNamespaces); 
 
  textWriter.Close(); 
  memorySteam.Close(); 
 
  var xml = Encoding.UTF8.GetString(memorySteam.ToArray()); 
 
  // Remova o BOM, se houver 
  string byteOrderMarkUtf8 = Encoding.UTF8.GetString(Encoding.UTF8.GetPreamble()); 
  if (xml.StartsWith(byteOrderMarkUtf8)) { 
    xml = xml.Remove(0, byteOrderMarkUtf8.Length); 
  }

## Página 36

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 36 
 
 
  return Encoding.UTF8.GetBytes(xml);             
} 
 
private class XmlFragmentWriter : XmlTextWriter { 
  public XmlFragmentWriter(Stream stream, Encoding encoding) : base(stream, encoding) { 
  } 
 
  public override void WriteStartDocument() { 
    // Do nothing (omit the declaration) 
  } 
} 
 
Explicação geral para assinatura de uma NFTS 
 
Desenvolvedores que com sistemas em outras linguagens devem se certificar que o String a ser 
assinado corresponde exatamente ao mostrado abaixo:  
 
<tpNFTS><TipoDocumento>VALOR</TipoDocumento><ChaveDocumento><InscricaoMunicipal>VALOR</In
scricaoMunicipal><SerieNFTS>VALOR</SerieNFTS><NumeroDocumento>VALOR</NumeroDocumento></Ch
aveDocumento><DataPrestacao>VALOR</DataPrestacao><StatusNFTS>VALOR</StatusNFTS><Tributaca
oNFTS>VALOR</TributacaoNFTS><ValorServicos>VALOR</ValorServicos><ValorDeducoes>VALOR</Val
orDeducoes><CodigoServico>VALOR</CodigoServico><CodigoSubItem>VALOR</CodigoSubItem><Aliqu
otaServicos>VALOR</AliquotaServicos><ISSRetidoTomador>VALOR</ISSRetidoTomador><ISSRetidoI
ntermediario>VALOR</ISSRetidoIntermediario><Prestador><CPFCNPJ><CNPJ>VALOR</CNPJ></CPFCNP
J><InscricaoMunicipal>VALOR</InscricaoMunicipal><RazaoSocialPrestador>VALOR</RazaoSocialP
restador><Endereco><TipoLogradouro>VALOR</TipoLogradouro><Logradouro>VALOR</Logradouro><N
umeroEndereco>VALOR</NumeroEndereco><ComplementoEndereco>VALOR</ComplementoEndereco><Bair
ro>VALOR</Bairro><Cidade>VALOR</Cidade><UF>VALOR</UF><CEP>VALOR</CEP></Endereco><Email>VA
LOR</Email></Prestador><RegimeTributacao>VALOR</RegimeTributacao><DataPagamento>VALOR</Da
taPagamento><Discriminacao>VALOR</Discriminacao><TipoNFTS>VALOR</TipoNFTS><Tomador><CPFCN
PJ><CPF>VALOR</CPF></CPFCNPJ><RazaoSocial>VALOR</RazaoSocial></Tomador></tpNFTS> 
 
Os seguintes cuidados devem ser tomados ao gerar este string: 
1. Não deixar nenhum espaço em branco (a não ser como parte dos valores) ou quebra de linha; 
2. Não incluir namespaces; 
3. Não incluir tags de valores não informados; 
4. Não incluir a tag “Assinatura”; 
5. Não fazer padding de valores (com “0” ou “ “) a esquerda ou a direita 
6. Imprimir os valores como UTF-8. 
 
O problema mais comum encontrado durante a assinatura envolve CPFs e CNPJs que começam com o 
número 0. Ao serem transmitidos para o web service, esses valores são convertidos em números e, 
quando a validação é feita no servidor, este campo (assim como todos os outros campos numéricos), 
não recebe nenhum tipo de padding a esquerda para chegar ao tamanho máximo permitido (11 números 
para CPF, 14 para CNPJ). Se o desenvolvedor ler o valor do CPF/CNPJ diretamente do usuário, sem 
convertê-lo para número antes de criar a string a ser assinada, os 0 não significativos não serão 
eliminados e a assinatura ficará incorreta. 
 
Depois que o string for gerado realize os seguintes passos para finalizar a assinatura: 
 
1. Converta a cadeia de caracteres UTF-8 para bytes. 
2. Gere o HASH (array de bytes) utilizando SHA1. 
3. Assine o HASH (array de bytes) utilizando RSA-SHA1. 
4. Atribua o resultado ao valor do campo “Assinatura” do XML. 
 
Atenção: Na maioria das linguagens de programa os passos 2 e 3 são feitos ao mesmo tempo. O código 
C# acima mostra um exemplo desse processo. 
 
 
IV. Schema da Mensagem XML do Retorno: RetornoEnvioNFTS.xsd

## Página 37

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 37 
 
 
* Representação da estrutura definida no Schema XML RetornoEnvioNFTS.xsd. 
 
V. Formato das Mensagens SOAP: 
 
Pedido: 
 
 
 
Retorno: 
 
 
4.3.3. Envio de Lote de NFTS (EnvioLoteNFTS) 
 
 
RetronoEnvioNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do pedido 
da NFTS.do retorno 
para consultas. 
G 
- 
tpCabecalhoRetorno 
1-1 
 
P2 
ListaRetornoNFTS 
Elemento que 
representa a 
ocorrência de eventos 
ou NFTS durante o 
processamento da 
mensagem XML. 
G  
- 
tpListaRetornoLote 
0-n 
 
P3 
ChaveNFTS 
Identificação da NFTS 
gerada. 
G  
- 
tpChaveNFTS 
1-1

## Página 38

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 38 
 
 
 
I. Descrição: Este método é responsável por atender aos pedidos de Envio de Lote de NFTS. 
 
II. Método: EnvioLoteNFTS. 
 
III. O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
* Representação da estrutura definida no Schema XML PedidoEnvioLoteNFTS.xsd. 
 
 
Observação 1: Assinatura Adicional 
 
PedidoEnvioLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do pedido da 
NFTS. 
G 
- 
- 
1-1 
 
 
Versao 
Versão do Schema XML 
utilizado. 
A 
P1 
tpVersao 
1-1 
 
 
Remetente 
Dados do Remetente 
autorizado a transmitir a 
mensagem XML. 
G  
P1 
tpRemetente 
1-1 
 
 
transacao 
Informa se as NFTS a 
serem emitidas farão 
parte de uma mesma 
transação. 
E 
P1 
boolean 
0-1 
True - As NFTS só 
serão emitidas se não 
ocorrer nenhum evento 
de erro durante o 
processamento de todo 
o lote;  
 
False - As NFTS válidos 
serão emitidas, mesmo 
que ocorram eventos de 
erro durante 
processamento de 
outras NFTS deste lote. 
 
Default: true. 
 
dtInicio 
Data de início do 
período. 
E 
P1 
D 
0-1 
(AAAA-MM-DD) 
 
dtFim 
Data final do período. 
E 
P1 
D 
0-1 
(AAAA-MM-DD) 
 
QtdNFTS 
Total de NFTS contidos 
na mensagem XML. 
E 
P1 
tpQuantidade 
1-1 
 
 
ValorTotalServicos 
Valor total dos serviços 
das NFTS contidos na 
mensagem XML. 
E 
P1 
tpValor 
1-1 
 
 
ValorTotalDeducoes 
Valor total das deduções 
das NFTS contidos na 
mensagem XML. 
E 
P1 
tpValor 
0-1 
 
 
Versao 
Versão do Schema XML 
utilizado 
E 
P1 
tpVersao 
1-1 
1 
P3 
NFTS 
As NFTS a serem 
emitidas. 
G  
 
tpNFTS 
1-50 
 
P4 
Signature 
Assinatura digital do 
contribuinte que gerou 
as NFTS contidas na 
mensagem XML. 
G  
- 
SignatureType 
1-1 
“Signature” é o 
elemento raiz de uma 
assinatura XML. Este 
elemento é descrito no 
arquivo xmldsig-core-
schema_v01.xsd

## Página 39

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 39 
 
 
Cada NFTS enviado no lote deverá ser assinado digitalmente conforme especificado no item 4.3.2. 
(Envio de NFTS). 
 
Observação 2: Transação 
 
Se ocorrerem eventos de erro de validação dos dados do cabeçalho do pedido de envio de lote de 
NFTS, independente da opção informada no campo “Transação”, nenhuma NFTS será emitida.  
 
IV. Schema da Mensagem XML do Retorno: RetornoEnvioLoteRPS.xsd 
 
* Representação da estrutura definida no Schema XML RetornoEnvioLoteNFTS.xsd. 
 
Observação: Transação 
 
Para pedidos de envio de lote de NFTS com transação (Transacao = True), o campo InformacoesLote 
retornará (dentre outras informações) o total dos serviços, o total das deduções e a quantidade de NFTS 
enviados na mensagem XML de pedido do serviço. 
 
Para pedidos de envio de lote de NFTS sem transação (Transacao = False), o campo InformacoesLote 
retornará (dentre outras informações) o total dos serviços, o total das deduções e a quantidade de NFTS 
que foram efetivamente emitidas. 
 
 
V. Formato das Mensagens SOAP: 
 
Pedido: 
 
 
 
Retorno: 
 
RetornoEnvioLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Oc
orr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do retorno. 
G 
- 
tpCabecalho 
1-1 
 
P2 
ListaRetornoLote 
Dados do Remetente 
autorizado a transmitir a 
mensagem XML. 
G  
- 
tpListaRetornoLote 
0-1

## Página 40

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 40 
 
 
 
4.3.4. Teste de Envio de Lote de NFTS (TesteEnvioLoteNFTS) 
 
 
I. 
Descrição: Este método é responsável por atender aos pedidos de Teste de Envio de Lote de 
NFTS. 
 
Observação: 
Conforme informado no item 2.3, este método deverá ser usado apenas na fase de adaptação 
dos sistemas dos contribuintes. Nos casos de sistemas já adaptados, seu uso resulta em 
duplicidade 
de 
esforços 
desnecessários, 
pois 
as 
verificações 
feitas 
no 
método 
TesteEnvioLoteNFTS são as mesmas realizadas pelo método EnvioLoteNFTS. 
 
II. 
Método: TesteEnvioLoteNFTS 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela 
apresentada no item V 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoEnvioLoteNFTS.xsd (Idêntico ao Schema da 
Mensagem XML do Retorno do item V) 
 
4.3.5. Pedido de Consulta de NFTS (ConsultaNFTS) 
 
I. 
Descrição: Este método é responsável por atender aos pedidos de consulta de NFTS. Seu 
acesso é permitido apenas pela chave de identificação da NFTS.

## Página 41

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 41 
 
 
II. 
Método: ConsultaNFTS 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
 
 
 
*Representação da estrutura definida no Schema XML PedidoConsultaNFTS.xsd. 
 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoConsulta.xsd 
 
* Representação da estrutura definida no schema XML RetornoConsulta.xsd. 
 
 
V. 
Formato das Mensagens SOAP: 
 
Pedido: 
 
PedidoConsultaNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do pedido de 
consulta de NFTS. 
G 
- 
- 
1-1 
 
 
Remetente 
Dados do Remetente 
autorizado a transmitir a 
mensagem XML. 
G  
P1 
tpRemetente 
1-1 
 
 
Versao 
Versão do Schema XML 
utilizado. 
A 
P1 
tpVersao 
1-1 
 
P2 
DetalheNFTS 
 
G  
- 
 
1-1 
 
 
ChaveNFTS 
Chave de identificação 
da NFTS. 
G 
P2 
tpChaveNFTS 
1-50 
 
P3 
Signature 
Assinatura digital do 
contribuinte que gerou 
as NFTS contidas na 
mensagem XML. 
G  
- 
SignatureType 
1-1 
“Signature” é o 
elemento raiz de uma 
assinatura XML. Este 
elemento é descrito no 
arquivo xmldsig-core-
schema_v01.xsd 
RetornoConsultaNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do cabeçalho 
do retorno para consultas 
G 
- 
tpCabecalhoRetorno 
1-1 
 
P2  
RetornoConsulta
LoteNFTS 
Elemento que representa 
a ocorrência de eventos 
ou NFTS durante o 
processamento da 
mensagem XML. 
G  
- 
tpListaRetornoConsulta
NFTS 
1 -n

## Página 42

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 42 
 
 
 
Retorno: 
 
 
 
 
4.3.6. Pedido de Consulta de NFTS Emitidas (ConsultaEmissaoNFTS) 
 
I. 
Descrição: Este método é responsável por atender aos pedidos de consulta de CNPJ. Este 
método possibilita aos tomadores e/ou prestadores de serviços consultarem quais Inscrições 
Municipais (CCM) estão vinculadas a um determinado CNPJ e se estes CCM emitem NFTS ou 
não. 
 
II. 
Método: ConsultaEmissaoNFTS 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoConsulta.xsd (Idêntico ao do item 4.3.5) 
 
V. 
Formato das Mensagens SOAP: 
 
Pedido:

## Página 43

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 43 
 
 
 
 
 
 
 
 
 
 
 
Retorno: 
 
 
 
4.3.8. Pedido de Consulta de Lote (ConsultaLote) 
 
 
 
I. 
Descrição: Este método é responsável por atender aos pedidos de Consulta de Lote de NFTS 
geradas a partir do método EnvioLoteNFTS. 
 
II. 
Método: ConsultaLote 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
 
 
PedidoConsultaLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho. 
G 
- 
tpCabecho 
1-1

## Página 44

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 44 
 
 
PedidoConsultaLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
 
Remetente 
Dados do Remetente 
autorizado a 
transmitir a 
mensagem XML. 
G  
P1 
tpRemetente 
1-1 
 
 
Versao 
Versão do XML 
Schema Utilizado. 
A 
P1 
tpVersao 
1-1 
 
P2 
DetalheLoteNFTS 
Dados do lote a ser 
consultado 
G  
- 
 
1-1 
 
 
NumeroLote 
Número do lote que 
será consultado 
G 
P2 
tpNumeroLote 
1-1 
 
P3 
Signature 
Assinatura digital da 
mensagem XML. 
G 
- 
SignatureType 
1-1 
“Signature” é o 
elemento raiz de uma 
assinatura XML. Este 
elemento é descrito no 
arquivo xmldsig- 
coreschema_v01.xsd 
* Representação da estrutura definida no Schema XML PedidoConsultaLoteNFTS.xsd. 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoConsulta.xsd (Idêntico ao do item 4.3.5) 
 
V. 
Formato das Mensagens SOAP: 
 
Pedido: 
 
 
 
Retorno: 
 
 
4.3.9. Pedido de Informações do Lote (ConsultaInformacoesLote)

## Página 45

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 45 
 
 
 
 
 
 
I. 
Descrição: Este método é responsável por atender aos pedidos de Consulta de Informações de 
Lote de NFTS geradas a partir do método EnvioLoteNFTS. 
 
II. 
Método: ConsultaInformacoesLote 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
 
PedidoConsultaInformacoesLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho. 
G 
- 
- 
1-1 
 
 
Remetente 
Dados do Remetente 
autorizado a transmitir a 
mensagem XML. 
G  
P1 
tpRemetente 
1-1 
 
 
Versao 
Versão do XML 
Schema Utilizado. 
A 
P1 
tpVersao 
1-1 
 
P2 
DetalheInformacoesLote 
 
G  
- 
 
1-1 
 
 
NumeroLote 
Número do Lote que 
deseja consultar. 
E 
P2 
tpNumeroLote 
1-1 
 
P3 
Signature 
Assinatura digital da 
mensagem XML. 
G 
- 
SignatureType 
1-1 
“Signature” é o 
elemento raiz de uma 
assinatura XML. Este 
elemento é descrito no 
arquivo xmldsig- 
coreschema_v01.xsd 
* Representação da estrutura definida no Schema XML PedidoInformacoesLote.xsd. 
 
 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoConsultaInformacoesLoteNFTS.xsd 
 
RetornoConsultaInformacoesLoteNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do cabeçalho 
do retorno. 
G 
- 
tpCabecalho 
1-1 
 
P2 
ListaRetornoLote 
Lista de mensagens de 
retorno do lote. 
G 
- 
tpListaRetornoLote 
0 - n 
 
* Representação da estrutura definida no Schema XML RetornoInformacoesLote.xsd. 
 
V. 
Formato das Mensagens SOAP:

## Página 46

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 46 
 
 
 
Pedido: 
 
 
 
 
 
 
 
 
 
 
Retorno: 
 
 
 
4.3.10. Pedido de Cancelamento de NFTS (CancelamentoNFTS) 
 
 
I. 
Descrição: Este método é responsável por atender aos pedidos referentes ao cancelamento de 
NFTS geradas a partir do método EnvioLoteNFTS. 
 
II. 
Método: CancelamentoNFTS 
 
III. 
O parâmetro MensagemXML (ver item 4.3.1) deverá ser preenchido conforme tabela a seguir: 
 
PedidoCancelamentoNFTS.xsd*

## Página 47

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 47 
 
 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do cabeçalho. 
G 
- 
- 
1-1 
 
 
Remetente 
Dados do Remetente 
autorizado a transmitir a 
mensagem XML. 
G  
P1 
tpRemetente 
1-1 
 
 
Versao 
Versão do XML 
Schema Utilizado. 
A 
P1 
tpVersao 
1-1 
 
 
Transação 
Informa se as NFTS a 
serem emitidas farão parte 
de uma mesma transação. 
E 
P1 
Booleano 
 
True - As NFTS só serão 
emitidas se não ocorrer 
nenhum evento de erro 
durante o processamento 
de todo o lote;  
 
False - As NFTS válidos 
serão emitidas, mesmo 
que ocorram eventos de 
erro durante 
processamento de outras 
NFTS deste lote. 
 
Default: true. 
P2 
DetalheNFTS 
Detalhe do pedido de 
cancelamento de NFTS. 
G 
 
 
1-50 
 
 
ChaveNFTS 
chave da NFTS a ser 
cancelada. 
E 
P2 
tpChaveNFTS 
1-1 
 
 
AssinaturaCancelamento 
Assinatura da NFTS a ser 
cancelada. 
E 
P2 
tpAssinaturaCa
ncelamento 
1-1 
 
P3 
Signature 
Assinatura digital da 
mensagem XML. 
G 
- 
SignatureType 
1-1 
“Signature” é o elemento 
raiz de uma assinatura 
XML. Este elemento é 
descrito no arquivo 
xmldsigcore- 
schema_v01.xsd 
* Representação da estrutura definida no schema XML PedidoCancelamentoNFe.xsd. 
 
Observação 1: Transação 
Se ocorrerem eventos de erro de validação dos dados do cabeçalho do pedido de cancelamento de 
NFTS, independente da opção informada no campo “Transação”, nenhuma NFTS será cancelada. 
 
Observação 2: Assinatura Adicional 
Cada NFTS a ser cancelada (representada pela TAG ChaveNFTS) deverá ter sua respectiva assinatura 
de cancelamento. Esta assinatura utilizará o mesmo certificado digital usado na assinatura da 
mensagem XML (item 3.2.2A), com os mesmos padrões de criptografia assimétrica RSA e algoritmo 
message digest SHA-1. 
 
Para criar a assinatura deverá ser gerado um Hash (utilizando SHA1) de uma cadeia de caracteres 
(ASCII) com informações da NFTS a ser cancelada. Este Hash deverá ser assinado utilizando RSA. A 
assinatura do Hash será informada na TAG AssinaturaCancelamento. 
 
4.3.10.1. Assinatura do Cancelamento 
O processo é exatamente o mesmo descrito no item 4.3.2.1. Assinatura da NFTS. Desenvolvedores 
ASP.NET podem usar o mesmo código mostrado naquele item, sem nenhuma modificação. 
Desenvolvedores do outras linguagens devem ser certificar de seguir as regras descritas sendo o XML a 
ser assinado o mostrado abaixo: 
 
<PedidoCancelamentoNFTSDetalheNFTS><ChaveNFTS><InscricaoMunicipal>VALOR</InscricaoMunicip
al><NumeroNFTS>VALOR</NumeroNFTS></ChaveNFTS></PedidoCancelamentoNFTSDetalheNFTS> 
 
 
IV. 
Schema da Mensagem XML do Retorno: RetornoCancelamentoNFTS.xsd

## Página 48

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 48 
 
 
 
 
RetornoCancelamentoNFTS.xsd* 
# 
Campo 
Descrição 
Ele 
Pai 
Tipo 
Ocorr. 
Observação 
P1 
Cabecalho 
TAG de grupo das 
informações do 
cabeçalho do retorno 
para consultas. 
G 
- 
tpCabecalhoRetorno 
1-1 
 
P2 
ListaRetornoCancelamento 
Lista de mensagens de 
retorno do lote. 
G 
- 
tpListaRetornoLote 
0 -n 
 
* Representação da estrutura definida no Schema XML RetornoCancelamentoNFTS.xsd. 
 
O Sistema da NFTS verificará se a NFTS existe e se não há nenhum impedimento para o cancelamento. 
 
O cancelamento poderá ser realizado para várias notas numa mesma mensagem XML (Obedecendo ao 
limite de 50). 
 
V. 
Formato das Mensagens SOAP: 
 
Pedido: 
 
 
 
Retorno: 
 
 
 
 
 
4.4. TABELA DE ERROS E ALERTAS 
 
As tabelas a seguir, apresentam os erros e alertas relacionados ao Web Service do Sistema de 
Notas Fiscais Eletrônicas da Prefeitura de São Paulo. 
 
Legenda da coluna “Onde Ocorre”: 
 
A. VALIDAÇÃO DO SCHEMA; 
B. VERIFICAÇÃO DO CERTIFICADO/ASSINATURA; 
C. Envio de NFTS;

## Página 49

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 49 
 
 
D. Envio de Lote de NFTS; 
E. Teste de Envio de Lote de NFTS; 
F. Consulta de NFTS; 
G. Consulta de Emissão de NFTS; 
H. Consulta de Lote; 
I. Consulta de Informações de Lote; 
J. Cancelamento de NFTS; 
 
 
 
4.4.1. Erros 
 
Tabela de Erros de Schema 
 
Código 
Descrição 
Onde Ocorre 
1 
Erro durante a conversão do XML. Entre em contato com o administrador do sistema. 
A 
10 
Por motivos de seguranca não e permitido a utilização dos caracteres "<" e ">" em campos 
de texto. 
A 
996 
Erro na recepção de certificado do servidor. 
A 
1001 
XML não compatível com Schema. 
A 
1002 
Versão do Schema XML Incorreto. 
A 
1050 
Rejeição: Certificado Assinatura Inválido. 
B 
1051 
Rejeição: Certificado Assinatura Data Validade. 
B 
1052 
Rejeição: Certificado Assinatura sem CNPJ. 
B 
1053 
Rejeição: Certificado Assinatura – Erro Cadeia de Certificação. 
B 
1054 
Rejeição: Certificado Assinatura revogado. 
B 
1055 
Rejeição: Certificado Assinatura difere ICP-Brasil. 
B 
1056 
Rejeição: Assinatura – Digest difere do calculado. 
B 
1057 
Rejeição: Assinatura difere do calculado. 
B 
 
 
Tabela de Erros de Pedido de Serviço 
 
Código 
Descrição 
Onde Ocorre 
102 
A Versão do Arquivo é inválida. 
C, D, E, F, G, H, I, J 
103 
A Data inicial de prestação do serviço das NFTS enviadas é inválida. 
D, E 
105 
A Data final de prestação do serviço das NFTS enviadas é inválida. 
D, E 
111 
Inscrição do Tomador ou Intermediário de Serviços não encontrada. 
C, F, J 
112 
Inscrição do Tomador ou Intermediário especificada no Arquivo não confere com o Tomador 
ou Intermediário selecionado. 
C, F, J 
113 
Inscrição do Tomador ou Intermediario especificada não pertence ao CPF/CNPJ informado. 
C, D, E 
210 
Campo ISS Retido (<tipo informado no registro>) inválido. 
C, D, E 
222 
O Código do Serviço Prestado (<código do serviço prestado informado no registro>) é 
inválido. 
C, D, E 
225 
O Valor da Alíquota deverá ser entre 2% a 5%. 
C, D, E

## Página 50

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 50 
 
 
264 
O código do município informado não é válido. Favor verificar. 
C, D, E 
265 
O código de serviço não permite indicação do local da prestação do serviço. 
C, D, E 
266 
O código do município do local da prestação do serviço deve ser informado. 
C, D, E 
267 
O código do país onde ocorreu a prestação do serviço não é válido. Favor verificar. 
C, D, E 
304 
O Valor das deduções deverá ser inferior ao valor dos serviços. 
C, D, E 
310 
Código do Serviço Prestado é obrigatório. 
C, D, E 
323 
Nota não pode ser cancelada. Ver detalhes no Manual. 
C, D, E 
324 
Operação não autorizada por meio eletrônico em razão de ultrapassado o prazo permitido. 
C, D, E 
326 
O código de serviço (<código de serviço informado no registro>) não permite que o ISS seja 
retido pelo Tomador. 
C, D, E 
327 
O código de serviço ({0}) não permite que o ISS seja retido pelo Intermediário. 
 
350 
Autorizado a emitir NFTS a partir de 01/ (<data de autorização informada no registro, formato 
mm/yyyy >) 
C, D, E 
371 
Código de serviço não autorizado a emitir Notas Fiscais. 
C, D, E 
401 
A Data Inicial de prestação do serviço das NFTS enviadas não pode ser inferior a 
01/09/2011 
D, E 
402 
A Data Final de prestação do serviço das NFTS enviadas não pode ser inferior a 01/09/2011 
D, E 
403 
A Data Final de prestação do serviço das NFTS enviadas não pode ser superior a <data 
atual>. 
D, E 
404 
A Data Final de prestação do serviço das NFTS enviadas deverá ser superior a Data Inicial. 
D, E 
406 
O Tipo de Documento (<tipo de documento informado no registro>) é inválido. 
C, D, E 
407 
A Situação da NFTS é inválida. 
C, D, E 
408 
A Tributação do Serviço (<tributação do serviço informada no registro>) é inválida. 
C, D, E 
410 
O Código do Serviço Prestado (<código do serviço prestado informado no registro>) não 
encontrado. 
C, D, E 
411 
Código do Serviço Prestado <código enviado> não permite dedução na base de cálculo. 
C, D, E 
412 
Código do Serviço Prestado <código enviado> não é permitido para prestador pessoa física 
C, D, E 
413 
Código do Serviço Prestado <código enviado> não é permitido para prestador pessoa 
jurídica 
C, D, E 
414 
Código do Serviço Prestado (<código de serviço informado no registro>) é de uso exclusivo 
de Sociedade de Profissionais. Código não permite indicação de Imunidade. 
C, D, E 
415 
O Subitem da Lista de Serviço é inválido. 
C, D, E 
416 
Obrigatório informar o subitem da lista da Lei Complementar n⁰ 116/2003 
C, D, E 
417 
Subitem da lista da Lei Complementar n⁰ 116/2003 não está relacionado ao código de 
serviço informado 
C, D, E 
418 
Serviço sem emissão de documento fiscal embora obrigado. O ISS deverá ser retido. 
C, D, E 
419 
Prestador declarado como microempreendedor individual não deve ter o ISS retido. 
C, D, E 
420 
Prestador de serviços não cadastrado no CPOM. O ISS deverá ser retido. 
C, D, E 
421 
O CNPJ/CPF do Prestador (<CNPJ ou CPF do prestador de serviço informado no registro>) 
é inválido. 
C, D, E 
422 
O Indicador CNPJ/CPF do Prestador (<indicador de CNPJ ou CPF do prestador de serviços 
informado no registro>) é inválido. 
C, D, E 
423 
CNPJ/CPF do Prestador de Serviços inválido (dígitos verificadores não conferem). 
C, D, E 
426 
Número do documento não informado 
C, D, E

## Página 51

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 51 
 
 
427 
Documento em duplicidade no arquivo enviado. 
C, D, E 
428 
NFTS não poderá ser cancelada, pois está incluída em Guia de Recolhimento. 
J 
429 
O campo Inscrição Municipal do prestador (<ccm>) só deverá ser preenchido para 
prestadores estabelecidos no município de São Paulo. 
C, D, E 
430 
CNPJ do Prestador (<CNPJ enviado>) possui mais de uma inscrição municipal, sendo 
obrigatório o preenchimento do campo Inscrição Municipal do Prestador. 
C, D, E 
431 
O prestador de serviços informado é o próprio tomador. 
C, D, E 
432 
A Data de Prestação do Serviço da NFTS enviada é inválida. 
C, D, E 
433 
A data da prestação do serviço não poderá ser superior à data de hoje. 
C, D, E 
434 
A data da prestação do serviço não poderá ser inferior a 01/09/2011. 
C, D, E 
435 
O Email do Prestado de Serviços é inválido. 
C, D, E 
436 
Campo Endereço não preenchido (obrigatório para prestador estabelecido no exterior). 
C, D, E 
437 
Serviço com indicação de imunidade não permite retenção do ISS. 
C, D, E 
438 
Prestador profissional autônomo não permite indicação de imunidade. 
C, D, E 
439 
Prestador micro empreendedor individual não permite indicação de imunidade. 
C, D, E 
440 
O Tipo de NFTS (<tipo de NFTS informado no registro>) é inválido. 
C, D, E 
441 
O Regime de Tributação é inválido. 
C, D, E 
442 
Regime de tributação <Regime de Tributação informado no registro> indicado 
incorretamente para profissional autônomo. 
C, D, E 
443 
Prestador no exterior (CPF/CNPJ não informado) não permite Regime de Tributação 
Simples Nacional ou MEI. 
C, D, E 
444 
Data de pagamento da NFTS somente pode ser preenchida por tomadores ou intermediários 
Órgãos Públicos. 
C, D, E 
445 
Prestador autorizado à emissão da NFS-e desde XX/YY/ZZZ. Os serviços tomados ou 
intermediados com emissão de NFS-e não devem ser declarados por meio da NFTS. 
C, D, E 
446 
Serviço declarado com dados coincidentes com a NFTS XXXXXX. 
C, D, E 
447 
Cancelamento em lote da NFTS não permitido. Efetue individualmente o cancelamento “on-
line” da NFTS. 
J 
448 
Cancelamento não poderá ser processado, pois não existe NFTS emitida com o documento 
fiscal informado. 
J 
449 
Serviço tomado ou intermediado com NFTS emitida, porém com dados divergentes. Efetue 
individualmente o cancelamento “on-line” da NFTS ou corrija os dados divergentes. 
J 
450 
A Data de Pagamento da NFTS enviada é inválida. 
C, D, E 
451 
A Inscrição do Prestador não existe no sistema. 
C, D, E, F, G, H, I 
452 
NFTS <nfts> referente a este documento está cancelada. Documento não será processado, 
pois não possui alterações. 
C, D, E 
458 
Data de pagamento da NFTS deverá ser igual ou superior à data da prestação e igual ou 
anterior à data atual. 
C, D, E 
460 
O CCM (<CCM informado no registro>) não está vinculado ao CNPJ (<CNPJ do prestador 
informado no registro>). 
C, D, E 
461 
Inscrição Municipal do Prestador de Serviços consta como cancelada. 
C, D, E 
462 
Código de serviço prestado (<código de serviço informado no registro>) não é permitido para 
prestador no exterior. 
C, D, E 
463 
O preenchimento do CEP é obrigatório para todos os prestadores que não residam no 
exterior. 
C, D, E 
464 
Os dados de endereço informados serão substituídos pelos relacionados ao CEP informado. 
C, D, E 
465 
Prestador com inscrição municipal e informações de endereço incompletas. 
C, D, E

## Página 52

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 52 
 
 
466 
O CEP (<CEP informado no registo>) é inválido. 
C, D, E 
467 
Código do Serviço Prestado (<código enviado>) não permitido - consulte a Instrução 
Normativa SF/SUREM nº 18/2011. 
C, D, E 
468 
Serviços provenientes do exterior do País ou cuja prestação se tenha iniciado no exterior do 
País devem ter o ISS retido pelo tomador ou intermediário. 
C, D, E 
469 
O campo CEP não deverá ser informado quando o prestador for do exterior. 
C, D, E 
470 
O ISS deverá ser retido conforme Lei XX.YYY/2012. 
C, D, E 
472 
Prestador inscrito no Cadastro de Prestadores de Serviços de Outros Municípios como 
estabelecido em <município projeto de lei 263>  sujeito à retenção do ISS, conforme Lei 
XX.YYY/2012. 
C, D, E 
473 
Atividade de prestação de serviços não cadastrada no CPOM. O ISS deverá ser retido. 
C, D, E, F, G, H, I, J 
474 
Número de inscrição da obra inexistente. 
C, D, E 
475 
Código de serviço não permite indicação do número da obra. 
C, D, E 
476 
Tipo de documento não permitido para o código de serviço informado. 
C, D, E 
477 
Obrigatório informar número de inscrição da obra. 
C, D, E 
478 
Código CEI inválido. 
C, D, E 
479 
Código do Serviço Prestado <código informado> não permite indicação do número do 
Cadastro Específico do INSS (CEI). 
C, D, E 
480 
Não informe o número de inscrição da obra para serviços prestados antes de <data limite>. 
C, D, E 
601 
Tipo de NFTS igual a 2 não permitido. 
C, D, E 
604 
Para tipo de NFTS igual a 2 será obrigatório o preenchimento do campo “CNPJ/CPF do 
Tomador”. 
C, D, E 
605 
Para tipo de NFTS igual a 2 será obrigatório o preenchimento do campo “Indicador 
CNPJ/CPF do Tomador” 
C, D, E 
606 
CNPJ/CPF do Tomador inválido. 
C, D, E, F, G, H, I, J 
607 
O Indicador CNPJ/CPF do Tomador é inválido. 
C, D, E 
608 
CPF/CNPJ do Tomador de Serviços inválido (dígitos verificadores não conferem). 
C, D, E 
610 
Para tipo de NFTS igual a 2 será obrigatório o preenchimento do campo “Nome/Razão 
Social do Tomador”. 
C, D, E 
611 
O tomador de serviços informado é o próprio intermediário. 
C, D, E 
612 
O código de serviço (<código de serviço informado no registro>) não permite que o ISS seja 
retido pelo Intermediário. 
C, D, E 
613 
Código de serviço prestado não permite emissão de NFTS com intermediário. 
C, D, E 
 
 
 
1411 
O campo CNPJ/CPF não deve ser informado para prestadores estrangeiros.  Desconsiderar 
CNPJs em que todos os dígitos são 0 (compatibilidade retroativa para TXT). 
C, D, E, F, G, H, I, J 
1412 
O campo CPF/CNPJ deve ser informado para prestadores não estrangeiro. Se o prestador 
não for estrangeiro e este campo não houver sido informado. 
C, D, E, F, G, H, I, J 
1511 
Para tipo de NFTS igual a 1 não se deve preencher o campo “CNPJ/CPF do Tomador”. 
C, D, E 
2711 
Para tipo de NFTS igual a 1 não se deve preencher o campo “Indicador de CNPJ/CPF do 
Tomador”. 
C, D, E 
3016 
Para NFTS Intermediário, o ISS não pode ser retido pelo tomador. 
C, D, E 
3111 
Para NFTS Tomador, o ISS não pode ser retido pelo intermediário. 
C, D, E 
3311 
Para tipo de NFTS igual a 1 não se deve preencher o campo “CNPJ/CPF do Tomador”. 
C, D, E 
1001 
O CNPJ do usuário autorizado a enviar a mensagem XML não confere com o CNPJ usado 
na comunicação. 
C, D, E

## Página 53

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 53 
 
 
1002 
Tamanho da mensagem XML ultrapassou o limite máximo permitido de 500 Kbytes. 
C, D, E 
1003 
Mensagem XML de Pedido do serviço sem conteúdo. 
C, D, E 
1004 
Lote não encontrado. 
 
1005 
NFTS não encontrada. 
 
1006 
O CPF/CNPJ da assinatura da mensagem XML não corresponde ao CPF/CNPJ do Tomador 
ou Intermediários dos Serviços. 
C, D, E 
1007 
Só é permitido o envio de informações por um único Tomador ou Intermediário dos Serviços 
(mesma inscrição municipal). 
C, D, E 
1008 
Tomador ou Intermediário de Serviços não encontrado no Cadastro de Contribuintes 
Mobiliários -CCM. 
C, D, E 
1009 
Assinatura Digital da NFTS incorreta 
C, D, E 
1010 
Erro ao cancelar a NFTS. 
J 
1011 
Assinatura de cancelamento da NFTS incorreta. 
J 
1012 
A NFTS que se deseja cancelar não foi gerada via Web Service. 
J 
1013 
Só é permitido consultar NF-e emitidas por um único Tomador ou Intermediário dos Serviços 
(mesma inscrição municipal). 
C, D, E 
2000 
Inscrição Municipal do Tomador/Intermediário não informada. 
C, D, E 
2002 
Código de Verificação não informado. 
F 
2004 
Número da NFTS não informado. 
F, J 
2006 
NFTS não encontrada 
F, J 
2007 
Lote não informado. 
H, I 
2008 
Lote ({0}) inválido. 
H, I 
2009 
O Lote ({0}) não está vinculado ao CNPJ do Remetente. 
H, I 
2010 
Não foi possível cancelar a NFTS pois a assinatura informada ({0}) não corresponde a 
assinatura da nota. 
J 
2011 
A nota informada ({0}) já foi cancelada. 
J 
2028 
Campo ISS Retido Tomador não informado. 
C, D, E 
2029 
Para NFTS de Intermediário não há retenção para o Tomador do serviço. 
C, D, E 
2030 
Para NFTS de Tomador não há retenção para o Intermediário do serviço. 
C, D, E 
 
4.4.2. Alertas 
 
Tabela de Alertas 
 
Código 
Descrição 
Onde Ocorre 
208 
Alíquota informada (<alíquota informada no registro>) difere da alíquota vigente (<Alíquota 
cadastrada para a atividade>) para o código de serviço informado. O sistema irá adotar a 
alíquota vigente. 
C, D, E 
214 
Cidade <nome_da_cidade> não foi encontrada. Verificar se o prestador é estrangeiro. 
C, D, E 
221 
O CNPJ informado possui inscrição municipal em São Paulo, porém foi informado endereço 
de fora do município. 
C, D, E 
452 
NFTS (<numero do documento e série informados no registro>) referente a este documento 
está cancelada. Documento não será processado, pois não possui alterações. 
C, D, E 
454 
Valor dos serviços igual a R$ 0,00 (zero). 
C, D, E 
455 
Se o documento for do tipo ‘sem emissao’ e a RPS ainda não houver sido convertida pelo 
prestador. 
C, D, E

## Página 54

Manual de Utilização – Web Service NFTS       
Versão do Manual: 2.0        pág. 54 
 
 
456 
Serviços prestados com dispensa de emissão de documento fiscal por prestadores de São 
Paulo não devem ser declarados por meio da NFTS 
C, D, E 
457 
Se o documento for do tipo ‘sem emissao’ e a RPS já houver sido convertida pelo prestador. 
C, D, E 
461 
Inscrição Municipal do Prestador de Serviços consta como cancelada. 
C, D, E, F, G, H, I 
464 
Os dados de endereço informados serão substituídos pelos relacionados ao CEP informado. 
C, D, E 
471 
Alíquota informada de <alíquota>. O sistema irá adotar a alíquota de " & aliq & " prevista pela 
Lei XX.YYY/2012. 
C, D, E 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
5. Arquivos de Exemplos 
 
 
Para obter exemplos das mensagens XML para todos os pedidos e retornos, acesse: 
 
http://nfpaulistana.prefeitura.sp.gov.br/arquivos/exemplos_xml_nfts.zip 
 
6. Atualizações (Changelog) 
 
 
Manual 
versão 
Atualizado 
Data 
2.0 
• 
Inclusão dos novos campos do ISS no TpNFTS (Fase 1)  
• 
Inclusão dos campos referente à Reforma Tributária 2026, para isso foi 
criada a versão 2.0 dos XSDs. São os mesmos campos da versão anterior, 
adicionados os campos da Reforma Tributária. 
Novembro2025 
 
Anexo I 
 
 
TABELA DE MUNICÍPIOS 
 
Os campos de códigos de municípios devem ser informados com a utilização da Tabela de Municípios 
mantida pelo IBGE.
