# CONSIS360 — Protótipo SIG/GIS (Consórcios Multifinalitários e Saúde)

Protótipo estático (HTML5 + CSS + JavaScript puro, sem backend) do Sistema de
Informação Geográficas do CONSIS360, com dois mapas interativos:

- **Consórcios Públicos Multifinalitários** (29 consórcios)
- **Consórcios Públicos Interfederativos de Saúde** (24 regiões)

## Estrutura de pastas

```
consis360-prototype/
├── index.html                     # Página inicial (cards de navegação)
├── paginas/
│   ├── acessibilidade.html        # Texto e-MAG (modelo_referencia)
│   ├── acesso-informacao.html     # Lei de Acesso à Informação (LAI)
│   ├── politica-privacidade.html  # Política de Privacidade / LGPD
│   ├── mapa-multifinalitarios.html
│   └── mapa-saude.html
├── css/
│   ├── variaveis.css       # Tokens de cor/tipografia + tema escuro
│   ├── base.css            # Reset e tipografia base
│   ├── layout.css          # Banner, cabeçalho, hero, rodapé
│   ├── componentes.css     # Cards, botões, modal, estatísticas
│   ├── acessibilidade.css  # Ícones fixos + painel flutuante
│   └── mapas.css           # Layout das páginas de mapa + Leaflet
├── js/
│   ├── utils.js             # Formatação de número/área, escape HTML
│   ├── acessibilidade.js    # Fonte, contraste, painel, atalhos Alt+1..6
│   ├── navegacao.js         # Injeta banner/cabeçalho/rodapé + VLibras
│   ├── mapa-consorcios.js   # Motor Leaflet (modal central) — usado só pela página de Saúde
│   └── mapa-consorcios-v2.js # Motor Leaflet (painel lateral) — usado só pela página de Multifinalitários
├── data/
│   ├── consorcios_saude.json
│   ├── consorcios_multifinalitarios.json
│   ├── municipios_saude.geojson
│   └── municipios_multifinalitarios.geojson
└── assets/img/
    ├── icones/         # Logo institucional
    ├── logos-saude/    # 24 logomarcas dos consórcios de saúde
    └── logos-multi/    # 29 logomarcas dos consórcios multifinalitários
```

## Como testar no VS Code

Os dados são carregados via `fetch()`, que o navegador **bloqueia por CORS**
se você abrir o `index.html` direto pelo sistema de arquivos (`file://`).
Use um servidor local:

- **VS Code:** instale a extensão "Live Server" e clique em "Go Live" com o
  `index.html` aberto; ou
- **Terminal:**
  ```bash
  cd consis360-prototype
  python3 -m http.server 8000
  # depois abra http://localhost:8000
  ```

## Deploy no GitHub Pages

1. Suba a pasta `consis360-prototype/` para um repositório no GitHub.
2. Em *Settings → Pages*, selecione a branch (ex.: `main`) e a pasta raiz.
3. O site fica disponível em `https://<usuario>.github.io/<repositorio>/`.

Não é necessário nenhum passo de build — é HTML/CSS/JS puro.

## VLibras — como o posicionamento foi resolvido

A versão atual do widget oficial (`vlibras.gov.br/app/vlibras-plugin.js`,
fonte em `github.com/spbgovbr-vlibras/vlibras-web-browsers`, LGPL-3.0) monta
tudo dentro de um **Shadow DOM** (`wrapper.attachShadow({ mode: "open" })`),
com posição fixa vertical-centralizada por padrão (`top: calc(50vh - 20px)`).
CSS externo não alcança o conteúdo de um Shadow DOM, então **não é possível**
reposicionar o botão via seletor CSS comum, mesmo com `!important`.

