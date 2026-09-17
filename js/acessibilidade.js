/**
 * CONSIS360 — Módulo de Acessibilidade
 * ------------------------------------------------------------------
 * Responsável por:
 *  - Botões do banner superior (A-, A, A+, alto contraste)
 *  - Painel flutuante de acessibilidade (ícone universal):
 *      diminuir fonte, aumentar fonte, espaçamento de letras,
 *      espaçamento de linhas, fonte padrão, fonte para dislexia,
 *      modo escuro, e "voltar ao padrão"
 *  - Atalhos de teclado (Alt+1 a Alt+6), seguindo o e-MAG
 *  - Persistência das preferências em localStorage
 *
 * Este arquivo é carregado em TODAS as páginas do protótipo.
 * Não depende de nenhuma outra lib.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var CHAVE_ARMAZENAMENTO = "consis360:acessibilidade";
  var ESCALA_MIN = 0.85;
  var ESCALA_MAX = 1.5;
  var ESCALA_PASSO = 0.1;

  var estadoPadrao = {
    escalaFonte: 1,
    tema: "claro",
    fonte: "padrao",
    espacoLetras: false,
    espacoLinhas: false
  };

  var estado = carregarEstado();

  function carregarEstado() {
    try {
      var salvo = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (salvo) {
        return Object.assign({}, estadoPadrao, JSON.parse(salvo));
      }
    } catch (erro) {
      // localStorage indisponível (modo privado, etc.) — segue com padrão
    }
    return Object.assign({}, estadoPadrao);
  }

  function salvarEstado() {
    try {
      window.localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    } catch (erro) {
      /* silenciosamente ignora — não é crítico para o funcionamento */
    }
  }

  function aplicarEstado() {
    var raiz = document.documentElement;
    raiz.style.setProperty("--fonte-escala", estado.escalaFonte.toFixed(2));
    raiz.setAttribute("data-tema", estado.tema);
    raiz.setAttribute("data-fonte", estado.fonte);
    raiz.setAttribute("data-espaco-letras", estado.espacoLetras ? "ativo" : "inativo");
    raiz.setAttribute("data-espaco-linhas", estado.espacoLinhas ? "ativo" : "inativo");
    atualizarIndicadoresVisuais();
  }

  function atualizarIndicadoresVisuais() {
    // Botão de contraste no banner
    var btnContraste = document.querySelector("[data-acao='alternar-tema']");
    if (btnContraste) {
      btnContraste.setAttribute("aria-pressed", estado.tema === "escuro" ? "true" : "false");
    }
    // Itens do painel flutuante
    var mapaAcoesBooleanas = {
      "fonte-dislexia": estado.fonte === "dislexia",
      "fonte-padrao": estado.fonte === "padrao",
      "espaco-letras": estado.espacoLetras,
      "espaco-linhas": estado.espacoLinhas,
      "modo-escuro": estado.tema === "escuro"
    };
    Object.keys(mapaAcoesBooleanas).forEach(function (acao) {
      var botao = document.querySelector("[data-painel-acao='" + acao + "']");
      if (botao) {
        botao.setAttribute("aria-pressed", mapaAcoesBooleanas[acao] ? "true" : "false");
      }
    });
  }

  function ajustarFonte(delta) {
    var novaEscala = Math.round((estado.escalaFonte + delta) * 100) / 100;
    novaEscala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, novaEscala));
    estado.escalaFonte = novaEscala;
    aplicarEstado();
    salvarEstado();
    anunciar("Tamanho do texto ajustado.");
  }

  function resetarFonte() {
    estado.escalaFonte = estadoPadrao.escalaFonte;
    aplicarEstado();
    salvarEstado();
    anunciar("Tamanho do texto restaurado ao padrão.");
  }

  function alternarTema() {
    estado.tema = estado.tema === "escuro" ? "claro" : "escuro";
    aplicarEstado();
    salvarEstado();
    anunciar(estado.tema === "escuro" ? "Modo escuro ativado." : "Modo claro ativado.");
  }

  function definirFonte(fonte) {
    estado.fonte = fonte;
    aplicarEstado();
    salvarEstado();
    anunciar(fonte === "dislexia" ? "Fonte para dislexia ativada." : "Fonte padrão ativada.");
  }

  function alternarEspacoLetras() {
    estado.espacoLetras = !estado.espacoLetras;
    aplicarEstado();
    salvarEstado();
  }

  function alternarEspacoLinhas() {
    estado.espacoLinhas = !estado.espacoLinhas;
    aplicarEstado();
    salvarEstado();
  }

  function restaurarPadrao() {
    estado = Object.assign({}, estadoPadrao);
    aplicarEstado();
    salvarEstado();
    anunciar("Todas as preferências de acessibilidade foram restauradas.");
  }

  /* Regiões "aria-live" para leitores de tela receberem feedback das ações */
  var regiaoAnuncio;
  function anunciar(mensagem) {
    if (!regiaoAnuncio) {
      regiaoAnuncio = document.createElement("div");
      regiaoAnuncio.setAttribute("role", "status");
      regiaoAnuncio.setAttribute("aria-live", "polite");
      regiaoAnuncio.className = "sr-only";
      document.body.appendChild(regiaoAnuncio);
    }
    regiaoAnuncio.textContent = mensagem;
  }

  /* ---------------------------------------------------------------
   * Painel flutuante — construção e abertura/fechamento
   * --------------------------------------------------------------- */
  function construirPainel() {
    var painel = document.createElement("div");
    painel.className = "painel-acessibilidade";
    painel.id = "painel-acessibilidade";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "false");
    painel.setAttribute("aria-labelledby", "painel-acessibilidade-titulo");

    painel.innerHTML =
      '<div class="painel-acessibilidade__cabecalho">' +
        '<h2 id="painel-acessibilidade-titulo" class="text-uppercase">Acessibilidade</h2>' +
        '<button type="button" class="painel-acessibilidade__fechar" data-painel-fechar aria-label="Fechar painel de acessibilidade">&times;</button>' +
      '</div>' +
      '<ul class="painel-acessibilidade__lista">' +
        itemPainel("diminuir-fonte", "Diminuir fonte", iconeAMenos()) +
        itemPainel("aumentar-fonte", "Aumentar fonte", iconeAMais()) +
        itemPainel("espaco-letras", "Espaçamento de letras", iconeEspacoLetras(), true) +
        itemPainel("espaco-linhas", "Espaçamento de linhas", iconeEspacoLinhas(), true) +
        itemPainel("fonte-padrao", "Fonte padrão", iconeFonte(), true) +
        itemPainel("fonte-dislexia", "Fonte para dislexia", iconeFonteDislexia(), true) +
        itemPainel("modo-escuro", "Modo escuro", iconeContraste(), true) +
      '</ul>' +
      '<div class="painel-acessibilidade__rodape">' +
        '<button type="button" class="botao botao--secundario painel-acessibilidade__resetar" data-painel-acao="resetar">Voltar ao padrão</button>' +
      '</div>';

    document.body.appendChild(painel);
    return painel;
  }

  function itemPainel(acao, rotulo, iconeSvg, comPressed) {
    var pressed = comPressed ? ' aria-pressed="false"' : "";
    return (
      '<li class="painel-acessibilidade__item">' +
        '<button type="button" data-painel-acao="' + acao + '"' + pressed + '>' +
          iconeSvg + '<span>' + rotulo + '</span>' +
        '</button>' +
      '</li>'
    );
  }

  function abrirPainel() {
    var painel = document.getElementById("painel-acessibilidade") || construirPainel();
    painel.classList.add("aberto");
    var botaoIcone = document.querySelector("[data-abrir-painel-acessibilidade]");
    if (botaoIcone) botaoIcone.setAttribute("aria-expanded", "true");
    var primeiroFoco = painel.querySelector("button[data-painel-acao]");
    if (primeiroFoco) primeiroFoco.focus();
  }

  function fecharPainel() {
    var painel = document.getElementById("painel-acessibilidade");
    if (painel) painel.classList.remove("aberto");
    var botaoIcone = document.querySelector("[data-abrir-painel-acessibilidade]");
    if (botaoIcone) {
      botaoIcone.setAttribute("aria-expanded", "false");
      botaoIcone.focus();
    }
  }

  function alternarPainel() {
    var painel = document.getElementById("painel-acessibilidade");
    if (painel && painel.classList.contains("aberto")) {
      fecharPainel();
    } else {
      abrirPainel();
    }
  }

  /* ---------------------------------------------------------------
   * Delegação de eventos — cobre botões do banner e do painel
   * --------------------------------------------------------------- */
  function tratarClique(evento) {
    var alvoBanner = evento.target.closest("[data-acao]");
    if (alvoBanner) {
      executarAcao(alvoBanner.getAttribute("data-acao"));
      return;
    }
    var alvoPainelAcao = evento.target.closest("[data-painel-acao]");
    if (alvoPainelAcao) {
      executarAcao(alvoPainelAcao.getAttribute("data-painel-acao"));
      return;
    }
    if (evento.target.closest("[data-abrir-painel-acessibilidade]")) {
      alternarPainel();
      return;
    }
    if (evento.target.closest("[data-painel-fechar]")) {
      fecharPainel();
      return;
    }
    // Clique fora do painel fecha o painel
    var painel = document.getElementById("painel-acessibilidade");
    if (painel && painel.classList.contains("aberto") && !evento.target.closest("#painel-acessibilidade") && !evento.target.closest("[data-abrir-painel-acessibilidade]")) {
      fecharPainel();
    }
  }

  function executarAcao(acao) {
    switch (acao) {
      case "diminuir-fonte":
        ajustarFonte(-ESCALA_PASSO);
        break;
      case "aumentar-fonte":
        ajustarFonte(ESCALA_PASSO);
        break;
      case "fonte-normal":
        resetarFonte();
        break;
      case "alternar-tema":
      case "modo-escuro":
        alternarTema();
        break;
      case "fonte-padrao":
        definirFonte("padrao");
        break;
      case "fonte-dislexia":
        definirFonte("dislexia");
        break;
      case "espaco-letras":
        alternarEspacoLetras();
        break;
      case "espaco-linhas":
        alternarEspacoLinhas();
        break;
      case "resetar":
        restaurarPadrao();
        break;
    }
  }

  /* ---------------------------------------------------------------
   * Atalhos de teclado (e-MAG): Alt+1 conteúdo, Alt+2 menu,
   * Alt+3 rodapé, Alt+4 acessibilidade, Alt+5 alto contraste,
   * Alt+6 VLibras. Também Esc fecha o painel.
   * --------------------------------------------------------------- */
  function tratarTeclado(evento) {
    if (evento.key === "Escape") {
      fecharPainel();
      return;
    }
    if (!evento.altKey) return;
    var alvoId = null;
    switch (evento.key) {
      case "1":
        alvoId = "conteudo-principal";
        break;
      case "2":
        alvoId = "menu-principal";
        break;
      case "3":
        alvoId = "rodape-principal";
        break;
      case "4":
        window.location.href = obterCaminhoBase() + "paginas/acessibilidade.html";
        return;
      case "5":
        evento.preventDefault();
        alternarTema();
        return;
      case "6":
        evento.preventDefault();
        if (window.VLibrasWidget && window.VLibrasWidget.open) {
          window.VLibrasWidget.open();
        } else if (window.VLibrasWidget && window.VLibrasWidget.initBtn) {
          window.VLibrasWidget.initBtn.click();
        }
        return;
      default:
        return;
    }
    if (alvoId) {
      var elemento = document.getElementById(alvoId);
      if (elemento) {
        evento.preventDefault();
        elemento.setAttribute("tabindex", "-1");
        elemento.focus();
      }
    }
  }

  function obterCaminhoBase() {
    return window.CONSIS360_BASE || "";
  }

  /* ---- Ícones SVG inline (sem dependência externa) ---- */
  function iconeAMenos() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h16" stroke-linecap="round"/></svg>';
  }
  function iconeAMais() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke-linecap="round"/></svg>';
  }
  function iconeEspacoLetras() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20V4M20 20V4M4 12h16" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function iconeEspacoLinhas() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>';
  }
  function iconeFonte() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 20 11 4h2l5 16M8 14h8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function iconeFonteDislexia() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14c1.5 2 6.5 2 8 0" stroke-linecap="round"/></svg>';
  }
  function iconeContraste() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></svg>';
  }
  function iconeAcessibilidadeUniversal() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M4 8a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2h-6v3.2l4.4 8.8a1 1 0 1 1-1.8.9L12 15l-3.6 7a1 1 0 1 1-1.8-.9L11 12.2V9H5a1 1 0 0 1-1-1Z"/></svg>';
  }

  /* ---------------------------------------------------------------
   * Injeta o botão de acessibilidade, com legenda ao passar o
   * mouse/focar. O widget do VLibras se auto-monta sozinho (script
   * carregado em navegacao.js) e é reposicionado por lá, logo acima
   * deste botão — não precisamos criar nenhuma marcação para ele aqui.
   * --------------------------------------------------------------- */
  function injetarIconesFixos() {
    if (document.querySelector(".icones-fixos")) return;

    var container = document.createElement("div");
    container.className = "icones-fixos";
    container.innerHTML =
      '<div class="icone-fixo-item">' +
        '<button type="button" class="icone-fixo icone-fixo--acessibilidade" data-abrir-painel-acessibilidade aria-haspopup="dialog" aria-expanded="false" aria-controls="painel-acessibilidade" aria-describedby="legenda-acessibilidade" aria-label="Abrir painel de acessibilidade">' +
          iconeAcessibilidadeUniversal() +
        '</button>' +
        '<span class="icone-fixo__legenda" id="legenda-acessibilidade" role="tooltip">' + iconeAcessibilidadeUniversal() + '<span class="text-uppercase">Acessibilidade</span></span>' +
      '</div>';
    document.body.appendChild(container);
  }

  /* ---------------------------------------------------------------
   * Inicialização
   * --------------------------------------------------------------- */
  function iniciar() {
    aplicarEstado();
    injetarIconesFixos();
    document.addEventListener("click", tratarClique);
    document.addEventListener("keydown", tratarTeclado);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
