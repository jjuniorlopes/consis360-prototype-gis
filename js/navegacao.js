/**
 * CONSIS360 — Módulo de Navegação e Estrutura Semântica (eMAG / WCAG 2.2 AA)
 * ------------------------------------------------------------------
 * Injeta o cabeçalho e o rodapé seguindo exatamente o modelo Layout_pagina.png
 * e os padrões do portal ba.gov.br / SEPLAN:
 *  1. Banner superior azul (#0756B1) com Acessibilidade, A- A+ A, Alto Contraste,
 *     Acesso à Informação, Política de Privacidade e ícones sociais (Flickr, Instagram, YouTube)
 *  2. Faixa institucional branca com logo ba.gov.br (link https://www.ba.gov.br/),
 *     menu principal com efeito de hover igual ao Lumiar, e subtítulo
 *     "SEPLAN - SECRETARIA DO PLANEJAMENTO" com linha divisória azul
 *  3. Título centralizado com logo CONSIS360 + "SISTEMA DE INFORMAÇÃO GEOGRÁFICAS (SIG/GIS) — CONSIS360"
 *  4. Rodapé institucional em 3 colunas com logo "governo da gente.PNG", dados da SEPLAN,
 *     Guia rápido e linha de direitos autorais/conformidade ABNT NBR 17225:2025.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var BASE = window.CONSIS360_BASE || "";

  function paginaAtualEh(caminhoFinal) {
    var path = (window.location.pathname || "").toLowerCase();
    if (caminhoFinal === "index.html") {
      return path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("\\index.html");
    }
    return path.endsWith(caminhoFinal.toLowerCase());
  }

  function attrCorrente(caminhoFinal) {
    return paginaAtualEh(caminhoFinal) ? ' aria-current="page"' : "";
  }

  function montarBannerECabecalho() {
    return (
      '<a class="skip-link" href="#conteudo-principal">Pular para o conteúdo principal (Alt + 1)</a>' +
      '<div class="banner-topo top-header" role="region" aria-label="Barra de acessibilidade e redes sociais">' +
        '<div class="container banner-topo__conteudo">' +
          '<div class="banner-topo__esquerda">' +
            '<a href="' + BASE + 'paginas/acessibilidade.html" accesskey="4" class="banner-topo__link text-resize__label text-uppercase"' + attrCorrente("acessibilidade.html") + '>Acessibilidade</a>' +
            '<div class="banner-topo__grupo" role="group" aria-label="Ajustar tamanho da fonte">' +
              '<span class="sr-only">Ajustar tamanho da fonte:</span>' +
              '<button type="button" class="changer text-resize__icon text-decoration-none px-1 banner-topo__fonte-btn" data-acao="diminuir-fonte" aria-label="Diminuir tamanho da fonte">' +
                '<i class="fa-solid fa-a" aria-hidden="true"></i><sup>-</sup>' +
              '</button>' +
              '<button type="button" class="changer text-resize__icon text-decoration-none px-1 banner-topo__fonte-btn" data-acao="aumentar-fonte" aria-label="Aumentar tamanho da fonte">' +
                '<i class="fa-solid fa-a" aria-hidden="true"></i><sup>+</sup>' +
              '</button>' +
              '<button type="button" class="changer text-resize__icon text-decoration-none px-1 banner-topo__fonte-btn" data-acao="fonte-normal" aria-label="Tamanho de fonte padrão">' +
                '<i class="fa-solid fa-a" aria-hidden="true"></i>' +
              '</button>' +
            '</div>' +
            '<button type="button" class="banner-topo__contraste" accesskey="5" data-acao="alto-contraste" aria-pressed="false" aria-label="Alternar alto contraste (Alt + 5)">' +
              '<i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>' +
            '</button>' +
            '<a href="' + BASE + 'paginas/acesso-informacao.html" class="acesso-informacao__item text-uppercase"' + attrCorrente("acesso-informacao.html") + '>' + iconeInfoBanner() + ' <span>Acesso à Informação</span></a>' +
            '<a href="' + BASE + 'paginas/politica-privacidade.html" class="politica-privacidade__item_description text-uppercase"' + attrCorrente("politica-privacidade.html") + '>Política de Privacidade</a>' +
          '</div>' +
          '<div class="block-social-network" aria-label="Redes sociais da SEPLAN Bahia">' +
            '<a class="icon-social-network" href="https://www.flickr.com/photos/163559352@N07/" target="_blank" rel="noopener noreferrer" aria-label="Flickr da SEPLAN Bahia">' +
              '<i class="fa-brands fa-flickr" aria-hidden="true"></i>' +
            '</a>' +
            '<a class="icon-social-network" href="https://www.instagram.com/seplanbahia/" target="_blank" rel="noopener noreferrer" aria-label="Instagram da SEPLAN Bahia">' +
              '<i class="fa-brands fa-instagram" aria-hidden="true"></i>' +
            '</a>' +
            '<a class="icon-social-network" href="https://www.youtube.com/@seplanbahia" target="_blank" rel="noopener noreferrer" aria-label="YouTube da SEPLAN Bahia">' +
              '<i class="fa-brands fa-youtube" aria-hidden="true"></i>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cabecalho-gov">' +
        '<div class="container cabecalho-gov__container">' +
          '<div class="cabecalho-gov__topo">' +
            '<a class="cabecalho-gov__marca" href="https://www.ba.gov.br/" target="_blank" rel="noopener noreferrer" aria-label="ba.gov.br - Plataforma de serviços e informações do Estado da Bahia">' +
              '<img class="cabecalho-gov__logo-ba" src="' + BASE + 'assets/img/icones/ba_gov.png" alt="ba.gov.br - Plataforma de serviços e informações do Estado da Bahia">' +
            '</a>' +
            '<nav id="menu-principal" class="barra-menu" aria-label="Navegação principal">' +
              '<ul class="barra-menu__lista">' +
                '<li><a class="barra-menu__link text-uppercase" href="' + BASE + 'index.html"' + attrCorrente("index.html") + '>Página Inicial</a></li>' +
                '<li><a class="barra-menu__link text-uppercase" href="' + BASE + 'paginas/mapa-multifinalitarios.html"' + attrCorrente("mapa-multifinalitarios.html") + '>Consórcios Multifinalitários</a></li>' +
                '<li><a class="barra-menu__link text-uppercase" href="' + BASE + 'paginas/mapa-saude.html"' + attrCorrente("mapa-saude.html") + '>Consórcios de Saúde</a></li>' +
              '</ul>' +
            '</nav>' +
          '</div>' +
          '<div class="cabecalho-gov__orgao text-uppercase">SEPLAN - SECRETARIA DO PLANEJAMENTO</div>' +
          '<hr class="cabecalho-gov__linha" aria-hidden="true">' +
          '<div id="app-trilha-cabecalho"></div>' +
        '</div>' +
      '</div>' +
      '<header class="cabecalho">' +
        '<div class="container cabecalho__conteudo">' +
          '<img class="cabecalho__logo" src="' + BASE + 'assets/img/icones/logo-consis360.png" alt="Brasão da Coordenação dos Consórcios Públicos do Estado da Bahia" width="44" height="44">' +
          '<div>' +
            '<h1 class="cabecalho__titulo">' +
              'SISTEMA DE INFORMAÇÃO GEOGRÁFICAS (SIG/GIS) — CONSIS360' +
            '</h1>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function montarRodape() {
    var ano = new Date().getFullYear();
    return (
      '<footer id="rodape-principal" class="rodape" tabindex="-1">' +
        '<div class="rodape__faixa-azul" aria-hidden="true"></div>' +
        '<div class="container rodape__principal">' +
          '<div class="rodape__grade">' +
            '<div class="rodape__coluna-logo">' +
              '<a href="https://www.ba.gov.br/" target="_blank" rel="noopener noreferrer" aria-label="Portal Oficial do Governo do Estado da Bahia">' +
                '<img class="rodape__logo-governo" src="' + BASE + 'assets/img/icones/governo_da_gente.png" alt="Governo da Bahia — Do Lado da Gente">' +
              '</a>' +
            '</div>' +
            '<div class="rodape__coluna">' +
              '<h2 class="rodape__coluna-titulo">Estado da Bahia</h2>' +
              '<p class="rodape__orgao"><strong>SEPLAN - Secretaria do Planejamento</strong></p>' +
              '<p class="rodape__texto">2ª Avenida, nº 250, CAB, Salvador, BA,<br>CEP: 41745-003.</p>' +
              '<hr class="rodape__divisor" aria-hidden="true">' +
              '<p class="rodape__texto">Horário de funcionamento:<br>Segunda a sexta, das 8h30 às 12h e das 13h30 às 18h</p>' +
              '<p class="rodape__texto rodape__ouvidoria">Exerça sua cidadania. <a href="https://www.ba.gov.br/ouvidoria" target="_blank" rel="noopener noreferrer">Fale com a Ouvidoria Geral do Estado</a>.</p>' +
            '</div>' +
            '<div class="rodape__coluna">' +
              '<h2 class="rodape__coluna-titulo">Guia rápido</h2>' +
              '<ul class="rodape__guia-lista">' +
                '<li><a href="https://www.ba.gov.br/seplan" target="_blank" rel="noopener noreferrer" class="text-uppercase">CONTATO</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
          '<div class="rodape__direitos">' +
            '<span>© ' + ano + ' Coordenação dos Consórcios Públicos do Estado da Bahia. Todos os direitos reservados. Acessível — Em conformidade com a ABNT NBR 17225:2025 (WCAG 2.2 AA) e e-MAG</span>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  function iconeInfoBanner() {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function iconeChevronEsquerda() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function montarTrilha(textoAtual, incluirBotaoVoltar) {
    return (
      '<div class="barra-trilha">' +
        (incluirBotaoVoltar ? montarBotaoVoltar() : '') +
        '<nav class="trilha" aria-label="Trilha de navegação (Breadcrumb)">' +
          '<a class="trilha__inicio" href="' + BASE + 'index.html">Página Inicial</a>' +
          '<span class="trilha__separador" aria-hidden="true">/</span>' +
          '<span class="trilha__atual" aria-current="page">' + textoAtual + '</span>' +
        '</nav>' +
      '</div>'
    );
  }

  function montarBotaoVoltar() {
    return (
      '<a class="botao-voltar" href="' + BASE + 'index.html">' +
        '<span class="botao-voltar__icone">' + iconeChevronEsquerda() + '</span>' +
        '<span class="botao-voltar__texto">Voltar</span>' +
      '</a>'
    );
  }

  function injetar() {
    var alvoTrilha = document.getElementById("app-trilha");
    var alvoBotaoVoltar = document.getElementById("app-botao-voltar");
    var paginaTrilha = alvoTrilha ? alvoTrilha.getAttribute("data-pagina") : "";
    var temBotaoVoltar = Boolean(alvoBotaoVoltar);

    var alvoCabecalho = document.getElementById("app-cabecalho");
    if (alvoCabecalho) {
      alvoCabecalho.outerHTML = montarBannerECabecalho();
    }
    var alvoRodape = document.getElementById("app-rodape");
    if (alvoRodape) {
      alvoRodape.outerHTML = montarRodape();
    }

    var slotTrilhaCabecalho = document.getElementById("app-trilha-cabecalho");
    if (paginaTrilha && slotTrilhaCabecalho) {
      slotTrilhaCabecalho.outerHTML = montarTrilha(paginaTrilha, true);
      if (alvoTrilha && alvoTrilha.parentNode) {
        var paiTrilha = alvoTrilha.parentNode;
        paiTrilha.removeChild(alvoTrilha);
        if (paiTrilha.children && paiTrilha.children.length === 0 && paiTrilha.classList && paiTrilha.classList.contains("container")) {
          if (paiTrilha.parentNode) paiTrilha.parentNode.removeChild(paiTrilha);
        }
      }
      if (alvoBotaoVoltar && alvoBotaoVoltar.parentNode) {
        alvoBotaoVoltar.parentNode.removeChild(alvoBotaoVoltar);
      }
    } else {
      if (slotTrilhaCabecalho && slotTrilhaCabecalho.parentNode) {
        slotTrilhaCabecalho.parentNode.removeChild(slotTrilhaCabecalho);
      }
      if (alvoTrilha) {
        alvoTrilha.outerHTML = montarTrilha(paginaTrilha, false);
      }
      if (alvoBotaoVoltar) {
        alvoBotaoVoltar.outerHTML = montarBotaoVoltar();
      }
    }

    if (window.Consis360Acessibilidade && window.Consis360Acessibilidade.sincronizarUI) {
      window.Consis360Acessibilidade.sincronizarUI();
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

  function reposicionarVlibrasNativo() {
    var tentativas = 0;
    var maxTentativas = 60;

    var intervalo = setInterval(function () {
      tentativas++;
      var vw = window.VLibrasWidget;

      if (vw && vw.access) {
        clearInterval(intervalo);
        aplicarPosicaoVlibras(vw);
        window.addEventListener("resize", function () { aplicarPosicaoVlibras(vw); });

        var observador = new MutationObserver(function () {
          aplicarPosicaoVlibras(vw);
        });
        observador.observe(vw.access, { attributes: true, attributeFilter: ["style"] });
        observador.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-painel-acessibilidade-aberto"]
        });
      } else if (tentativas >= maxTentativas) {
        clearInterval(intervalo);
      }
    }, 100);
  }

  function aplicarPosicaoVlibras(vw) {
    if (!vw || !vw.access) return;
    var referencia = document.querySelector(".icone-fixo--acessibilidade") || document.querySelector(".icones-fixos");
    var gap = 18;
    var larguraVlibras = 40;
    var direita = 16;
    var distanciaFundo = Math.round(window.innerHeight * 0.5 + 10);

    if (referencia) {
      var rect = referencia.getBoundingClientRect();
      var centroOffset = Math.max(0, Math.round((rect.width - larguraVlibras) / 2));
      direita = Math.max(8, Math.round(window.innerWidth - rect.right + centroOffset));
      distanciaFundo = Math.round(window.innerHeight - rect.top + gap);
    }

    var painelAberto = document.documentElement.getAttribute("data-painel-acessibilidade-aberto") === "true";

    vw.access.style.setProperty("top", "auto", "important");
    vw.access.style.setProperty("bottom", distanciaFundo + "px", "important");
    vw.access.style.setProperty("right", direita + "px", "important");
    vw.access.style.setProperty("left", "auto", "important");
    vw.access.style.setProperty("opacity", painelAberto ? "0" : "1", "important");
    vw.access.style.setProperty("pointer-events", painelAberto ? "none" : "auto", "important");
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