A solução usada aqui: o próprio script expõe referências diretas em
`window.VLibrasWidget.access` (container posicionado) e `.initBtn` (botão
clicável) — como são referências de objeto, não seletores, aplicar `style`
nelas funciona de forma confiável. Ver `reposicionarVlibrasNativo()` e
`aplicarPosicaoVlibras()` em `js/navegacao.js`: eles esperam o widget
renderizar, medem a posição real do botão de acessibilidade
(`.icones-fixos`) via `getBoundingClientRect()` e ancoram o VLibras 8px
acima dele — sem duplicar valores de breakpoint entre CSS e JS.

Se uma atualização futura do VLibras mudar essa API interna
(`window.VLibrasWidget`), o reposicionamento para de funcionar
silenciosamente (o ícone volta a aparecer no centro vertical da tela, mas o
resto do site continua funcionando normalmente — é só um ajuste visual).

## Bibliotecas externas (via CDN, sem chave paga)

- **Leaflet 1.9.4** — mapa interativo (`unpkg.com/leaflet@1.9.4`)
- **OpenStreetMap** — camada de tiles (mapa-base)
- **VLibras** — widget oficial `vlibras.gov.br/app/vlibras-plugin.js`

Se o ambiente de desenvolvimento estiver offline, o mapa e o VLibras não
carregam (o restante do site funciona normalmente).

## Origem dos dados geográficos

Os polígonos dos 417 municípios da Bahia vêm da malha municipal pública
do IBGE (via repositório `tbrugz/geodata-br`), cruzada pelo **Código IBGE**
com as planilhas `CONSORCIOS_MULTIFINALITARIOS_BA.xlsx` e
`RELAÇÃO_DE_CONSORCIOS_DE_SAUDE_v2.xlsx`. Os SVGs vetorizados enviados
(mapchart.net) não têm identificador por município no `<path>`, por isso
foram usados apenas como referência visual de cores/legendas, e não como
mapa interativo em si — a malha do IBGE permite clique/hover por município
real, o que os SVGs não permitiam.

## Notas sobre os dados-fonte (não alterei nenhum valor, só documento aqui)

- **Multifinalitários, linha "Senhor do Bonfim" (ID 27 / CDS Itapicuru):**
  a planilha traz `Nome Arquivo = 28-CDS Irecê.PNG` nessa única linha,
  destoando das outras 9 linhas do mesmo consórcio (`27-CDS Itapicuru.PNG`).
  O ETL usa o valor mais frequente do grupo (moda), então o consórcio 27
  carrega a logo `27-CDS Itapicuru`. Vale confirmar na fonte.
- **20 municípios pertencem a dois consórcios multifinalitários ao mesmo
  tempo** (ex.: Bom Jesus da Serra está em CISUDOESTE e CIVALERG). O mapa
  usa a cor do primeiro consórcio cadastrado para pintar o polígono, mas ao
  clicar nesses municípios o usuário vê as duas opções e escolhe qual ficha
  técnica abrir.
- **Saúde:** Salvador aparece sem cor no mapa (`Sem região`, conforme a
  própria planilha/arquivo de cores) — não há consórcio de saúde atribuído
  à capital nesta base.

## Acessibilidade implementada

- Banner superior com A-, A+, A e alto contraste em todas as páginas.
- Painel flutuante (ícone de acessibilidade universal): fonte, espaçamento
  de letras/linhas, fonte para dislexia, modo escuro, restaurar padrão.
- Atalhos de teclado Alt+1 (conteúdo), Alt+2 (menu), Alt+3 (rodapé),
  Alt+4 (página de acessibilidade), Alt+5 (contraste), Alt+6 (VLibras).
- `skip-link`, `aria-live` para feedback de leitor de tela, foco visível
  em todos os elementos interativos.
- A lista lateral de regiões nas páginas de mapa é a **alternativa
  totalmente navegável por teclado/leitor de tela** ao mapa visual
  (mapas Leaflet têm suporte limitado a leitor de tela por natureza).

## Pendências para uma versão de produção

