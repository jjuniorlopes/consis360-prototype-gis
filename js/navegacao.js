/**
 * CONSIS360 — Módulo de Navegação
 * ------------------------------------------------------------------
 * Injeta o banner superior, o cabeçalho institucional e o rodapé
 * (fonte única de verdade, evita duplicar HTML em 6+ páginas).
 * Cada página só precisa ter:
 *   <script>window.CONSIS360_BASE = "" ou "../";</script>
 *   <div id="app-cabecalho"></div>   -> onde o cabeçalho entra
 *   <div id="app-rodape"></div>      -> onde o rodapé entra
 * e incluir este script + acessibilidade.js.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var BASE = window.CONSIS360_BASE || "";

  function montarBannerECabecalho() {
    return (
      '<a class="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>' +
      '<div class="banner-topo">' +
        '<div class="banner-topo__conteudo">' +
          '<a href="' + BASE + 'paginas/acessibilidade.html" class="banner-topo__link text-uppercase">Acessibilidade</a>' +
          '<div class="banner-topo__grupo" role="group" aria-label="Ajustar tamanho da fonte">' +
            '<span class="sr-only">Ajustar tamanho da fonte:</span>' +
            '<button type="button" class="banner-topo__fonte-btn" data-acao="diminuir-fonte" aria-label="Diminuir tamanho da fonte">A-</button>' +
            '<button type="button" class="banner-topo__fonte-btn" data-acao="aumentar-fonte" aria-label="Aumentar tamanho da fonte">A+</button>' +
            '<button type="button" class="banner-topo__fonte-btn" data-acao="fonte-normal" aria-label="Tamanho de fonte padrão">A</button>' +
          '</div>' +
          '<button type="button" class="banner-topo__contraste" data-acao="alternar-tema" aria-pressed="false" aria-label="Alternar alto contraste / modo escuro">' +
            '<i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>' +
          '</button>' +
          '<span class="banner-topo__separador" aria-hidden="true"></span>' +
          '<a href="' + BASE + 'paginas/acesso-informacao.html" class="text-uppercase">' + iconeInfoBanner() + ' Acesso à Informação</a>' +
          '<a href="' + BASE + 'paginas/politica-privacidade.html" class="text-uppercase">Política de Privacidade</a>' +
        '</div>' +
      '</div>' +
      '<header class="cabecalho">' +
        '<div class="container cabecalho__conteudo">' +
          '<img class="cabecalho__logo" src="' + BASE + 'assets/img/icones/logo-consis360.png" alt="Brasão da Coordenação dos Consórcios Públicos do Estado da Bahia" width="48" height="48">' +
          '<div>' +
            '<h1 class="cabecalho__titulo">' +
              'SISTEMA DE INFORMAÇÃO GEOGRÁFICAS (SIG/GIS) — CONSIS360' +
            '</h1>' +
          '</div>' +
        '</div>' +
        '<hr class="cabecalho__linha" aria-hidden="true">' +
      '</header>' +
      '<nav id="menu-principal" aria-label="Navegação principal" class="sr-only">' +
        '<a href="' + BASE + 'index.html">Página inicial</a>' +
        '<a href="' + BASE + 'paginas/mapa-multifinalitarios.html">Mapa de Consórcios Multifinalitários</a>' +
        '<a href="' + BASE + 'paginas/mapa-saude.html">Mapa de Consórcios de Saúde</a>' +
      '</nav>'
    );
  }

  function montarRodape() {
    var ano = new Date().getFullYear();
    return (
      '<footer id="rodape-principal" class="rodape">' +
        '<div class="container rodape__conteudo">' +
          '<img class="rodape__brasao" src="' + BASE + 'assets/img/icones/brasao-bahia.jpg" alt="Brasão do Estado da Bahia" width="42" height="49">' +
          '<div>' +
            '<span>© ' + ano + ' Coordenação dos Consórcios Públicos do Estado da Bahia. Todos os direitos reservados.</span>' +
            '<span class="rodape__selo">Acessível — Protótipo em conformidade com o e-MAG e WCAG 2.2 AA</span>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function iconeInfoBanner() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="vertical-align:-6px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function iconeChevronEsquerda() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function montarTrilha(textoAtual) {
    return (
      '<nav class="trilha" aria-label="Trilha de navegação">' +
        '<a class="trilha__inicio" href="' + BASE + 'index.html">Página Inicial</a>' +
        '<span class="trilha__separador" aria-hidden="true">/</span>' +
        '<span class="trilha__atual">' + textoAtual + '</span>' +
      '</nav>'
    );
  }

  function montarBotaoVoltar() {
    return (
      '<a class="botao-voltar" href="' + BASE + 'index.html">' +
        '<span class="botao-voltar__icone">' + iconeChevronEsquerda() + '</span>' +
        'Voltar' +
      '</a>'
    );
  }

  function injetar() {
    var alvoCabecalho = document.getElementById("app-cabecalho");
    if (alvoCabecalho) {
      alvoCabecalho.outerHTML = montarBannerECabecalho();
    }
    var alvoRodape = document.getElementById("app-rodape");
    if (alvoRodape) {
      alvoRodape.outerHTML = montarRodape();
    }
    var alvoTrilha = document.getElementById("app-trilha");
    if (alvoTrilha) {
      alvoTrilha.outerHTML = montarTrilha(alvoTrilha.getAttribute("data-pagina"));
    }
    var alvoBotaoVoltar = document.getElementById("app-botao-voltar");
    if (alvoBotaoVoltar) {
      alvoBotaoVoltar.outerHTML = montarBotaoVoltar();
    }
  }

  function carregarVlibras() {
    if (document.getElementById("script-vlibras")) return;
    var script = document.createElement("script");
    script.id = "script-vlibras";
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = function () {
      if (window.VLibras) {
        new window.VLibras.Widget("https://vlibras.gov.br/app");
      }
      reposicionarVlibrasNativo();
    };
    script.onerror = function () {
      console.warn("CONSIS360: não foi possível carregar o VLibras (offline ou domínio bloqueado).");
    };
    document.body.appendChild(script);
  }

  /**
   * O plugin oficial do VLibras (vlibras.gov.br/app/vlibras-plugin.js,
   * versão atual baseada em Shadow DOM) expõe referências diretas dos
   * elementos reais em window.VLibrasWidget.access (container
   * posicionado) e window.VLibrasWidget.initBtn (botão clicável).
   * Como são referências de objeto — não seletores CSS tentando furar
   * o Shadow DOM — aplicar `style` diretamente nelas funciona de forma
   * confiável, sem brigar com o <style> interno do widget.
   * Fonte: github.com/spbgovbr-vlibras/vlibras-web-browsers (LGPL-3.0),
   * src/loader/index.js.
   */
  function reposicionarVlibrasNativo() {
    var tentativas = 0;
    var maxTentativas = 60; // ~6s aguardando o widget renderizar (window.VLibrasWidget.access)

    var intervalo = setInterval(function () {
      tentativas++;
      var vw = window.VLibrasWidget;

      if (vw && vw.access) {
        clearInterval(intervalo);
        aplicarPosicaoVlibras(vw);
        window.addEventListener("resize", function () { aplicarPosicaoVlibras(vw); });

        // Defesa extra: se algo dentro do widget reescrever o style do
        // container (ex.: ao abrir o tradutor), reaplicamos a posição.
        var observador = new MutationObserver(function () {
          aplicarPosicaoVlibras(vw);
        });
        observador.observe(vw.access, { attributes: true, attributeFilter: ["style"] });
      } else if (tentativas >= maxTentativas) {
        clearInterval(intervalo);
        console.warn("CONSIS360: window.VLibrasWidget.access não apareceu a tempo para reposicionamento.");
      }
    }, 100);
  }

  function aplicarPosicaoVlibras(vw) {
    // Mede a posição real do botão de acessibilidade (que já respeita o
    // breakpoint mobile via CSS) e ancora o VLibras logo acima dele — assim
    // não duplicamos valores de breakpoint em dois lugares (CSS e JS).
    var referencia = document.querySelector(".icones-fixos");
    var gap = 8;
    var direita = 16;
    var distanciaFundo = 84;
    if (referencia) {
      var rect = referencia.getBoundingClientRect();
      direita = Math.round(window.innerWidth - rect.right);
      distanciaFundo = Math.round(window.innerHeight - rect.top + gap);
    }
    vw.access.style.setProperty("top", "auto", "important");
    vw.access.style.setProperty("bottom", distanciaFundo + "px", "important");
    vw.access.style.setProperty("right", direita + "px", "important");
    vw.access.style.setProperty("left", "auto", "important");
  }

  function iniciar() {
    injetar();
    carregarVlibras();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
