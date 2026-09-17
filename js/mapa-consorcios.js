/**
 * CONSIS360 — Motor do mapa de consórcios (Leaflet)
 * ------------------------------------------------------------------
 * Componente genérico reutilizado pelas páginas:
 *   - paginas/mapa-saude.html
 *   - paginas/mapa-multifinalitarios.html
 *
 * Cada página define window.CONSIS360_MAPA_CONFIG antes de chamar
 * iniciarMapaConsorcios(), por exemplo:
 *
 *   window.CONSIS360_MAPA_CONFIG = {
 *     dadosUrl: "../data/consorcios_saude.json",
 *     geojsonUrl: "../data/municipios_saude.geojson",
 *     mostrarSecretario: false
 *   };
 *
 * Requisitos atendidos (ver instrução do protótipo):
 *   - Mapa mostra por padrão todas as regiões cadastradas
 *   - Hover na região colorida => tooltip com Nº consorciados,
 *     população atendida e área ocupacional
 *   - Clique na região => modal com ficha técnica completa
 *   - Lista lateral com busca, acessível por teclado (alternativa
 *     não-visual ao mapa, essencial para leitor de tela)
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var util = window.Consis360Utils;
  var config = window.CONSIS360_MAPA_CONFIG || {};

  var mapa;
  var camadaGeojson;
  var regioesPorId = {};
  var camadaComTooltipAberto = null;

  function fecharTooltipAberto() {
    if (camadaComTooltipAberto && camadaComTooltipAberto.closeTooltip) {
      camadaComTooltipAberto.closeTooltip();
    }
    camadaComTooltipAberto = null;
  }

  function iniciar() {
    carregarDados();
  }

  function carregarDados() {
    Promise.all([
      fetch(config.dadosUrl).then(verificarResposta),
      fetch(config.geojsonUrl).then(verificarResposta)
    ])
      .then(function (resultados) {
        var regioes = resultados[0];
        var geojson = resultados[1];
        regioes.forEach(function (r) { regioesPorId[r.id] = r; });
        montarEstatisticasGerais(regioes);
        montarListaRegioes(regioes);
        montarMapa(geojson);
      })
      .catch(function (erro) {
        exibirErroCarregamento(erro);
      });
  }

  function verificarResposta(resposta) {
    if (!resposta.ok) {
      throw new Error("Falha ao carregar " + resposta.url + " (HTTP " + resposta.status + ")");
    }
    return resposta.json();
  }

  function exibirErroCarregamento(erro) {
    console.error(erro);
    var mapaEl = document.getElementById("mapa-leaflet");
    if (mapaEl) {
      mapaEl.innerHTML =
        '<div class="alerta alerta--erro" style="margin:1rem;">' +
        "Não foi possível carregar os dados do mapa. Se você está testando localmente, " +
        "sirva os arquivos por um servidor HTTP (ex.: <code>python -m http.server</code>) " +
        "em vez de abrir o HTML diretamente pelo sistema de arquivos." +
        "</div>";
    }
  }

  /* ---------------------------------------------------------------
   * Estatísticas gerais (topo do painel lateral)
   * --------------------------------------------------------------- */
  function montarEstatisticasGerais(regioes) {
    var totalRegioes = regioes.length;
    var totalMunicipios = regioes.reduce(function (soma, r) { return soma + (r.municipios ? r.municipios.length : 0); }, 0);
    var totalPopulacao = regioes.reduce(function (soma, r) { return soma + (r.populacao || 0); }, 0);

    setTexto("estatistica-regioes", util.formatarNumero(totalRegioes));
    setTexto("estatistica-municipios", util.formatarNumero(totalMunicipios));
    setTexto("estatistica-populacao", util.formatarNumero(totalPopulacao));
  }

  function setTexto(id, texto) {
    var el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  /* ---------------------------------------------------------------
   * Lista lateral de regiões — alternativa acessível ao mapa
   * --------------------------------------------------------------- */
  function montarListaRegioes(regioes) {
    var lista = document.getElementById("lista-regioes");
    if (!lista) return;

    function renderizar(filtro) {
      var termo = (filtro || "").trim().toLowerCase();
      lista.innerHTML = "";
      regioes
        .filter(function (r) {
          if (!termo) return true;
          return (
            (r.nomeReduzido || "").toLowerCase().indexOf(termo) > -1 ||
            (r.regiao || "").toLowerCase().indexOf(termo) > -1 ||
            (r.municipios || []).some(function (m) { return m.nome.toLowerCase().indexOf(termo) > -1; })
          );
        })
        .forEach(function (r) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "item-regiao";
          item.setAttribute("data-regiao-id", r.id);
          item.innerHTML =
            '<span class="item-regiao__cor" style="background:' + r.cor + '" aria-hidden="true"></span>' +
            '<span>' +
              '<p class="item-regiao__nome">' + util.escaparHtml(r.nomeReduzido) + '</p>' +
              '<p class="item-regiao__regiao-nome">' + util.escaparHtml(r.regiao) + '</p>' +
            '</span>';
          item.addEventListener("click", function () {
            abrirModalRegiao(r.id);
            destacarRegiaoNoMapa(r.id);
          });
          lista.appendChild(item);
        });

      if (lista.children.length === 0) {
        lista.innerHTML = '<p class="painel-lateral__instrucao">Nenhuma região encontrada para essa busca.</p>';
      }
    }

    renderizar("");

    var campoBusca = document.getElementById("busca-municipio");
    if (campoBusca) {
      campoBusca.addEventListener("input", util.debounce(function () {
        renderizar(campoBusca.value);
      }, 200));
    }
  }

  /* ---------------------------------------------------------------
   * Mapa Leaflet
   * --------------------------------------------------------------- */
  function montarMapa(geojson) {
    mapa = L.map("mapa-leaflet", {
      scrollWheelZoom: false,
      attributionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contribuidores'
    }).addTo(mapa);

    camadaGeojson = L.geoJSON(geojson, {
      style: estiloMunicipio,
      onEachFeature: configurarFeature
    }).addTo(mapa);

    var limites = camadaGeojson.getBounds();
    if (limites.isValid()) {
      mapa.fitBounds(limites, { padding: [16, 16] });
    } else {
      mapa.setView([-12.5, -41.7], 6);
    }

    // Habilita zoom por roda do mouse só depois de clicar no mapa (evita "sequestro" do scroll da página)
    mapa.on("focus", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });

    mapa.getContainer().setAttribute(
      "aria-label",
      "Mapa interativo dos municípios da Bahia coloridos por consórcio. Para navegação por teclado ou leitor de tela, use a lista de regiões ao lado, que traz as mesmas informações."
    );
  }

  function estiloMunicipio(feature) {
    var cor = feature.properties.cor || "#e2e8f0";
    return {
      fillColor: cor,
      fillOpacity: 0.82,
      color: "#20304d",
      weight: 0.6
    };
  }

  function estiloDestaque(camada) {
    camada.setStyle({ weight: 2.5, color: "#0b2f6b", fillOpacity: 0.95 });
    camada.bringToFront();
  }

  function configurarFeature(feature, camada) {
    var props = feature.properties;

    camada.on("mouseover", function () {
      estiloDestaque(camada);
      camadaComTooltipAberto = camada;
      camada.bindTooltip(montarConteudoTooltip(props), {
        sticky: true,
        direction: "top",
        opacity: 1,
        className: "tooltip-consorcio"
      }).openTooltip();
    });

    camada.on("mouseout", function () {
      camadaGeojson.resetStyle(camada);
      camada.closeTooltip();
      if (camadaComTooltipAberto === camada) camadaComTooltipAberto = null;
    });

    camada.on("click", function () {
      var listaConsorcios = props.consorcios || [];
      if (listaConsorcios.length > 1) {
        abrirModalMunicipioMultiplo(props);
      } else if (props.regionId !== null && props.regionId !== undefined) {
        abrirModalRegiao(props.regionId);
        estiloDestaque(camada);
      }
    });
  }

  function montarConteudoTooltip(props) {
    if (props.regionId === null || props.regionId === undefined) {
      return (
        '<p class="tooltip-consorcio__titulo">' + util.escaparHtml(props.nome) + "</p>" +
        "<p>Município não integra nenhum consórcio cadastrado nesta camada.</p>"
      );
    }
    var regiao = regioesPorId[props.regionId];
    if (!regiao) return util.escaparHtml(props.nome);

    var extra = "";
    if (props.consorcios && props.consorcios.length > 1) {
      extra = '<p style="margin-top:6px;font-style:italic;">Também conveniado a mais ' + (props.consorcios.length - 1) + " outro(s) consórcio(s). Clique para ver todos.</p>";
    }

    return (
      '<p class="tooltip-consorcio__titulo">' + util.escaparHtml(regiao.nomeReduzido) + "</p>" +
      "<p>" + util.escaparHtml(regiao.regiao) + "</p>" +
      '<div class="tooltip-consorcio__linha"><span>Nº de consorciados</span><strong>' + util.formatarNumero(regiao.totalConsorciados) + "</strong></div>" +
      '<div class="tooltip-consorcio__linha"><span>População atendida</span><strong>' + util.formatarNumero(regiao.populacao) + "</strong></div>" +
      '<div class="tooltip-consorcio__linha"><span>Área ocupacional</span><strong>' + util.formatarArea(regiao.areaTotalKm2) + "</strong></div>" +
      extra
    );
  }

  function destacarRegiaoNoMapa(regionId) {
    if (!camadaGeojson) return;
    var alvo = null;
    camadaGeojson.eachLayer(function (camada) {
      var props = camada.feature.properties;
      if (props.regionId === regionId) {
        estiloDestaque(camada);
        if (!alvo) alvo = camada;
      } else {
        camadaGeojson.resetStyle(camada);
      }
    });
    if (alvo && alvo.getBounds) {
      mapa.fitBounds(alvo.getBounds(), { maxZoom: 8, padding: [24, 24] });
    }
    document.querySelectorAll(".item-regiao").forEach(function (el) {
      el.classList.toggle("ativo", Number(el.getAttribute("data-regiao-id")) === regionId);
    });
  }

  /* ---------------------------------------------------------------
   * Modal de ficha técnica do consórcio
   * --------------------------------------------------------------- */
  function garantirModal() {
    var modal = document.getElementById("modal-consorcio");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modal-consorcio";
    modal.className = "modal-fundo";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-consorcio-titulo");
    modal.innerHTML = '<div class="modal-caixa" id="modal-consorcio-corpo"></div>';
    document.body.appendChild(modal);

    modal.addEventListener("click", function (evento) {
      if (evento.target === modal) fecharModal();
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && modal.classList.contains("aberto")) fecharModal();
    });

    return modal;
  }

  function abrirModalRegiao(regionId) {
    var regiao = regioesPorId[regionId];
    if (!regiao) return;
    fecharTooltipAberto();
    var modal = garantirModal();
    var corpo = document.getElementById("modal-consorcio-corpo");
    corpo.innerHTML = montarFichaTecnica(regiao);
    modal.classList.add("aberto");
    var botaoFechar = corpo.querySelector(".modal-caixa__fechar");
    if (botaoFechar) {
      botaoFechar.addEventListener("click", fecharModal);
      botaoFechar.focus();
    }
  }

  function abrirModalMunicipioMultiplo(props) {
    fecharTooltipAberto();
    var modal = garantirModal();
    var corpo = document.getElementById("modal-consorcio-corpo");
    var opcoes = props.consorcios.map(function (c) {
      var r = regioesPorId[c.regionId];
      return (
        '<li class="painel-acessibilidade__item">' +
          '<button type="button" class="botao botao--secundario" style="width:100%;justify-content:flex-start;" data-abrir-regiao="' + c.regionId + '">' +
            util.escaparHtml(r ? r.nomeReduzido : c.nomeReduzido) + " — " + util.escaparHtml(r ? r.regiao : c.regiao) +
          "</button>" +
        "</li>"
      );
    }).join("");

    corpo.innerHTML =
      '<button type="button" class="modal-caixa__fechar" aria-label="Fechar">&times;</button>' +
      '<h2 id="modal-consorcio-titulo">' + util.escaparHtml(props.nome) + "</h2>" +
      "<p>Este município é conveniado a mais de um consórcio multifinalitário. Selecione qual deseja consultar:</p>" +
      '<ul class="painel-acessibilidade__lista" style="padding:0;">' + opcoes + "</ul>";

    modal.classList.add("aberto");
    corpo.querySelector(".modal-caixa__fechar").addEventListener("click", fecharModal);
    corpo.querySelectorAll("[data-abrir-regiao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        abrirModalRegiao(Number(botao.getAttribute("data-abrir-regiao")));
      });
    });
  }

  function montarFichaTecnica(regiao) {
    var linhaSecretario = config.mostrarSecretario
      ? '<div><dt>Secretário(a)</dt><dd>' + util.valorOuPendente(regiao.secretario) + "</dd></div>"
      : "";
    var linhaEmail = regiao.email
      ? '<div><dt>E-mail</dt><dd><a href="mailto:' + util.escaparHtml(regiao.email) + '">' + util.escaparHtml(regiao.email) + "</a></dd></div>"
      : "";
    var linhaCnpj = regiao.cnpj
      ? "<div><dt>CNPJ</dt><dd>" + util.escaparHtml(regiao.cnpj) + "</dd></div>"
      : "";
    var linhaSite = regiao.site
      ? '<div><dt>Site</dt><dd><a href="https://' + util.escaparHtml(regiao.site.replace(/^https?:\/\//, "")) + '" target="_blank" rel="noopener">' + util.escaparHtml(regiao.site) + "</a></dd></div>"
      : "";

    var subtitulo = regiao.sigla && regiao.sigla !== regiao.nomeReduzido
      ? '<p class="modal-caixa__regiao">' + util.escaparHtml(regiao.regiao) + " · " + util.escaparHtml(regiao.sigla) + "</p>"
      : '<p class="modal-caixa__regiao">' + util.escaparHtml(regiao.regiao) + "</p>";

    var listaMunicipios = (regiao.municipios || [])
      .map(function (m) { return "<li>" + util.escaparHtml(m.nome) + "</li>"; })
      .join("");

    return (
      '<button type="button" class="modal-caixa__fechar" aria-label="Fechar detalhes do consórcio">&times;</button>' +
      '<div class="modal-caixa__cabecalho">' +
        '<img class="modal-caixa__logo" src="' + (window.CONSIS360_BASE || "") + regiao.logo + '" alt="Logomarca do consórcio ' + util.escaparHtml(regiao.nomeReduzido) + '" onerror="this.style.display=\'none\'">' +
        "<div>" +
          '<h2 class="modal-caixa__titulo" id="modal-consorcio-titulo">' + util.escaparHtml(regiao.nomeReduzido) + "</h2>" +
          subtitulo +
        "</div>" +
      "</div>" +
      (regiao.consorcio && regiao.consorcio !== regiao.nomeReduzido
        ? '<p style="color:var(--cor-texto-suave);font-size:0.85rem;margin-top:-0.75rem;">' + util.escaparHtml(regiao.consorcio) + "</p>"
        : "") +
      '<dl class="ficha-tecnica">' +
        "<div><dt>Presidente</dt><dd>" + util.valorOuPendente(regiao.presidente) + "</dd></div>" +
        "<div><dt>Município Pres.</dt><dd>" + util.valorOuPendente(regiao.municipioPresidente) + "</dd></div>" +
        "<div><dt>Sede</dt><dd>" + util.valorOuPendente(regiao.sede) + "</dd></div>" +
        linhaSecretario +
        "<div><dt>Total de conveniados</dt><dd>" + util.formatarNumero(regiao.totalConsorciados) + "</dd></div>" +
        "<div><dt>População atendida</dt><dd>" + util.formatarNumero(regiao.populacao) + "</dd></div>" +
        "<div><dt>Área total</dt><dd>" + util.formatarArea(regiao.areaTotalKm2) + "</dd></div>" +
        linhaEmail +
        linhaCnpj +
        linhaSite +
      "</dl>" +
      '<div class="municipios-lista">' +
        '<p class="municipios-lista__titulo">Municípios conveniados (' + (regiao.municipios || []).length + ")</p>" +
        '<ul class="municipios-lista__tags">' + listaMunicipios + "</ul>" +
      "</div>"
    );
  }

  function fecharModal() {
    var modal = document.getElementById("modal-consorcio");
    if (modal) modal.classList.remove("aberto");
  }

  window.iniciarMapaConsorcios = iniciar;
})();