- Confirmar com a fonte oficial a divergência de logo do ID 27 citada acima.
- Avaliar hospedar o VLibras, o Leaflet e a fonte Poppins localmente
  (`assets/lib/`, `assets/fonts/`) caso o ambiente de produção não tenha
  acesso à internet externa.

## Padronização visual com ba.gov.br/seplan

A tipografia (Poppins, via Google Fonts CDN), cores e tamanhos dos títulos,
banner e páginas de Acessibilidade/LAI/Política de Privacidade foram
ajustados para bater com os valores reais fornecidos (computados via
DevTools) do padrão ba.gov.br. Três decisões conscientes que fogem do
literal, com o motivo:

- **Título do cabeçalho continua `<h1>`, não `<h2>`** como no exemplo dado.
  No ba.gov.br aquele heading não é o título principal semântico da página
  (há outro H1 em outro ponto da página deles); aqui ele é o único heading
  de nível 1 do site, e rebaixar pra H2 quebraria a hierarquia de
  cabeçalhos pra quem navega com leitor de tela. Mantive a aparência visual
  idêntica (cor, fonte, tamanho, uppercase), só a tag semântica ficou H1.
- **Botões A-/A+/A continuam texto simples**, não ícones Font Awesome como
  no original. Replicar os ícones exigiria carregar a fonte Font Awesome 6
  e adivinhar os códigos Unicode de área privada exatos que eles usam — não
  tinha como confirmar isso sem inventar dado, e texto simples continua
  sendo mais direto pra leitor de tela de qualquer forma.
- **Página da Lei de Acesso à Informação usa estilo próprio** (texto
  alinhado à esquerda, cinza rgb(87,87,87)) diferente de
  Acessibilidade/Política de Privacidade (justificado, rgb(83,83,83)) —
  isso reflete fielmente os dois conjuntos de valores que vieram do
  DevTools (a LAI real fica em `comunicacao.ba.gov.br`, subdomínio
  diferente do `seplan.ba.gov.br`, com template próprio).

Textos que viraram maiúsculo visualmente (ex.: "Acessibilidade" no banner)
usam `text-transform: uppercase` via CSS, não maiúscula digitada no HTML —
assim o leitor de tela continua lendo a palavra normalmente, e o texto-fonte
fica reutilizável (ex.: o mesmo texto normal aparece com case natural no
`<h1>` da página, só o link do banner usa a versão visualmente maiúscula).

## Atualização de dados — Multifinalitários v2 (30 consórcios, layout com painel lateral)

A página de Mapa de Consórcios Multifinalitários foi atualizada com uma nova
leva de dados e um layout novo (só esta página — a de Saúde continua com o
layout e dados antigos até receber sua própria atualização). Pontos que
valem documentar:

- **Fonte agora é uma única aba** ("Multifinalitários", 436 linhas,
  30 consórcios) — não existe mais a aba separada "Resumo dos Consórcios";
  e-mail/CNPJ/site já vêm na aba principal.
- **População e área agora são por município**, não mais um total repetido
  por região. Os totais de "População atendida" e "Área total" de cada
  consórcio são somados a partir dos municípios que o compõem.
- **A coluna "Área Total (km²)" da planilha principal está incorreta** para
  vários municípios (ex.: Alcobaça aparecia com 465 km², o valor oficial do
  IBGE é 1.477 km²). A área usada no site vem de `area_total_ibge.xlsx`
  (base oficial do IBGE, cobertura 100% confirmada), cruzada por Código IBGE.
- **Cores dos municípios agora vêm do `color_consorcios_multifinalitarios.csv`**
  (417 municípios, incluindo os 26 com dupla filiação e suas cores
  combinadas específicas) em vez de uma paleta genérica gerada por índice.
  Only exceção: o consórcio CIIDSCV não tem nenhum município "solo" no CSV
  (todos os municípios dele são de dupla filiação) — recebeu uma cor própria
  (`#57d0c8`) só para uso em legendas/ficha técnica, já que no mapa ele
  nunca aparece como área de cor única.
