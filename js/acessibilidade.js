/**
 * CONSIS360 — Módulo de Acessibilidade (ABNT NBR 17225:2025 / WCAG 2.2 AA / eMAG 3.1)
 * ------------------------------------------------------------------
 * Responsável por:
 *  - Botões do banner superior (A-, A, A+, alto contraste e atalhos e-MAG)
 *  - Ícone flutuante oficial (assets/img/icones/acessibilidade.jpg) alinhado com VLibras
 *  - Painel flutuante moderno em grade de cards (2 colunas):
 *      1. Aumentar Fonte (A+)
 *      2. Diminuir Fonte (A-)
 *      3. Alto Contraste
 *      4. Modo Escuro
 *      5. Escala Cinza (Monocromático)
 *      6. Destacar Links
 *      7. Fonte Dislexia
 *      8. Espaçamento das Letras (2 níveis)
 *      9. Espaçamento das Linhas (2 níveis)
 *     10. Esconder Imagens (esconderimagem.svg)
 *     11. Modo Leitura (modoleitura.svg)
 *     12. Aumentar Cursor (cursor branco ampliado)
 *     13. Aumentar e Escurecer Cursor (cursor preto sólido ampliado)
 *     14. Ativar e Desativar Som (feedback sonoro e voz em ações)
 *     15. Ler Conteúdo (ler_conteudo.svg — Web Speech API pt-BR com destaque sincronizado)
 *     16. Parar Conteúdo (interrompe leitura em voz alta)
 *     17. Libras (VLibras) (libras.svg — abre tradutor VLibras gov.br)
 *     18. Atalhos (exibe guia de teclas padrão e-MAG)
 *     19. Alterar cor da Fonte (ao lado de Restaurar Padrões, com pincel, seletor 2D, paleta e código RGB digitável)
 *     20. Restaurar Padrões + botão superior "Redefinir Ajustes"
 *  - Atalhos de teclado globais (Alt+1 a Alt+7 e Alt+0), funcionando em todas as páginas
 *  - Persistência em localStorage e anúncios para leitores de tela (aria-live)
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var CHAVE_ARMAZENAMENTO = "consis360:acessibilidade:v2";
  var ESCALA_MIN = 0.8;
  var ESCALA_MAX = 1.6;
  var ESCALA_PASSO = 0.1;

  /* Paleta rápida de cores RGB para "Alterar cor da Fonte" */
  var PALETA_CORES_FONTE = [
    { id: "azul-oceano", nome: "Azul Oceano", rgb: "rgb(0, 118, 180)", r: 0, g: 118, b: 180, clara: false },
    { id: "roxo", nome: "Roxo", rgb: "rgb(122, 84, 156)", r: 122, g: 84, b: 156, clara: false },
    { id: "vermelho", nome: "Vermelho", rgb: "rgb(200, 55, 51)", r: 200, g: 55, b: 51, clara: false },
    { id: "laranja", nome: "Laranja Escuro", rgb: "rgb(208, 112, 33)", r: 208, g: 112, b: 33, clara: false },
    { id: "turquesa", nome: "Turquesa", rgb: "rgb(38, 153, 159)", r: 38, g: 153, b: 159, clara: false },
    { id: "verde-oliva", nome: "Verde Oliva", rgb: "rgb(77, 120, 49)", r: 77, g: 120, b: 49, clara: false },
    { id: "azul-royal", nome: "Azul Royal", rgb: "rgb(0, 86, 179)", r: 0, g: 86, b: 179, clara: false },
    { id: "magenta", nome: "Magenta", rgb: "rgb(194, 24, 91)", r: 194, g: 24, b: 91, clara: false },
    { id: "dourado", nome: "Ocre Dourado", rgb: "rgb(184, 134, 11)", r: 184, g: 134, b: 11, clara: false },
    { id: "verde-agua", nome: "Verde Escuro", rgb: "rgb(0, 128, 96)", r: 0, g: 128, b: 96, clara: false },
    { id: "branco", nome: "Branco", rgb: "rgb(255, 255, 255)", r: 255, g: 255, b: 255, clara: true },
    { id: "preto", nome: "Preto", rgb: "rgb(0, 0, 0)", r: 0, g: 0, b: 0, clara: false }
  ];

  var estadoPadrao = {
    escalaFonte: 1,
    corFonte: "",              // "" (original) ou string "rgb(r, g, b)"
    tema: "claro",             // "claro" | "escuro"
    altoContraste: false,      // true | false
    escalaCinza: false,        // true | false
    destacarLinks: false,      // true | false
    fonte: "padrao",           // "padrao" | "dislexia"
    espacoLetras: 0,           // 0 | 1 | 2
    espacoLinhas: 0,           // 0 | 1 | 2
    esconderImagens: false,    // true | false
    modoLeitura: false,        // true | false
    somAtivo: false,           // true | false
    cursor: "padrao"           // "padrao" | "branco" | "preto"
  };

  var estado = carregarEstado();
  var lendoPagina = false;
  var filaLeitura = [];
  var indiceLeituraAtual = -1;
  var elementoDestacadoLeitura = null;
  var atalhosVisiveis = false;
  var paletaCorVisivel = false;
  var contextoAudio = null;

  // Estado interno do seletor HSV / RGB (inicializado em rgb(160, 131, 131) conforme modelo anexo)
  var corSeletor = { h: 0, s: 0.18, v: 0.63, r: 160, g: 131, b: 131 };
  if (estado.corFonte) {
    sincronizarSeletorPorStringRgb(estado.corFonte);
  }

  function obterCaminhoBase() {
    return window.CONSIS360_BASE || "";
  }

  function carregarEstado() {
    try {
      var salvo = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (salvo) {
        var parsed = JSON.parse(salvo);
        if (typeof parsed.espacoLetras === "boolean") {
          parsed.espacoLetras = parsed.espacoLetras ? 1 : 0;
        }
        if (typeof parsed.espacoLinhas === "boolean") {
          parsed.espacoLinhas = parsed.espacoLinhas ? 1 : 0;
        }
        if (!parsed.cursor && parsed.cursorAmpliado) {
          parsed.cursor = "branco";
        }
        return Object.assign({}, estadoPadrao, parsed);
      }
    } catch (erro) {
      // localStorage indisponível — segue com padrão
    }
    return Object.assign({}, estadoPadrao);
  }

  function salvarEstado() {
    try {
      window.localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    } catch (erro) {
      /* ignora falha de armazenamento */
    }
  }

  /* ---------------------------------------------------------------
   * Conversões de Cor (RGB <-> HSV) para o Seletor e Inputs R, G, B
   * --------------------------------------------------------------- */
  function limitarCanal(valor) {
    var num = parseInt(valor, 10);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(255, num));
  }

  function hsvParaRgb(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r1 = 0, g1 = 0, b1 = 0;
    if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function rgbParaHsv(r, g, b) {
    var rNorm = r / 255;
    var gNorm = g / 255;
    var bNorm = b / 255;
    var max = Math.max(rNorm, gNorm, bNorm);
    var min = Math.min(rNorm, gNorm, bNorm);
    var d = max - min;
    var h = 0;
    var s = max === 0 ? 0 : d / max;
    var v = max;

    if (max !== min) {
      switch (max) {
        case rNorm:
          h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
          break;
        case gNorm:
          h = ((bNorm - rNorm) / d + 2) * 60;
          break;
        case bNorm:
          h = ((rNorm - gNorm) / d + 4) * 60;
          break;
      }
    }
    return { h: Math.round(h), s: s, v: v };
  }

  function sincronizarSeletorPorStringRgb(strRgb) {
    var m = (strRgb || "").match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!m) return;
    var r = limitarCanal(m[1]);
    var g = limitarCanal(m[2]);
    var b = limitarCanal(m[3]);
    var hsv = rgbParaHsv(r, g, b);
    corSeletor = { h: hsv.h, s: hsv.s, v: hsv.v, r: r, g: g, b: b };
  }

  function formatarRgb(r, g, b) {
    return "rgb(" + limitarCanal(r) + ", " + limitarCanal(g) + ", " + limitarCanal(b) + ")";
  }

  function aplicarEstado() {
    var raiz = document.documentElement;
    raiz.style.setProperty("--fonte-escala", Number(estado.escalaFonte || 1).toFixed(2));
    raiz.setAttribute("data-tema", estado.tema === "escuro" ? "escuro" : "claro");
    raiz.setAttribute("data-alto-contraste", estado.altoContraste ? "ativo" : "inativo");
    raiz.setAttribute("data-escala-cinza", estado.escalaCinza ? "ativo" : "inativo");
    raiz.setAttribute("data-destacar-links", estado.destacarLinks ? "ativo" : "inativo");
    raiz.setAttribute("data-fonte", estado.fonte === "dislexia" ? "dislexia" : "padrao");
    raiz.setAttribute(
      "data-espaco-letras",
      estado.espacoLetras === 2 ? "nivel-2" : estado.espacoLetras === 1 ? "nivel-1" : "inativo"
    );
    raiz.setAttribute(
      "data-espaco-linhas",
      estado.espacoLinhas === 2 ? "nivel-2" : estado.espacoLinhas === 1 ? "nivel-1" : "inativo"
    );
    raiz.setAttribute("data-esconder-imagens", estado.esconderImagens ? "ativo" : "inativo");
    raiz.setAttribute("data-modo-leitura", estado.modoLeitura ? "ativo" : "inativo");
    raiz.setAttribute("data-cursor", estado.cursor || "padrao");

    if (estado.corFonte) {
      raiz.style.setProperty("--cor-fonte-personalizada", estado.corFonte);
      raiz.setAttribute("data-cor-fonte-ativa", "ativo");
    } else {
      raiz.style.removeProperty("--cor-fonte-personalizada");
      raiz.setAttribute("data-cor-fonte-ativa", "inativo");
    }

    atualizarIndicadoresVisuais();
  }

  function atualizarIndicadoresVisuais() {
    var btnContrasteBanner = document.querySelector("[data-acao='alto-contraste'], [data-acao='alternar-tema']");
    if (btnContrasteBanner) {
      btnContrasteBanner.setAttribute("aria-pressed", estado.altoContraste ? "true" : "false");
    }

    var mapaPressed = {
      "aumentar-fonte": estado.escalaFonte > 1.01,
      "diminuir-fonte": estado.escalaFonte < 0.99,
      "alterar-cor-fonte": Boolean(estado.corFonte || paletaCorVisivel),
      "alto-contraste": Boolean(estado.altoContraste),
      "modo-escuro": estado.tema === "escuro",
      "escala-cinza": Boolean(estado.escalaCinza),
      "destacar-links": Boolean(estado.destacarLinks),
      "fonte-dislexia": estado.fonte === "dislexia",
      "espaco-letras": estado.espacoLetras > 0,
      "espaco-linhas": estado.espacoLinhas > 0,
      "esconder-imagens": Boolean(estado.esconderImagens),
      "modo-leitura": Boolean(estado.modoLeitura),
      "alternar-som": Boolean(estado.somAtivo),
      "aumentar-cursor": estado.cursor === "branco",
      "escurecer-cursor": estado.cursor === "preto",
      "ler-pagina": Boolean(lendoPagina),
      "atalhos": Boolean(atalhosVisiveis)
    };

    Object.keys(mapaPressed).forEach(function (acao) {
      var botao = document.querySelector("[data-painel-acao='" + acao + "']");
      if (botao) {
        botao.setAttribute("aria-pressed", mapaPressed[acao] ? "true" : "false");
        botao.classList.toggle("ativo", Boolean(mapaPressed[acao]));
      }
    });

    // Atualiza gaveta do seletor de cores + RGB
    var boxPaleta = document.getElementById("painel-acessibilidade-paleta-cor");
    if (boxPaleta) {
      if (paletaCorVisivel) {
        boxPaleta.removeAttribute("hidden");
      } else {
        boxPaleta.setAttribute("hidden", "");
      }
    }

    atualizarUICorSeletor();

    var botoesCor = document.querySelectorAll("[data-cor-fonte-rgb]");
    Array.prototype.forEach.call(botoesCor, function (btnCor) {
      var rgb = btnCor.getAttribute("data-cor-fonte-rgb");
      var ativo = Boolean(estado.corFonte && estado.corFonte === rgb);
      btnCor.setAttribute("aria-pressed", ativo ? "true" : "false");
    });

    var badgeCodigo = document.getElementById("painel-acessibilidade-cor-codigo");
    if (badgeCodigo) {
      badgeCodigo.textContent = estado.corFonte ? estado.corFonte : "Cor padrão";
    }

    // Atualiza barras de nível de espaçamento de letras, linhas e fonte
    atualizarBarrasNivel("espaco-letras", estado.espacoLetras, 2);
    atualizarBarrasNivel("espaco-linhas", estado.espacoLinhas, 2);
    var nivelFonte = estado.escalaFonte > 1 ? Math.min(3, Math.round((estado.escalaFonte - 1) / ESCALA_PASSO)) : 0;
    atualizarBarrasNivel("aumentar-fonte", nivelFonte, 3);
  }

  function atualizarUICorSeletor() {
    var espectro = document.getElementById("painel-cor-espectro");
    var cursorEspectro = document.getElementById("painel-cor-cursor");
    var amostra = document.getElementById("painel-cor-amostra");
    var sliderMatiz = document.getElementById("painel-cor-matiz");
    var inputR = document.getElementById("painel-cor-r");
    var inputG = document.getElementById("painel-cor-g");
    var inputB = document.getElementById("painel-cor-b");

    var rgbAtual = formatarRgb(corSeletor.r, corSeletor.g, corSeletor.b);

    if (espectro) {
      espectro.style.backgroundColor = "hsl(" + corSeletor.h + ", 100%, 50%)";
    }
    if (cursorEspectro) {
      cursorEspectro.style.left = Math.round(corSeletor.s * 100) + "%";
      cursorEspectro.style.top = Math.round((1 - corSeletor.v) * 100) + "%";
      cursorEspectro.style.backgroundColor = rgbAtual;
    }
    if (amostra) {
      amostra.style.backgroundColor = rgbAtual;
    }
    if (sliderMatiz && document.activeElement !== sliderMatiz) {
      sliderMatiz.value = String(corSeletor.h);
      sliderMatiz.style.color = "hsl(" + corSeletor.h + ", 100%, 50%)";
    }
    if (inputR && document.activeElement !== inputR) inputR.value = String(corSeletor.r);
    if (inputG && document.activeElement !== inputG) inputG.value = String(corSeletor.g);
    if (inputB && document.activeElement !== inputB) inputB.value = String(corSeletor.b);
  }

  function atualizarBarrasNivel(acao, valorAtual, maximo) {
    var container = document.querySelector("[data-niveis='" + acao + "']");
    if (!container) return;
    var html = "";
    for (var i = 1; i <= maximo; i++) {
      html += '<span class="painel-acessibilidade__nivel-ponto' + (i <= valorAtual ? " preenchido" : "") + '"></span>';
    }
    container.innerHTML = html;
  }

  /* ---------------------------------------------------------------
   * Feedback Sonoro (Web Audio API) e Voz (Web Speech API)
   * --------------------------------------------------------------- */
  function tocarBipe(frequencia, duracaoMs) {
    if (!estado.somAtivo) return;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!contextoAudio) contextoAudio = new AudioCtx();
      if (contextoAudio.state === "suspended") contextoAudio.resume();
      var osc = contextoAudio.createOscillator();
      var gain = contextoAudio.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia || 580;
      gain.gain.setValueAtTime(0.08, contextoAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, contextoAudio.currentTime + (duracaoMs || 90) / 1000);
      osc.connect(gain);
      gain.connect(contextoAudio.destination);
      osc.start();
      osc.stop(contextoAudio.currentTime + (duracaoMs || 90) / 1000);
    } catch (e) {
      /* ignora se Web Audio não estiver disponível */
    }
  }

  function falarFeedbackCurto(texto) {
    if (!estado.somAtivo || lendoPagina) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(texto);
      utter.lang = "pt-BR";
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      /* ignora erro de sintetizador */
    }
  }

  /* Região "aria-live" para leitores de tela receberem feedback das ações */
  var regiaoAnuncio;
  function anunciar(mensagem, falarSeSomAtivo) {
    if (!regiaoAnuncio) {
      regiaoAnuncio = document.createElement("div");
      regiaoAnuncio.setAttribute("role", "status");
      regiaoAnuncio.setAttribute("aria-live", "polite");
      regiaoAnuncio.setAttribute("aria-atomic", "true");
      regiaoAnuncio.className = "sr-only";
      document.body.appendChild(regiaoAnuncio);
    }
    regiaoAnuncio.textContent = "";
    setTimeout(function () {
      regiaoAnuncio.textContent = mensagem;
    }, 30);

    if (falarSeSomAtivo !== false) {
      tocarBipe(620, 80);
      falarFeedbackCurto(mensagem);
    }
  }

  /* ---------------------------------------------------------------
   * Leitura do Conteúdo em Voz Alta ("Ler Conteúdo" / "Parar Conteúdo")
   * --------------------------------------------------------------- */
  function limparDestaqueLeitura() {
    if (elementoDestacadoLeitura) {
      elementoDestacadoLeitura.classList.remove("leitura-ativa-destaque");
      elementoDestacadoLeitura = null;
    }
  }

  function coletarBlocosParaLeitura() {
    var escopo = document.getElementById("conteudo-principal") || document.body;
    var seletores = "h1, h2, h3, p, li, .estatistica-card, .card-mapa, #painel-detalhe dt, #painel-detalhe dd";
    var nos = Array.prototype.slice.call(escopo.querySelectorAll(seletores));
    var blocos = [];
    nos.forEach(function (el) {
      if (el.closest(".sr-only") || el.closest("[hidden]")) return;
      var estilo = window.getComputedStyle(el);
      if (estilo.display === "none" || estilo.visibility === "hidden") return;
      var txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (txt.length > 1) {
        blocos.push({ elemento: el, texto: txt });
      }
    });
    return blocos;
  }

  function iniciarLeituraPagina() {
    if (!("speechSynthesis" in window)) {
      anunciar("Seu navegador não suporta leitura em voz alta nativa.", false);
      return;
    }
    pararLeituraPagina(true);

    filaLeitura = coletarBlocosParaLeitura();
    if (!filaLeitura.length) {
      anunciar("Nenhum conteúdo textual encontrado para leitura.", false);
      return;
    }

    lendoPagina = true;
    indiceLeituraAtual = 0;
    atualizarIndicadoresVisuais();
    tocarBipe(740, 100);
    lerProximoBloco();
  }

  function lerProximoBloco() {
    if (!lendoPagina || indiceLeituraAtual < 0 || indiceLeituraAtual >= filaLeitura.length) {
      finalizarLeituraNaturalmente();
      return;
    }
    var item = filaLeitura[indiceLeituraAtual];
    limparDestaqueLeitura();
    elementoDestacadoLeitura = item.elemento;
    elementoDestacadoLeitura.classList.add("leitura-ativa-destaque");
    try {
      elementoDestacadoLeitura.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      /* fallback */
    }

    var utter = new SpeechSynthesisUtterance(item.texto);
    utter.lang = "pt-BR";
    utter.rate = 1.0;
    utter.onend = function () {
      if (!lendoPagina) return;
      indiceLeituraAtual++;
      lerProximoBloco();
    };
    utter.onerror = function () {
      if (!lendoPagina) return;
      indiceLeituraAtual++;
      lerProximoBloco();
    };
    window.speechSynthesis.speak(utter);
  }

  function finalizarLeituraNaturalmente() {
    lendoPagina = false;
    indiceLeituraAtual = -1;
    limparDestaqueLeitura();
    atualizarIndicadoresVisuais();
    anunciar("Leitura do conteúdo concluída.", false);
  }

  function pararLeituraPagina(silencioso) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    var estavaLendo = lendoPagina;
    lendoPagina = false;
    filaLeitura = [];
    indiceLeituraAtual = -1;
    limparDestaqueLeitura();
    atualizarIndicadoresVisuais();
    if (!silencioso && estavaLendo) {
      tocarBipe(420, 90);
      anunciar("Leitura do conteúdo interrompida.");
    }
  }

  /* ---------------------------------------------------------------
   * Ações dos Controles de Acessibilidade
   * --------------------------------------------------------------- */
  function ajustarFonte(delta) {
    var novaEscala = Math.round((estado.escalaFonte + delta) * 100) / 100;
    novaEscala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, novaEscala));
    estado.escalaFonte = novaEscala;
    aplicarEstado();
    salvarEstado();
    var percentual = Math.round(estado.escalaFonte * 100);
    anunciar("Tamanho da fonte ajustado para " + percentual + "%.");
  }

  function resetarFonte() {
    estado.escalaFonte = estadoPadrao.escalaFonte;
    aplicarEstado();
    salvarEstado();
    anunciar("Tamanho da fonte restaurado para 100%.");
  }

  function alternarCardCorFonte() {
    // Se a paleta já está aberta e existe cor ativa, clicar no card restaura a cor original e fecha a paleta
    if (paletaCorVisivel && estado.corFonte) {
      estado.corFonte = "";
      paletaCorVisivel = false;
      aplicarEstado();
      salvarEstado();
      anunciar("Cor original da fonte restaurada.");
      return;
    }
    paletaCorVisivel = !paletaCorVisivel;
    atualizarIndicadoresVisuais();
    var boxPaleta = document.getElementById("painel-acessibilidade-paleta-cor");
    if (paletaCorVisivel && boxPaleta) {
      try {
        boxPaleta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (e) {}
    }
    anunciar(
      paletaCorVisivel
        ? "Seletor de cor da fonte e código RGB aberto."
        : "Seletor de cor da fonte fechado."
    );
  }

  function selecionarCorFonte(rgb, nomeCor) {
    if (!rgb || estado.corFonte === rgb) {
      estado.corFonte = "";
      aplicarEstado();
      salvarEstado();
      anunciar("Cor original da fonte restaurada.");
      return;
    }
    sincronizarSeletorPorStringRgb(rgb);
    estado.corFonte = rgb;
    paletaCorVisivel = true;
    aplicarEstado();
    salvarEstado();
    anunciar("Cor da fonte alterada para " + (nomeCor || rgb) + ".");
  }

  function aplicarCorDoSeletor(silencioso) {
    var rgb = formatarRgb(corSeletor.r, corSeletor.g, corSeletor.b);
    estado.corFonte = rgb;
    aplicarEstado();
    salvarEstado();
    if (!silencioso) {
      anunciar("Cor da fonte definida para " + rgb + ".", false);
    }
  }

  function acionarContaGotas() {
    if ("EyeDropper" in window) {
      try {
        var dropper = new window.EyeDropper();
        dropper.open().then(function (resultado) {
          if (resultado && resultado.sRGBHex) {
            var hex = resultado.sRGBHex.replace("#", "");
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);
            var hsv = rgbParaHsv(r, g, b);
            corSeletor = { h: hsv.h, s: hsv.s, v: hsv.v, r: r, g: g, b: b };
            aplicarCorDoSeletor(false);
          }
        }).catch(function () {});
        return;
      } catch (e) {}
    }
    var inputR = document.getElementById("painel-cor-r");
    if (inputR) inputR.focus();
  }

  function alternarAltoContraste() {
    estado.altoContraste = !estado.altoContraste;
    if (estado.altoContraste) {
      estado.tema = "claro";
    }
    aplicarEstado();
    salvarEstado();
    anunciar(estado.altoContraste ? "Alto contraste ativado." : "Alto contraste desativado.");
  }

  function alternarModoEscuro() {
    estado.tema = estado.tema === "escuro" ? "claro" : "escuro";
    if (estado.tema === "escuro") {
      estado.altoContraste = false;
    }
    aplicarEstado();
    salvarEstado();
    anunciar(estado.tema === "escuro" ? "Modo escuro ativado." : "Modo escuro desativado.");
  }

  function alternarEscalaCinza() {
    estado.escalaCinza = !estado.escalaCinza;
    aplicarEstado();
    salvarEstado();
    anunciar(estado.escalaCinza ? "Escala de cinza ativada." : "Escala de cinza desativada.");
  }

  function alternarDestacarLinks() {
    estado.destacarLinks = !estado.destacarLinks;
    aplicarEstado();
    salvarEstado();
    anunciar(estado.destacarLinks ? "Destaque de links ativado." : "Destaque de links desativado.");
  }

  function alternarFonteDislexia() {
    estado.fonte = estado.fonte === "dislexia" ? "padrao" : "dislexia";
    aplicarEstado();
    salvarEstado();
    anunciar(estado.fonte === "dislexia" ? "Fonte para dislexia ativada." : "Fonte padrão restaurada.");
  }

  function alternarEspacoLetras() {
    estado.espacoLetras = (estado.espacoLetras + 1) % 3;
    aplicarEstado();
    salvarEstado();
    var msg = estado.espacoLetras === 0
      ? "Espaçamento das letras padrão."
      : "Espaçamento das letras nível " + estado.espacoLetras + " ativado.";
    anunciar(msg);
  }

  function alternarEspacoLinhas() {
    estado.espacoLinhas = (estado.espacoLinhas + 1) % 3;
    aplicarEstado();
    salvarEstado();
    var msg = estado.espacoLinhas === 0
      ? "Espaçamento das linhas padrão."
      : "Espaçamento das linhas nível " + estado.espacoLinhas + " ativado.";
    anunciar(msg);
  }

  function alternarEsconderImagens() {
    estado.esconderImagens = !estado.esconderImagens;
    aplicarEstado();
    salvarEstado();
    anunciar(estado.esconderImagens ? "Imagens ocultadas." : "Imagens exibidas novamente.");
  }

  function alternarModoLeitura() {
    estado.modoLeitura = !estado.modoLeitura;
    aplicarEstado();
    salvarEstado();
    anunciar(estado.modoLeitura ? "Modo leitura ativado." : "Modo leitura desativado.");
  }

  function alternarSom() {
    estado.somAtivo = !estado.somAtivo;
    aplicarEstado();
    salvarEstado();
    if (estado.somAtivo) {
      tocarBipe(700, 100);
    } else if ("speechSynthesis" in window && !lendoPagina) {
      window.speechSynthesis.cancel();
    }
    anunciar(estado.somAtivo ? "Som e feedback por voz ativados." : "Som desativado.", estado.somAtivo);
  }

  function alternarAumentarCursor() {
    estado.cursor = estado.cursor === "branco" ? "padrao" : "branco";
    aplicarEstado();
    salvarEstado();
    anunciar(estado.cursor === "branco" ? "Aumentar cursor ativado." : "Cursor padrão restaurado.");
  }

  function alternarEscurecerCursor() {
    estado.cursor = estado.cursor === "preto" ? "padrao" : "preto";
    aplicarEstado();
    salvarEstado();
    anunciar(
      estado.cursor === "preto"
        ? "Aumentar e escurecer cursor ativado."
        : "Cursor padrão restaurado."
    );
  }

  function acionarVlibras() {
    fecharPainel();
    if (window.VLibrasWidget && typeof window.VLibrasWidget.open === "function") {
      window.VLibrasWidget.open();
      anunciar("Tradutor VLibras aberto.");
    } else if (window.VLibrasWidget && window.VLibrasWidget.initBtn) {
      window.VLibrasWidget.initBtn.click();
      anunciar("Tradutor VLibras acionado.");
    } else {
      anunciar("O widget VLibras ainda está carregando ou indisponível offline.");
    }
  }

  function alternarGavetaAtalhos() {
    atalhosVisiveis = !atalhosVisiveis;
    var gaveta = document.getElementById("painel-acessibilidade-atalhos");
    if (gaveta) {
      if (atalhosVisiveis) {
        gaveta.removeAttribute("hidden");
        gaveta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        gaveta.setAttribute("hidden", "");
      }
    }
    atualizarIndicadoresVisuais();
    anunciar(atalhosVisiveis ? "Lista de teclas de atalho exibida." : "Lista de teclas de atalho ocultada.");
  }

  function restaurarPadrao() {
    pararLeituraPagina(true);
    atalhosVisiveis = false;
    paletaCorVisivel = false;
    corSeletor = { h: 0, s: 0.18, v: 0.63, r: 160, g: 131, b: 131 };
    var gaveta = document.getElementById("painel-acessibilidade-atalhos");
    if (gaveta) gaveta.setAttribute("hidden", "");
    estado = Object.assign({}, estadoPadrao);
    aplicarEstado();
    salvarEstado();
    anunciar("Todas as preferências de acessibilidade foram restauradas ao padrão.");
  }

  /* ---------------------------------------------------------------
   * Construção do Painel Flutuante Moderno
   * --------------------------------------------------------------- */
  function construirGavetaCorFonte() {
    var botoesPaleta = PALETA_CORES_FONTE.map(function (cor) {
      return (
        '<button type="button" class="painel-acessibilidade__cor-circulo"' +
          ' data-cor-fonte-rgb="' + cor.rgb + '"' +
          ' data-cor-fonte-nome="' + cor.nome + '"' +
          (cor.clara ? ' data-cor-clara="true"' : '') +
          ' style="background-color: ' + cor.rgb + ';"' +
          ' aria-pressed="false"' +
          ' title="' + cor.nome + ' — ' + cor.rgb + '"' +
          ' aria-label="Escolher cor ' + cor.nome + ' (' + cor.rgb + ')">' +
        '</button>'
      );
    }).join("");

    return (
      '<div id="painel-acessibilidade-paleta-cor" class="painel-acessibilidade__paleta-box" hidden>' +
        '<div id="painel-cor-espectro" class="painel-acessibilidade__espectro" role="slider" tabindex="0" aria-label="Seletor de tonalidade e saturação da cor da fonte">' +
          '<span id="painel-cor-cursor" class="painel-acessibilidade__espectro-cursor" aria-hidden="true"></span>' +
        '</div>' +
        '<div class="painel-acessibilidade__controles-cor">' +
          '<button type="button" class="painel-acessibilidade__conta-gotas" data-acao-conta-gotas title="Selecionar cor com conta-gotas" aria-label="Selecionar cor com conta-gotas">' +
            iconeContaGotas() +
          '</button>' +
          '<span id="painel-cor-amostra" class="painel-acessibilidade__amostra-cor" aria-hidden="true"></span>' +
          '<input type="range" id="painel-cor-matiz" class="painel-acessibilidade__matiz-slider" min="0" max="360" value="0" aria-label="Matiz da cor (0 a 360 graus)">' +
        '</div>' +
        '<div class="painel-acessibilidade__rgb-linha" role="group" aria-label="Digite o código RGB da cor da fonte">' +
          '<div class="painel-acessibilidade__rgb-campo">' +
            '<input type="number" id="painel-cor-r" class="painel-acessibilidade__rgb-input" min="0" max="255" value="160" inputmode="numeric" aria-label="Valor R (Vermelho de 0 a 255)">' +
            '<label for="painel-cor-r" class="painel-acessibilidade__rgb-rotulo">R</label>' +
          '</div>' +
          '<div class="painel-acessibilidade__rgb-campo">' +
            '<input type="number" id="painel-cor-g" class="painel-acessibilidade__rgb-input" min="0" max="255" value="131" inputmode="numeric" aria-label="Valor G (Verde de 0 a 255)">' +
            '<label for="painel-cor-g" class="painel-acessibilidade__rgb-rotulo">G</label>' +
          '</div>' +
          '<div class="painel-acessibilidade__rgb-campo">' +
            '<input type="number" id="painel-cor-b" class="painel-acessibilidade__rgb-input" min="0" max="255" value="131" inputmode="numeric" aria-label="Valor B (Azul de 0 a 255)">' +
            '<label for="painel-cor-b" class="painel-acessibilidade__rgb-rotulo">B</label>' +
          '</div>' +
          '<div class="painel-acessibilidade__rgb-setas" aria-hidden="true">&#8597;</div>' +
        '</div>' +
        '<div class="painel-acessibilidade__paleta-grade" role="group" aria-label="Paleta rápida de cores RGB">' +
          botoesPaleta +
        '</div>' +
        '<div class="painel-acessibilidade__paleta-rodape">' +
          '<span id="painel-acessibilidade-cor-codigo" class="painel-acessibilidade__cor-codigo">Cor padrão</span>' +
          '<button type="button" class="painel-acessibilidade__cor-cancelar" data-painel-acao="limpar-cor-fonte">' +
            'Cor original' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function vincularEventosSeletorCor(painel) {
    var espectro = painel.querySelector("#painel-cor-espectro");
    var sliderMatiz = painel.querySelector("#painel-cor-matiz");
    var inputR = painel.querySelector("#painel-cor-r");
    var inputG = painel.querySelector("#painel-cor-g");
    var inputB = painel.querySelector("#painel-cor-b");

    if (espectro) {
      var arrastando = false;
      var atualizarPorPosicao = function (clientX, clientY) {
        var rect = espectro.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        var rgb = hsvParaRgb(corSeletor.h, s, v);
        corSeletor.s = s;
        corSeletor.v = v;
        corSeletor.r = rgb.r;
        corSeletor.g = rgb.g;
        corSeletor.b = rgb.b;
        aplicarCorDoSeletor(true);
      };

      espectro.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        arrastando = true;
        if (espectro.setPointerCapture) {
          try { espectro.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        atualizarPorPosicao(ev.clientX, ev.clientY);
      });

      espectro.addEventListener("pointermove", function (ev) {
        if (!arrastando) return;
        atualizarPorPosicao(ev.clientX, ev.clientY);
      });

      var finalizarArraste = function () {
        if (!arrastando) return;
        arrastando = false;
        anunciar("Cor da fonte ajustada para " + formatarRgb(corSeletor.r, corSeletor.g, corSeletor.b) + ".", false);
      };
      espectro.addEventListener("pointerup", finalizarArraste);
      espectro.addEventListener("pointercancel", finalizarArraste);
    }

    if (sliderMatiz) {
      sliderMatiz.addEventListener("input", function () {
        var h = Math.max(0, Math.min(360, parseInt(sliderMatiz.value, 10) || 0));
        var rgb = hsvParaRgb(h, corSeletor.s, corSeletor.v);
        corSeletor.h = h;
        corSeletor.r = rgb.r;
        corSeletor.g = rgb.g;
        corSeletor.b = rgb.b;
        sliderMatiz.style.color = "hsl(" + h + ", 100%, 50%)";
        aplicarCorDoSeletor(true);
      });
      sliderMatiz.addEventListener("change", function () {
        anunciar("Cor da fonte ajustada para " + formatarRgb(corSeletor.r, corSeletor.g, corSeletor.b) + ".", false);
      });
    }

    var aoDigitarRgb = function () {
      var r = limitarCanal(inputR ? inputR.value : 0);
      var g = limitarCanal(inputG ? inputG.value : 0);
      var b = limitarCanal(inputB ? inputB.value : 0);
      var hsv = rgbParaHsv(r, g, b);
      corSeletor = { h: hsv.h, s: hsv.s, v: hsv.v, r: r, g: g, b: b };
      aplicarCorDoSeletor(true);
    };

    [inputR, inputG, inputB].forEach(function (inp) {
      if (!inp) return;
      inp.addEventListener("input", aoDigitarRgb);
      inp.addEventListener("change", function () {
        inp.value = String(limitarCanal(inp.value));
        aoDigitarRgb();
        anunciar("Código RGB aplicado: " + formatarRgb(corSeletor.r, corSeletor.g, corSeletor.b) + ".");
      });
    });
  }

  function construirPainel() {
    var existente = document.getElementById("painel-acessibilidade");
    if (existente) return existente;

    var painel = document.createElement("aside");
    painel.className = "painel-acessibilidade";
    painel.id = "painel-acessibilidade";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-modal", "false");
    painel.setAttribute("aria-labelledby", "painel-acessibilidade-titulo");
    painel.setAttribute("aria-hidden", "true");

    painel.innerHTML =
      '<div class="painel-acessibilidade__topo">' +
        '<h2 id="painel-acessibilidade-titulo" class="sr-only">Menu de Acessibilidade</h2>' +
        '<button type="button" class="painel-acessibilidade__redefinir" data-painel-acao="resetar">' +
          'Redefinir Ajustes' +
        '</button>' +
      '</div>' +
      '<div class="painel-acessibilidade__corpo">' +
        '<ul class="painel-acessibilidade__grade" role="list">' +
          cardPainel("aumentar-fonte", "Aumentar Fonte", '<span class="painel-acessibilidade__icone-texto" aria-hidden="true">A+</span>', true, 3) +
          cardPainel("diminuir-fonte", "Diminuir Fonte", '<span class="painel-acessibilidade__icone-texto" aria-hidden="true">A&minus;</span>', true, 0) +
          cardPainel("alto-contraste", "Alto Contraste", iconeAltoContraste(), true, 0) +
          cardPainel("modo-escuro", "Modo Escuro", iconeModoEscuro(), true, 0) +
          cardPainel("escala-cinza", "Escala Cinza", iconeEscalaCinza(), true, 0) +
          cardPainel("destacar-links", "Destacar Links", iconeDestacarLinks(), true, 0) +
          cardPainel("fonte-dislexia", "Fonte Dislexia", iconeFonteDislexia(), true, 0) +
          cardPainel("espaco-letras", "Espaçamento das Letras", iconeEspacoLetras(), true, 2) +
          cardPainel("espaco-linhas", "Espaçamento das Linhas", iconeEspacoLinhas(), true, 2) +
          cardPainel("esconder-imagens", "Esconder Imagens", iconeEsconderImagens(), true, 0) +
          cardPainel("modo-leitura", "Modo Leitura", iconeModoLeitura(), true, 0) +
          cardPainel("aumentar-cursor", "Aumentar Cursor", iconeAumentarCursor(), true, 0) +
          cardPainel("escurecer-cursor", "Aumentar e Escurecer Cursor", iconeEscurecerCursor(), true, 0) +
          cardPainel("alternar-som", "Ativar e Desativar Som", iconeSom(), true, 0) +
          cardPainel("ler-pagina", "Ler Conteúdo", iconeLerConteudo(), true, 0) +
          cardPainel("parar-pagina", "Parar Conteúdo", iconePararPagina(), false, 0) +
          cardPainel("vlibras", "Libras (VLibras)", iconeLibras(), false, 0) +
          cardPainel("atalhos", "Atalhos", iconeAtalhos(), true, 0) +
          cardPainel("alterar-cor-fonte", "Alterar cor da Fonte", iconeAlterarCorFonte(), true, 0) +
          cardPainel("resetar", "Restaurar Padrões", iconeRestaurar(), false, 0) +
        '</ul>' +
        construirGavetaCorFonte() +
        '<div id="painel-acessibilidade-atalhos" class="painel-acessibilidade__atalhos-box" hidden>' +
          '<h3 class="painel-acessibilidade__atalhos-titulo">Teclas de Atalho (Padrão e-MAG)</h3>' +
          '<ul class="painel-acessibilidade__atalhos-lista">' +
            '<li><span>Conteúdo principal</span><kbd>Alt + 1</kbd></li>' +
            '<li><span>Menu principal</span><kbd>Alt + 2</kbd></li>' +
            '<li><span>Rodapé da página</span><kbd>Alt + 3</kbd></li>' +
            '<li><span>Página de Acessibilidade</span><kbd>Alt + 4</kbd></li>' +
            '<li><span>Alternar Alto Contraste</span><kbd>Alt + 5</kbd></li>' +
            '<li><span>Abrir VLibras</span><kbd>Alt + 6</kbd></li>' +
            '<li><span>Ler / Parar Conteúdo</span><kbd>Alt + 7</kbd></li>' +
            '<li><span>Abrir Menu de Acessibilidade</span><kbd>Alt + 0</kbd></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="painel-acessibilidade__rodape">' +
        '<div class="painel-acessibilidade__assinatura">' +
          '<span class="painel-acessibilidade__assinatura-texto">Acessibilidade Digital por</span>' +
          '<div class="painel-acessibilidade__logo-bahia">' +
            '<img class="painel-acessibilidade__logo-img" src="' + obterCaminhoBase() + 'assets/img/icones/governo_bahia.PNG" alt="Governo do Estado da Bahia">' +
          '</div>' +
        '</div>' +
        '<button type="button" class="painel-acessibilidade__fechar-circular" data-painel-fechar aria-label="Fechar painel de acessibilidade (Esc)">' +
          iconeFecharCircular() +
        '</button>' +
      '</div>';

    document.body.appendChild(painel);
    vincularEventosSeletorCor(painel);
    atualizarIndicadoresVisuais();
    return painel;
  }

  function cardPainel(acao, rotulo, conteudoIcone, comPressed, qtdNiveis) {
    var attrPressed = comPressed ? ' aria-pressed="false"' : "";
    var barraNiveis = qtdNiveis > 0
      ? '<span class="painel-acessibilidade__niveis" data-niveis="' + acao + '" aria-hidden="true"></span>'
      : "";
    return (
      '<li class="painel-acessibilidade__item">' +
        '<button type="button" class="painel-acessibilidade__card" data-painel-acao="' + acao + '"' + attrPressed + '>' +
          '<span class="painel-acessibilidade__icone">' + conteudoIcone + '</span>' +
          '<span class="painel-acessibilidade__rotulo">' + rotulo + '</span>' +
          barraNiveis +
        '</button>' +
      '</li>'
    );
  }

  function abrirPainel() {
    var painel = construirPainel();
    painel.classList.add("aberto");
    painel.setAttribute("aria-hidden", "false");
    document.documentElement.setAttribute("data-painel-acessibilidade-aberto", "true");

    var botaoIcone = document.querySelector("[data-abrir-painel-acessibilidade]");
    if (botaoIcone) {
      botaoIcone.setAttribute("aria-expanded", "true");
    }

    var primeiroFoco = painel.querySelector(".painel-acessibilidade__redefinir") || painel.querySelector("button[data-painel-acao]");
    if (primeiroFoco) primeiroFoco.focus();
  }

  function fecharPainel() {
    var painel = document.getElementById("painel-acessibilidade");
    if (painel) {
      painel.classList.remove("aberto");
      painel.setAttribute("aria-hidden", "true");
    }
    document.documentElement.setAttribute("data-painel-acessibilidade-aberto", "false");

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
   * Delegação de eventos — cliques no banner, atalhos e painel
   * --------------------------------------------------------------- */
  function tratarClique(evento) {
    var linkAtalho = evento.target.closest("[data-atalho-destino]");
    if (linkAtalho) {
      evento.preventDefault();
      focarLandmark(linkAtalho.getAttribute("data-atalho-destino"));
      return;
    }

    if (evento.target.closest("[data-acao-conta-gotas]")) {
      acionarContaGotas();
      return;
    }

    var btnCorRgb = evento.target.closest("[data-cor-fonte-rgb]");
    if (btnCorRgb) {
      selecionarCorFonte(
        btnCorRgb.getAttribute("data-cor-fonte-rgb"),
        btnCorRgb.getAttribute("data-cor-fonte-nome")
      );
      return;
    }

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

    var painel = document.getElementById("painel-acessibilidade");
    if (
      painel &&
      painel.classList.contains("aberto") &&
      !evento.target.closest("#painel-acessibilidade") &&
      !evento.target.closest("[data-abrir-painel-acessibilidade]")
    ) {
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
      case "alterar-cor-fonte":
        alternarCardCorFonte();
        break;
      case "limpar-cor-fonte":
        selecionarCorFonte("", "");
        break;
      case "alto-contraste":
      case "alternar-tema":
        alternarAltoContraste();
        break;
      case "modo-escuro":
        alternarModoEscuro();
        break;
      case "escala-cinza":
        alternarEscalaCinza();
        break;
      case "destacar-links":
        alternarDestacarLinks();
        break;
      case "fonte-padrao":
        estado.fonte = "padrao";
        aplicarEstado();
        salvarEstado();
        anunciar("Fonte padrão ativada.");
        break;
      case "fonte-dislexia":
        alternarFonteDislexia();
        break;
      case "espaco-letras":
        alternarEspacoLetras();
        break;
      case "espaco-linhas":
        alternarEspacoLinhas();
        break;
      case "esconder-imagens":
        alternarEsconderImagens();
        break;
      case "modo-leitura":
        alternarModoLeitura();
        break;
      case "alternar-som":
        alternarSom();
        break;
      case "aumentar-cursor":
      case "cursor-ampliado":
        alternarAumentarCursor();
        break;
      case "escurecer-cursor":
        alternarEscurecerCursor();
        break;
      case "ler-pagina":
        iniciarLeituraPagina();
        break;
      case "parar-pagina":
        pararLeituraPagina(false);
        break;
      case "vlibras":
        acionarVlibras();
        break;
      case "atalhos":
        alternarGavetaAtalhos();
        break;
      case "resetar":
        restaurarPadrao();
        break;
    }
  }

  /* ---------------------------------------------------------------
   * Foco em Landmarks (Alt+1 Conteúdo, Alt+2 Menu, Alt+3 Rodapé)
   * --------------------------------------------------------------- */
  function focarLandmark(idAlvo) {
    var elemento = document.getElementById(idAlvo);
    if (!elemento) return;

    if (idAlvo === "menu-principal") {
      var primeiroLink = elemento.querySelector("a, button");
      if (primeiroLink) {
        primeiroLink.focus();
        primeiroLink.scrollIntoView({ behavior: "smooth", block: "center" });
        anunciar("Foco movido para o Menu Principal.");
        return;
      }
    }

    if (!elemento.hasAttribute("tabindex")) {
      elemento.setAttribute("tabindex", "-1");
    }
    elemento.focus({ preventScroll: false });
    try {
      elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      /* fallback */
    }

    var nomes = {
      "conteudo-principal": "Conteúdo principal da página.",
      "menu-principal": "Menu principal.",
      "rodape-principal": "Rodapé da página."
    };
    anunciar("Foco movido para: " + (nomes[idAlvo] || idAlvo));
  }

  /* ---------------------------------------------------------------
   * Teclas de Atalho (e-MAG) e Navegação por Teclado no Painel
   * --------------------------------------------------------------- */
  function extrairNumeroAtalho(evento) {
    var code = evento.code || "";
    if (/^Digit[0-9]$/.test(code)) return code.replace("Digit", "");
    if (/^Numpad[0-9]$/.test(code)) return code.replace("Numpad", "");
    if (/^[0-9]$/.test(evento.key || "")) return evento.key;
    return null;
  }

  function tratarTeclado(evento) {
    var painel = document.getElementById("painel-acessibilidade");
    var painelAberto = painel && painel.classList.contains("aberto");

    if (evento.key === "Escape") {
      if (painelAberto) {
        evento.preventDefault();
        fecharPainel();
        return;
      }
      if (lendoPagina) {
        evento.preventDefault();
        pararLeituraPagina(false);
        return;
      }
    }

    if (painelAberto && evento.key === "Tab") {
      var focaveis = Array.prototype.slice.call(
        painel.querySelectorAll("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")
      ).filter(function (el) {
        return !el.closest("[hidden]");
      });
      if (focaveis.length > 0) {
        var primeiro = focaveis[0];
        var ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
          return;
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
          return;
        }
      }
    }

    if (!evento.altKey || evento.ctrlKey || evento.metaKey) return;

    var digito = extrairNumeroAtalho(evento);
    if (!digito) return;

    switch (digito) {
      case "1":
        evento.preventDefault();
        focarLandmark("conteudo-principal");
        break;
      case "2":
        evento.preventDefault();
        focarLandmark("menu-principal");
        break;
      case "3":
        evento.preventDefault();
        focarLandmark("rodape-principal");
        break;
      case "4":
        evento.preventDefault();
        window.location.href = obterCaminhoBase() + "paginas/acessibilidade.html";
        break;
      case "5":
        evento.preventDefault();
        alternarAltoContraste();
        break;
      case "6":
        evento.preventDefault();
        acionarVlibras();
        break;
      case "7":
        evento.preventDefault();
        if (lendoPagina) {
          pararLeituraPagina(false);
        } else {
          iniciarLeituraPagina();
        }
        break;
      case "0":
        evento.preventDefault();
        alternarPainel();
        break;
    }
  }

  /* ---------------------------------------------------------------
   * Ícones SVG para os Cards do Painel Flutuante
   * --------------------------------------------------------------- */
  /* Ícone Pincel (fiel à imagem anexa media_1793985212606_a4191350.png) */
  function iconeAlterarCorFonte() {
    return (
      '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">' +
        '<path d="M23.6 5.2a2.1 2.1 0 0 1 3 0l.2.2a2.1 2.1 0 0 1 0 3l-9.1 9.1-3.2-3.2 9.1-9.1Z"/>' +
        '<path d="M12.9 15.9l3.2 3.2c.6 1.8.2 3.9-1.2 5.3-1.6 1.6-4.2 2.1-6.9 1.3-.5-.1-.6-.8-.2-1.1.9-.7 1.4-1.6 1.5-2.7.1-1.6.6-3.2 1.8-4.4.5-.5 1.1-.9 1.8-1.6Z"/>' +
      '</svg>'
    );
  }
  function iconeContaGotas() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m2 22 1-1h3l9-9"/>' +
        '<path d="M3 21v-3l9-9"/>' +
        '<path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>' +
      '</svg>'
    );
  }
  function iconeFonteDislexia() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<rect x="5" y="5" width="22" height="22" rx="4"/>' +
        '<path d="M11 22c1-4.5 2.8-11 5.5-11 2.2 0 3.3 3.5 3.5 11M11.8 18.2h8.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeAltoContraste() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<circle cx="16" cy="16" r="11"/>' +
        '<path d="M16 5a11 11 0 0 1 0 22Z" fill="currentColor" stroke="none"/>' +
      '</svg>'
    );
  }
  function iconeModoEscuro() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M24.5 19.2A9.5 9.5 0 0 1 12.8 7.5a9.5 9.5 0 1 0 11.7 11.7Z" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeEscalaCinza() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M16 5c-4.5 6-8 10.2-8 14.5a8 8 0 0 0 16 0C24 15.2 20.5 11 16 5Z" stroke-linejoin="round"/>' +
        '<path d="M16 5v22.5a8 8 0 0 1-8-8c0-4.3 3.5-8.5 8-14.5Z" fill="currentColor" stroke="none"/>' +
      '</svg>'
    );
  }
  function iconeDestacarLinks() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M13.5 18.5a5 5 0 0 0 7.1 0l4-4a5 5 0 0 0-7.1-7.1l-2 2" stroke-linecap="round"/>' +
        '<path d="M18.5 13.5a5 5 0 0 0-7.1 0l-4 4a5 5 0 0 0 7.1 7.1l2-2" stroke-linecap="round"/>' +
      '</svg>'
    );
  }
  function iconeEspacoLetras() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M6 7v18M26 7v18M10 16h12M10 16l3-3M10 16l3 3M22 16l-3-3M22 16l-3 3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeEspacoLinhas() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M13 8h13M13 16h13M13 24h13M7 7v18M7 7 4.5 9.5M7 7l2.5 2.5M7 25l-2.5-2.5M7 25l2.5-2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeEsconderImagens() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M10.5 5.5H24a2.5 2.5 0 0 1 2.5 2.5v13.5"/>' +
        '<path d="M5.5 8.5V24A2.5 2.5 0 0 0 8 26.5h15.5"/>' +
        '<path d="M9.5 22.5l4.2-5.2 3.1 3.8 2-2.2 3.2 3.6H9.5Z" fill="currentColor"/>' +
        '<path d="M4 4l24 24" stroke-width="2.5"/>' +
      '</svg>'
    );
  }
  function iconeModoLeitura() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3.5" y="5.5" width="25" height="21" rx="2.5"/>' +
        '<line x1="16" y1="5.5" x2="16" y2="26.5"/>' +
        '<line x1="7.5" y1="11" x2="12.5" y2="11" stroke-width="2.4"/>' +
        '<line x1="7.5" y1="16" x2="12.5" y2="16" stroke-width="2.4"/>' +
        '<line x1="7.5" y1="21" x2="12.5" y2="21" stroke-width="2.4"/>' +
        '<line x1="19.5" y1="11" x2="24.5" y2="11" stroke-width="2.4"/>' +
        '<line x1="19.5" y1="16" x2="24.5" y2="16" stroke-width="2.4"/>' +
        '<line x1="19.5" y1="21" x2="24.5" y2="21" stroke-width="2.4"/>' +
      '</svg>'
    );
  }
  function iconeSom() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M6 13v6h4.5L17 24V8l-6.5 5H6Z" fill="currentColor" stroke-linejoin="round"/>' +
        '<path d="M21 11.5a6.5 6.5 0 0 1 0 9M24 8.5a10.5 10.5 0 0 1 0 15" stroke-linecap="round"/>' +
      '</svg>'
    );
  }
  function iconeAumentarCursor() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">' +
        '<path d="M9 4.5v20l5-4.7 3.5 7.4 3-1.4-3.5-7.3H23.5L9 4.5Z" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeEscurecerCursor() {
    return (
      '<svg viewBox="0 0 32 32" fill="currentColor" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
        '<path d="M9 4.5v20l5-4.7 3.5 7.4 3-1.4-3.5-7.3H23.5L9 4.5Z" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeLerConteudo() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="11.5" cy="11.5" r="4.5"/>' +
        '<path d="M4 25.5c0-4.2 3.3-7 7.5-7s7.5 2.8 7.5 7H4Z"/>' +
        '<path d="M21.5 9.2a6.5 6.5 0 0 1 0 9.6"/>' +
        '<path d="M25.2 6.2a10.8 10.8 0 0 1 0 15.6"/>' +
      '</svg>'
    );
  }
  function iconePararPagina() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<circle cx="16" cy="16" r="11"/>' +
        '<rect x="12" y="12" width="8" height="8" rx="1.5" fill="currentColor"/>' +
      '</svg>'
    );
  }
  function iconeLibras() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12.5 13.5V16H5.5a1.3 1.3 0 0 0 0 2.6h6.5"/>' +
        '<path d="M4.2 18.6a1.3 1.3 0 0 0 0 2.6h7.8"/>' +
        '<path d="M5.2 21.2a1.3 1.3 0 0 0 0 2.6h6.8"/>' +
        '<path d="M6.8 23.8a1.3 1.3 0 0 0 0 2.6h9.7a3.5 3.5 0 0 0 3.5-3.5v-4.2c0-1.2-.5-2.3-1.4-3.1l-3.8-3.4a1.4 1.4 0 0 0-2.3 1.3Z"/>' +
        '<path d="M15.5 4.8l5.8 5.2"/>' +
        '<path d="M12.8 6.5l5.5 4.9"/>' +
        '<path d="M10.8 9.2l4.2 3.7"/>' +
        '<path d="M22.2 18.5h1.6a2.8 2.8 0 0 0 2.8-2.8V7.2a1.4 1.4 0 0 0-2.8 0v4.1"/>' +
        '<path d="M9.2 6.2l1.2 1.1M8.2 9.2l1.2 1.1"/>' +
      '</svg>'
    );
  }
  function iconeAtalhos() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true">' +
        '<rect x="3" y="8" width="26" height="16" rx="3"/>' +
        '<path d="M8 13h2M13 13h2M17 13h2M22 13h2M8 17h2M22 17h2M11 20h10" stroke-linecap="round"/>' +
      '</svg>'
    );
  }
  function iconeRestaurar() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M7 11V6h5M7 6l4.2 4.2A10 10 0 1 1 6 16" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }
  function iconeFecharCircular() {
    return (
      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<circle cx="16" cy="16" r="11"/>' +
        '<path d="m12 12 8 8M20 12l-8 8" stroke-linecap="round"/>' +
      '</svg>'
    );
  }
  function iconeAcessibilidadeUniversalSvg() {
    return (
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="12" cy="4.2" r="2.2"/>' +
        '<path d="M4 8a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2h-5.8v3.2l4.2 8.6a1 1 0 1 1-1.8.9L12 14.8l-3.6 6.9a1 1 0 1 1-1.8-.9l4.2-8.6V9H5a1 1 0 0 1-1-1Z"/>' +
      '</svg>'
    );
  }

  /* ---------------------------------------------------------------
   * Injeta o botão flutuante de acessibilidade usando acessibilidade.jpg
   * --------------------------------------------------------------- */
  function injetarIconesFixos() {
    if (document.querySelector(".icones-fixos")) return;

    var caminhoIcone = obterCaminhoBase() + "assets/img/icones/acessibilidade.jpg";
    var container = document.createElement("div");
    container.className = "icones-fixos";
    container.innerHTML =
      '<div class="icone-fixo-item">' +
        '<button type="button" class="icone-fixo icone-fixo--acessibilidade" accesskey="0" data-abrir-painel-acessibilidade aria-haspopup="dialog" aria-expanded="false" aria-controls="painel-acessibilidade" aria-describedby="legenda-acessibilidade" aria-label="Abrir menu de acessibilidade (Alt + 0)">' +
          '<img class="icone-fixo__img" src="' + caminhoIcone + '" alt="" aria-hidden="true" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\';">' +
          '<span style="display:none;width:26px;height:26px;" aria-hidden="true">' + iconeAcessibilidadeUniversalSvg() + '</span>' +
        '</button>' +
        '<span class="icone-fixo__legenda" id="legenda-acessibilidade" role="tooltip">' +
          '<span class="text-uppercase">Acessibilidade (Alt + 0)</span>' +
        '</span>' +
      '</div>';
    document.body.appendChild(container);
  }

  /* ---------------------------------------------------------------
   * Inicialização
   * --------------------------------------------------------------- */
  function iniciar() {
    injetarIconesFixos();
    construirPainel();
    aplicarEstado();
    document.addEventListener("click", tratarClique);
    document.addEventListener("keydown", tratarTeclado);
  }

  window.Consis360Acessibilidade = {
    sincronizarUI: aplicarEstado,
    anunciar: anunciar
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
