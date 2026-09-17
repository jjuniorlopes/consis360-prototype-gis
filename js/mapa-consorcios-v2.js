/**
 * CONSIS360 — Motor do mapa de consórcios v2 (painel lateral)
 * ------------------------------------------------------------------
 * Usado exclusivamente pela página de Mapa de Consórcios Multifinalitários
 * (paginas/mapa-multifinalitarios.html). A página de Saúde continua usando
 * o motor antigo (js/mapa-consorcios.js, com modal central) até receber
 * seu próprio layout novo.
 *
 * Diferenças em relação ao motor v1:
 *   - Ficha técnica abre num PAINEL LATERAL (3ª coluna), não um modal
 *     centralizado — nunca cobre o mapa.
 *   - Hover num município mostra dados DO MUNICÍPIO (nome do consórcio,
 *     município, população e área individuais) — não mais o total da região.
 *   - Clique (lista ou mapa) dá zoom na região, esmaece as demais
 *     (fillOpacity baixo) e abre o painel.
 *   - Cards de estatística: "Consórcios cadastrados" fica fixo (total do
 *     estado); "Municípios conveniados" e "População atendida" mostram o
 *     total da região em foco (hover ou seleção) e voltam ao total geral
 *     quando nada está em foco.
 *   - Pino da cidade-sede aparece no mapa quando uma região é selecionada.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var util = window.Consis360Utils;
  var config = window.CONSIS360_MAPA_CONFIG || {};

  var mapa;
  var camadaGeojson;
  var regioesPorId = {};
  var totalGeral = { regioes: 0, municipios: 0, populacao: 0 };
  var regiaoSelecionadaId = null;
  var marcadorSede = null;
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
        calcularTotaisGerais(regioes);
        aplicarEstatisticas(totalGeral.municipios, totalGeral.populacao, totalGeral.regioes);
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

  function calcularTotaisGerais(regioes) {
    totalGeral.regioes = regioes.length;
    // Municípios conveniados: contagem de municípios ÚNICOS (um município em 2
    // consórcios ao mesmo tempo é contado uma vez só no total geral do estado).
    var ibgesUnicos = {};
    regioes.forEach(function (r) {
      (r.municipios || []).forEach(function (m) { ibgesUnicos[m.ibge] = true; });
    });
    totalGeral.municipios = Object.keys(ibgesUnicos).length;
    totalGeral.populacao = regioes.reduce(function (soma, r) { return soma + (r.populacao || 0); }, 0);
  }

  function aplicarEstatisticas(municipios, populacao, regioesCount) {
    setTexto("estatistica-regioes", util.formatarNumero(regioesCount !== undefined ? regioesCount : totalGeral.regioes));
    setTexto("estatistica-municipios", util.formatarNumero(municipios));
    setTexto("estatistica-populacao", util.formatarNumero(populacao));
  }

  function mostrarEstatisticasRegiao(regiao) {
    aplicarEstatisticas(regiao.totalConsorciados, regiao.populacao);
  }

  function mostrarEstatisticasGerais() {
    aplicarEstatisticas(totalGeral.municipios, totalGeral.populacao);
  }

  function setTexto(id, texto) {
    var el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  function montarListaRegioes(regioes) {
    var lista = document.getElementById("lista-regioes");
    if (!lista) return;

    var botaoTodos = document.getElementById("botao-todos-consorcios");
    if (botaoTodos) {
      botaoTodos.addEventListener("click", function () {
        resetarSelecao();
      });
    }

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
            console.log("[CONSIS360] clique na lista — região:", r.nomeReduzido, "| id:", r.id);
            selecionarRegiao(r.id);
          });
          lista.appendChild(item);
        });

      if (lista.children.length === 0) {
        lista.innerHTML = '<p class="painel-lateral__instrucao">Nenhuma região encontrada para essa busca.</p>';
      }
    }

    renderizar("");
    lista.__renderizar = renderizar;

    var campoBusca = document.getElementById("busca-municipio");
    if (campoBusca) {
      campoBusca.addEventListener("input", util.debounce(function () {
        renderizar(campoBusca.value);
        if (!campoBusca.value.trim()) {
          resetarSelecao();
        }
      }, 200));
    }
  }

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

    mapa.on("focus", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });

    mapa.getContainer().setAttribute(
      "aria-label",
      "Mapa interativo dos municípios da Bahia coloridos por consórcio multifinalitário. Para navegação por teclado ou leitor de tela, use a lista de consórcios ao lado, que traz as mesmas informações."
    );
  }

  function estiloMunicipio(feature) {
    var cor = feature.properties.cor || "#e2e8f0";
    return { fillColor: cor, fillOpacity: 0.82, color: "#20304d", weight: 0.6 };
  }

  function estiloEsmaecido(feature) {
    var cor = feature.properties.cor || "#e2e8f0";
    return { fillColor: cor, fillOpacity: 0.12, color: "#20304d", weight: 0.3 };
  }

  function estiloDestaque(camada) {
    camada.setStyle({ weight: 2.5, color: "#0b2f6b", fillOpacity: 0.95 });
    camada.bringToFront();
  }

  function configurarFeature(feature, camada) {
    var props = feature.properties;

    camada.on("mouseover", function () {
      if (regiaoSelecionadaId === null || pertenceARegiao(props, regiaoSelecionadaId)) {
        camada.setStyle({ weight: 1.6, color: "#0b2f6b" });
      }
      camadaComTooltipAberto = camada;
      camada.bindTooltip(montarConteudoTooltipMunicipio(props), {
        sticky: true,
        direction: "top",
        opacity: 1,
        className: "tooltip-consorcio"
      }).openTooltip();

      if (props.regionId !== null && props.regionId !== undefined && regiaoSelecionadaId === null) {
        mostrarEstatisticasRegiao(regioesPorId[props.regionId]);
      }
    });

    camada.on("mouseout", function () {
      camada.closeTooltip();
      if (camadaComTooltipAberto === camada) camadaComTooltipAberto = null;
      if (regiaoSelecionadaId === null) {
        camadaGeojson.resetStyle(camada);
        mostrarEstatisticasGerais();
      } else if (pertenceARegiao(props, regiaoSelecionadaId)) {
        estiloDestaque(camada);
      } else {
        camada.setStyle(estiloEsmaecido(feature));
      }
    });

    camada.on("click", function () {
      console.log("[CONSIS360] clique no mapa — município:", props.nome, "| regionId:", props.regionId, "| consorcios:", props.consorcios);
      var listaConsorcios = props.consorcios || [];
      if (listaConsorcios.length > 1) {
        abrirEscolhaMunicipioMultiplo(props);
      } else if (props.regionId !== null && props.regionId !== undefined) {
        selecionarRegiao(props.regionId);
      } else {
        console.log("[CONSIS360] município sem consórcio associado — nada a abrir.");
      }
    });
  }

  function pertenceARegiao(props, regionId) {
    return (props.consorcios || []).some(function (c) { return c.regionId === regionId; });
  }

  function montarConteudoTooltipMunicipio(props) {
    if (props.regionId === null || props.regionId === undefined) {
      return (
        '<p class="tooltip-consorcio__titulo">' + util.escaparHtml(props.nome) + "</p>" +
        "<p>Município não integra nenhum consórcio multifinalitário cadastrado.</p>"
      );
    }
    var titulo = (props.consorcios || [])
      .map(function (c) { return c.nomeReduzido; })
      .join(" e ");
    var extra = "";
    if (props.consorcios && props.consorcios.length > 1) {
      extra = '<p style="margin-top:6px;font-style:italic;">Também conveniado com outro consórcio.</p>';
    }
    return (
      '<p class="tooltip-consorcio__titulo">' + util.escaparHtml(titulo) + "</p>" +
      '<div class="tooltip-consorcio__linha"><span>Município</span><strong>' + util.escaparHtml(props.nome) + "</strong></div>" +
      '<div class="tooltip-consorcio__linha"><span>População atendida</span><strong>' + util.formatarNumero(props.populacao) + "</strong></div>" +
      '<div class="tooltip-consorcio__linha"><span>Área ocupacional</span><strong>' + util.formatarArea(props.areaKm2) + "</strong></div>" +
      extra
    );
  }

  function selecionarRegiao(regionId) {
    console.log("[CONSIS360] selecionarRegiao chamada com id:", regionId);
    var regiao = regioesPorId[regionId];
    if (!regiao) {
      console.warn("[CONSIS360] nenhuma região encontrada para id:", regionId, "— regioesPorId tem chaves:", Object.keys(regioesPorId));
      return;
    }
    regiaoSelecionadaId = regionId;
    aplicarEstiloSelecao();
    posicionarPinoSede(regiao);
    mostrarEstatisticasRegiao(regiao);
    abrirPainelRegiao(regionId);

    document.querySelectorAll(".item-regiao").forEach(function (el) {
      el.classList.toggle("ativo", Number(el.getAttribute("data-regiao-id")) === regionId);
    });
    var botaoTodos = document.getElementById("botao-todos-consorcios");
    if (botaoTodos) botaoTodos.classList.remove("ativo");
  }

  function aplicarEstiloSelecao() {
    if (!camadaGeojson || regiaoSelecionadaId === null) return;
    var limitesRegiao = null;
    camadaGeojson.eachLayer(function (camada) {
      var props = camada.feature.properties;
      if (pertenceARegiao(props, regiaoSelecionadaId)) {
        estiloDestaque(camada);
        if (camada.getBounds) {
          limitesRegiao = limitesRegiao ? limitesRegiao.extend(camada.getBounds()) : camada.getBounds();
        }
      } else {
        camada.setStyle(estiloEsmaecido(camada.feature));
      }
    });
    if (limitesRegiao) {
      mapa.fitBounds(limitesRegiao, { maxZoom: 9, padding: [32, 32] });
    }
  }

  function resetarSelecao() {
    regiaoSelecionadaId = null;
    if (camadaGeojson) {
      camadaGeojson.eachLayer(function (camada) { camadaGeojson.resetStyle(camada); });
      var limites = camadaGeojson.getBounds();
      if (limites.isValid()) mapa.fitBounds(limites, { padding: [16, 16] });
    }
    mostrarEstatisticasGerais();
    fecharPainel();
    removerPinoSede();
    document.querySelectorAll(".item-regiao").forEach(function (el) { el.classList.remove("ativo"); });
    var botaoTodos = document.getElementById("botao-todos-consorcios");
    if (botaoTodos) botaoTodos.classList.add("ativo");
    var campoBusca = document.getElementById("busca-municipio");
    if (campoBusca) campoBusca.value = "";
    var lista = document.getElementById("lista-regioes");
    if (lista && lista.__renderizar) lista.__renderizar("");
  }

  function posicionarPinoSede(regiao) {
    removerPinoSede();
    if (!regiao || !regiao.sede || !camadaGeojson) return;
    var alvoCamada = null;
    camadaGeojson.eachLayer(function (camada) {
      if (alvoCamada) return;
      var props = camada.feature.properties;
      if (props.nome === regiao.sede && pertenceARegiao(props, regiao.id)) {
        alvoCamada = camada;
      }
    });
    if (!alvoCamada || !alvoCamada.getBounds) return;
    var centro = alvoCamada.getBounds().getCenter();
    var icone = L.icon({
      iconUrl: (window.CONSIS360_BASE || "") + "assets/img/icones/pino-cidade-sede.png",
      iconSize: [22, 29],
      iconAnchor: [11, 29],
      popupAnchor: [0, -26]
    });
    marcadorSede = L.marker(centro, { icon: icone, zIndexOffset: 1000, keyboard: false, alt: "Cidade sede: " + regiao.sede }).addTo(mapa);
    marcadorSede.bindTooltip("Sede: " + regiao.sede, { direction: "top", offset: [0, -26] });
  }

  function removerPinoSede() {
    if (marcadorSede) {
      mapa.removeLayer(marcadorSede);
      marcadorSede = null;
    }
  }

  function abrirPainelRegiao(regionId) {
    console.log("[CONSIS360] abrirPainelRegiao chamada com id:", regionId);
    var regiao = regioesPorId[regionId];
    if (!regiao) return;
    fecharTooltipAberto();
    var painel = document.getElementById("painel-detalhe");
    if (!painel) {
      console.error("[CONSIS360] elemento #painel-detalhe não encontrado no HTML!");
      return;
    }
    try {
      painel.innerHTML = montarFichaTecnica(regiao);
      painel.classList.add("aberto");
      console.log("[CONSIS360] painel preenchido com sucesso para:", regiao.nomeReduzido, "| innerHTML tem", painel.innerHTML.length, "caracteres | classList:", painel.className);
      var botaoFechar = painel.querySelector(".painel-detalhe__fechar");
      if (botaoFechar) {
        botaoFechar.addEventListener("click", function () {
          resetarSelecao();
        });
      }
    } catch (erro) {
      console.error("CONSIS360: falha ao montar a ficha técnica de", regiao.nomeReduzido, erro);
      painel.innerHTML =
        '<button type="button" class="painel-detalhe__fechar" aria-label="Fechar">&times;</button>' +
        '<div class="alerta alerta--erro">Não foi possível carregar os detalhes de "' +
        util.escaparHtml(regiao.nomeReduzido) +
        '". Veja o console do navegador (F12) para mais detalhes.</div>';
      painel.classList.add("aberto");
      var botaoFecharErro = painel.querySelector(".painel-detalhe__fechar");
      if (botaoFecharErro) botaoFecharErro.addEventListener("click", function () { resetarSelecao(); });
    }
  }

  function abrirEscolhaMunicipioMultiplo(props) {
    fecharTooltipAberto();
    var painel = document.getElementById("painel-detalhe");
    if (!painel) return;
    var opcoes = props.consorcios.map(function (c) {
      var r = regioesPorId[c.regionId];
      return (
        '<li>' +
          '<button type="button" class="botao botao--secundario" style="width:100%;justify-content:flex-start;" data-abrir-regiao="' + c.regionId + '">' +
            util.escaparHtml(r ? r.nomeReduzido : c.nomeReduzido) + " — " + util.escaparHtml(r ? r.regiao : c.regiao) +
          "</button>" +
        "</li>"
      );
    }).join("");

    painel.innerHTML =
      '<button type="button" class="painel-detalhe__fechar" aria-label="Fechar">&times;</button>' +
      "<h2>" + util.escaparHtml(props.nome) + "</h2>" +
      "<p>Este município é conveniado a mais de um consórcio multifinalitário. Selecione qual deseja consultar:</p>" +
      '<ul style="list-style:none;padding:0;display:grid;gap:8px;">' + opcoes + "</ul>";

    painel.classList.add("aberto");
    painel.querySelector(".painel-detalhe__fechar").addEventListener("click", function () { resetarSelecao(); });
    painel.querySelectorAll("[data-abrir-regiao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        selecionarRegiao(Number(botao.getAttribute("data-abrir-regiao")));
      });
    });
  }

  function fecharPainel() {
    var painel = document.getElementById("painel-detalhe");
    if (painel) {
      painel.classList.remove("aberto");
      painel.innerHTML = "";
    }
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

    var listaMunicipios = (regiao.municipios || [])
      .map(function (m) { return "<li>" + util.escaparHtml(m.nome) + "</li>"; })
      .join("");

    return (
      '<button type="button" class="painel-detalhe__fechar" aria-label="Fechar detalhes do consórcio">&times;</button>' +
      '<div class="painel-detalhe__cabecalho">' +
        '<img class="painel-detalhe__logo" src="' + (window.CONSIS360_BASE || "") + regiao.logo + '" alt="Logomarca do consórcio ' + util.escaparHtml(regiao.nomeReduzido) + '" onerror="this.style.display=\'none\'">' +
        "<div>" +
          '<h2 class="painel-detalhe__titulo">' + util.escaparHtml(regiao.nomeReduzido) + "</h2>" +
          '<p class="painel-detalhe__regiao">' + util.escaparHtml(regiao.regiao) + "</p>" +
        "</div>" +
      "</div>" +
      (regiao.consorcio && regiao.consorcio !== regiao.nomeReduzido
        ? '<p class="painel-detalhe__nome-completo">' + util.escaparHtml(regiao.consorcio) + "</p>"
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

  window.iniciarMapaConsorcios = iniciar;
})();