- **Nomes de consórcio divergem entre planilha e CSV de cores** em 6 casos
  (ex.: "CONSTESF" vs "CONSTESF Vale do São Francisco") e 4 nomes de
  município têm grafia diferente entre a malha do IBGE e o CSV (ex.:
  "Xique-Xique" vs "Xique Xique", "Santa Teresinha" vs "Santa Terezinha") —
  todos resolvidos por um mapa de equivalência explícito no script de ETL,
  documentado no próprio código-fonte usado para gerar os JSON/GeoJSON.
- **Logos**: o arquivo `IMAGENS.zip` enviado era, na verdade, um RAR (não um
  ZIP — precisei instalar `unrar` pra extrair). A extração corrompeu os
  acentos de vários nomes de arquivo (ex.: "13-CDS Irec" em vez de
  "13-CDS Irecê.PNG"), então o mapeamento logo↔consórcio foi feito pelo
  **número sequencial no início do nome do arquivo** (que bate com o campo
  ID), não pelo texto do nome (que também tinha 2 erros de digitação na
  coluna "Nome Arquivo" da planilha, nos IDs 2 e 19).
- **Painel lateral em vez de modal**: nesta página, a ficha técnica do
  consórcio abre numa 3ª coluna fixa ao lado do mapa (`js/mapa-consorcios-v2.js`),
  nunca sobrepondo o mapa. Ao selecionar uma região, as demais ficam com
  opacidade baixa (esmaecidas) e o mapa dá zoom na região selecionada.
- **Hover agora mostra dados do município** (nome do consórcio, nome do
  município, população e área daquele município específico) — não mais o
  total da região, que só aparece na ficha técnica completa (clique).
- **Pino da cidade-sede**: aparece no mapa apenas quando uma região está
  selecionada, marcando o município-sede daquele consórcio (ícone
  `assets/img/icones/pino-cidade-sede.png`, 22×29px). Não fica visível o
  tempo todo pra não poluir a visão geral do mapa — essa é uma decisão de
  design minha, já que a instrução não especificava se deveria aparecer
  sempre ou só ao selecionar.
- **Cards de estatística**: "Consórcios cadastrados" é sempre o total do
  estado (30); "Municípios conveniados" e "População atendida" mostram o
  total da região sob o mouse ou selecionada, voltando ao total geral
  quando nada está em foco.


## Rodada de correções — população oficial, geometria e comportamento do mapa

- **População da planilha estava desalinhada/incoerente.** Ex.: Barreiras
  aparecia com 10.187 habitantes (o real, censo IBGE 2022, é 166.147); Abaíra
  aparecia com 29.185 (real: 7.675). Substituí a coluna "População" inteira
  por dados do **Censo IBGE 2022**, via `github.com/lsbastos/popBR_mun`
  (código de município truncado em 6 dígitos — casei pelos 6 primeiros
  dígitos do código IBGE de 7 dígitos que já uso). Cobertura: 417/417.
- **Discrepância não resolvida, sinalizando pra você**: mesmo com a
  população oficial corrigida, o total do CONSID ficou em ~689.684, bem
  acima dos 177.937 que você mencionou como esperado. Não achei fonte
  pública que confirme 177.937, e os 23 municípios do CONSID na planilha
  não têm duplicata. Se o valor esperado exclui algum município específico
  (ex.: a sede) ou vem de outra definição de "população atendida", me diga
  qual e eu ajusto — não force o número sem uma fonte, então por ora ficou
  a soma real dos 23 municípios com dado do censo.
- **Geometria de Ibiquera/Caravelas**: a simplificação do mapa (mesmo a 1%)
  reportava "Repaired 5 intersections" — sinal de que a malha original do
  IBGE (`geojs-29-mun.json`) já tinha pequenos defeitos de topologia que o
  mapshaper corrige ao processar. Removi a simplificação por completo (uso
  a geometria original, só reduzindo a precisão decimal) para eliminar
  qualquer distorção de forma introduzida por esse processo — o arquivo
  ainda assim ficou com 884 KB, tamanho aceitável.
- **"Municípios conveniados" no card geral agora conta município único** —
  antes somava município × consórcios em que aparece, inflando o total
  quando havia dupla filiação. Agora deduplica por código IBGE.
- **Tooltip de dupla filiação**: título agora mostra os dois nomes de
  consórcio juntos (ex.: "CDS Velho Chico e CDSBP Bacia do Paramirim"), e a
  nota abaixo dos dados foi simplificada para "Também conveniado com outro
  consórcio."
- **Botão "Ver mapa geral (todos)"** adicionado no topo da lista lateral,
  pra voltar à visão padrão (todas as cores, sem seleção) a qualquer momento
  — antes só dava pra resetar limpando a busca ou fechando o painel de
  detalhe.


## Correção de geometria — Caravelas (buraco branco no mapa)

A malha original do IBGE (`geojs-29-mun.json`) codifica Caravelas como um
único `Polygon` com 8 anéis, mas só o **último** anel (140 pontos) é o
corpo principal do município — os outros 7 (5 a 10 pontos cada) são ilhas
costeiras próximas (região dos Abrolhos), erroneamente representadas como
"buracos" desse Polygon em vez de polígonos separados de um MultiPolygon.
Qualquer processo que leia só o primeiro anel (inclusive o meu ETL
anterior) pega uma ilhota de 7 pontos em vez do município real — daí o
"buraco branco" no mapa. Corrigido: detecto anéis cuja caixa delimitadora
não está contida no anel principal e os promovo a polígonos independentes
de um MultiPolygon (mantendo qualquer anel genuinamente interno como
buraco de verdade). Rodei essa checagem nos 417 municípios: só Caravelas
tinha esse problema.

## Painel de detalhe sem abrir ao clicar

Não consegui reproduzir isso lendo o código (a função que monta a ficha
técnica não tem nenhum acesso a propriedade que devesse falhar com os
dados atuais). Adicionei tratamento de erro (`try/catch`) em volta da
montagem do painel: se algo quebrar, agora aparece uma mensagem no lugar
do placeholder genérico *e* o erro real vai para o console do navegador
(F12 → Console) — se o problema persistir, essa mensagem/console vai dizer
exatamente onde travou.


## Rodada — filtro ATIVO=S, exportação PDF/XLS, renomeações

- **Filtro de consórcios ativos**: a planilha agora tem a coluna `ATIVO`
  (por linha de município, não por consórcio). Apenas linhas `ATIVO = "S"`
  entram no site. O SOMAR (ID 15) tinha as 3 linhas com `ATIVO = "N"` — foi
  excluído por completo (0 linhas ativas). "Consórcios cadastrados" caiu de
  30 para **29** automaticamente, já que o card reflete `regioes.length`
  após o filtro.
- **Bug de interpretação de label corrigido**: "CDS Litoral Norte e Agreste
  Baiano" é o nome de UM consórcio (o "e" faz parte do nome), mas minha
  lógica antiga de detectar dupla filiação (split por `" e "`) confundia
  isso com dois consórcios diferentes. Corrigido: agora primeiro verifico
  se o rótulo inteiro já bate com um nome de consórcio conhecido antes de
  tentar dividir.
- **Área dos municípios "Sem Consórcio"**: não tinha o arquivo de área
  oficial do IBGE desta vez (sessão nova). Para os 17 municípios sem área
  em cache, calculei a área geodésica diretamente da geometria (projeção
  equirretangular escalada pela latitude) — conferi contra valores reais
  conhecidos (Salvador: 709,72 km² calculado vs 693 km² oficial, ~2% de
  diferença; Camaçari: 787,02 km² calculado vs ~785 km² oficial, quase
  exato). Documentando essa aproximação para transparência.
- **Ibiquera**: não tem o mesmo problema de anéis múltiplos que Caravelas
  tinha (só 1 anel, 18 pontos). O contorno de baixa resolução parece ser
  uma limitação da fonte gratuita que uso (`geojs-29-mun.json`,
  `tbrugz/geodata-br`) — não encontrei uma fonte alternativa com licença
  aberta e melhor resolução. Se você tiver acesso a um shapefile oficial
  do IBGE para este município eu reprocesso.
- **Textos renomeados** em todas as páginas de mapa: "Municípios
  conveniados" → "Municípios consorciados"; "População atendida" →
  "População beneficiada".
- **Clique em município sem consórcio**: agora mostra "Esta cidade não
  está vinculada a nenhum consórcio." — no painel lateral (Multifinalitários)
  ou no modal (Saúde), ao lado/sobre o mapa, como pedido.
- **Exportação PDF**: desenhado num `<canvas>` a partir do próprio GeoJSON
  (projeção equirretangular simples), não é uma captura de tela do mapa —
  capturar o Leaflet ao vivo quebra por CORS (as imagens de tile do
  OpenStreetMap não liberam `Access-Control-Allow-Origin`, o que
  "contaminaria" o canvas e impediria exportar). O PDF inclui título, mapa
  colorido e legenda (cor + nome de cada consórcio/região). Bibliotecas:
  jsPDF 2.5.2 e SheetJS (xlsx) 0.18.5, carregadas sob demanda via CDN
  (`cdnjs.cloudflare.com`) só quando o botão é clicado.
- **Exportação XLS**: uma linha por município, com os dados do consórcio
  repetidos nas colunas correspondentes — disponível nas duas páginas de
  mapa (Multifinalitários e Saúde).

## Rodada 9 — correções de exportação
- **PDF/XLS**: jsPDF 2.5.2 e SheetJS 0.18.5 agora ficam em `assets/lib/` (sem depender de CDN; cdnjs é só plano B). A mensagem de erro passa a mostrar o detalhe técnico real.
- **XLS**: 29 consórcios distintos com IDs sequenciais 1..29 (SOMAR fora); municípios sem consórcio recebem ID 30 (último ID + 1), "Consórcio" = SEM CONSÓRCIO, campos do consórcio em branco e população/área preenchidas com os dados do município.
- Cache-busting: `?v=20261009-8`.

## Rodada 10 — mapa de Saúde v2, pinos e banner
- **Saúde**: `paginas/mapa-saude.html` agora usa o motor `js/mapa-consorcios-v2.js` (mesmo layout de Multifinalitários: lista | mapa | painel). O antigo `js/mapa-consorcios.js` não é mais usado.
- **Dados**: `data/consorcios_saude.json` e `data/municipios_saude.geojson` regenerados a partir de `RELAÇÃO_DE_CONSORCIOS_DE_SAUDE_v2.xlsx` (24 consórcios, 416 municípios; Salvador sem consórcio) e `Cor_Municipos_Saude.txt` (cores). A malha (com Caravelas corrigida) é a mesma de Multifinalitários.
- **População/área**: soma por município (mesma base do mapa Multifinalitários), não o valor da planilha.
- **Pino**: `assets/img/icones/pino-hospital-saude.png` (fundo transparente) marca a cidade em "Município Sede".
- **Pinos sede (Multi)**: a sede é localizada por código IBGE (`sedeIbge`) e, na falta, por nome normalizado — corrige CIMA (Camacã/Camacan) e CIIDSCV (Boquira com espaços sobrando).
- **Banner**: novo `assets/img/banner/banner-consorcios-bahia.jpg` (1844×582).
- Logos de Saúde atualizados do `IMAGENS.zip`. Cache-busting `?v=20261010-9`.
- Pendência de dados: CDS Velho Chico (Multi) tem sede "Salvador", que não é município do consórcio — por isso não exibe pino.
