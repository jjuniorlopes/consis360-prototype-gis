/**
 * CONSIS360 — Motor do mapa de consórcios v2 (painel lateral)
 * ------------------------------------------------------------------
 * Usado pelas páginas de Mapa de Consórcios Multifinalitários e de Saúde
 * (paginas/mapa-multifinalitarios.html e paginas/mapa-saude.html). O que muda
 * entre as duas vem de window.CONSIS360_MAPA_CONFIG (ícone do pino da sede,
 * rótulos, campos extras da ficha técnica).
 *
 * Diferenças em relação ao motor v1:
 *   - Ficha técnica abre num PAINEL LATERAL (3ª coluna), não um modal
 *     centralizado — nunca cobre o mapa.
 *   - Hover num município mostra dados DO MUNICÍPIO (nome do consórcio,
 *     município, população e área individuais) — não mais o total da região.
 *   - Clique (lista ou mapa) dá zoom na região, esmaece as demais
 *     (fillOpacity baixo) e abre o painel.
 *   - Cards de estatística: "Consórcios cadastrados" fica fixo (total do
 *     estado); "Municípios consorciados" e "População beneficiada" mostram o
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
  var regioesCarregadas = null;
  var geojsonCarregado = null;

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
        regioesCarregadas = regioes;
        geojsonCarregado = geojson;
        regioes.forEach(function (r) { regioesPorId[r.id] = r; });
        calcularTotaisGerais(regioes);
        aplicarEstatisticas(totalGeral.municipios, totalGeral.populacao, totalGeral.regioes);
        montarListaRegioes(regioes);
        montarMapa(geojson);
        configurarBotoesExportacao();
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
    // Municípios consorciados: contagem de municípios ÚNICOS (um município em 2
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
          var ativo = regiaoSelecionadaId === r.id;
          var item = document.createElement("button");
          item.type = "button";
          item.className = "item-regiao" + (ativo ? " ativo" : "");
          item.setAttribute("data-regiao-id", r.id);
          item.setAttribute("aria-pressed", ativo ? "true" : "false");
          item.innerHTML =
            '<span class="item-regiao__cor" style="background:' + r.cor + '" aria-hidden="true"></span>' +
            '<span>' +
              '<p class="item-regiao__nome">' + util.escaparHtml(r.nomeReduzido) + '</p>' +
              '<p class="item-regiao__regiao-nome">' + util.escaparHtml(r.regiao) + '</p>' +
            '</span>';
          item.addEventListener("click", function () {
            selecionarRegiao(r.id, true);
          });
          lista.appendChild(item);
        });

      var statusBusca = document.getElementById("status-busca-regioes");
      if (lista.children.length === 0) {
        lista.innerHTML = '<p class="painel-lateral__instrucao">Nenhuma região encontrada para essa busca.</p>';
        if (statusBusca && termo) {
          statusBusca.textContent = "Nenhuma região encontrada para " + filtro + ".";
        }
      } else if (statusBusca && termo) {
        statusBusca.textContent = lista.children.length + (lista.children.length === 1 ? " consórcio encontrado." : " consórcios encontrados.");
      } else if (statusBusca) {
        statusBusca.textContent = "";
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
      "Mapa interativo dos municípios da Bahia coloridos por consórcio " + (config.rotuloTipo || "multifinalitário") + ". Para navegação por teclado ou leitor de tela, use a lista de consórcios ao lado, que traz as mesmas informações."
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
      var listaConsorcios = props.consorcios || [];
      if (listaConsorcios.length > 1) {
        abrirEscolhaMunicipioMultiplo(props);
      } else if (props.regionId !== null && props.regionId !== undefined) {
        selecionarRegiao(props.regionId);
      } else {
        abrirPainelSemConsorcio(props);
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
        "<p>Município não integra nenhum consórcio " + (config.rotuloTipo || "multifinalitário") + " cadastrado.</p>"
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
      '<div class="tooltip-consorcio__linha"><span>População beneficiada</span><strong>' + util.formatarNumero(props.populacao) + "</strong></div>" +
      '<div class="tooltip-consorcio__linha"><span>Área ocupacional</span><strong>' + util.formatarArea(props.areaKm2) + "</strong></div>" +
      extra
    );
  }

  function selecionarRegiao(regionId, moverFocoPainel) {
    var regiao = regioesPorId[regionId];
    if (!regiao) {
      console.warn("[CONSIS360] nenhuma região encontrada para id:", regionId, "— regioesPorId tem chaves:", Object.keys(regioesPorId));
      return;
    }
    regiaoSelecionadaId = regionId;
    aplicarEstiloSelecao();
    posicionarPinoSede(regiao);
    mostrarEstatisticasRegiao(regiao);
    abrirPainelRegiao(regionId, moverFocoPainel);

    document.querySelectorAll(".item-regiao[data-regiao-id]").forEach(function (el) {
      var ehAtivo = Number(el.getAttribute("data-regiao-id")) === regionId;
      el.classList.toggle("ativo", ehAtivo);
      el.setAttribute("aria-pressed", ehAtivo ? "true" : "false");
    });
    var botaoTodos = document.getElementById("botao-todos-consorcios");
    if (botaoTodos) {
      botaoTodos.classList.remove("ativo");
      botaoTodos.setAttribute("aria-pressed", "false");
    }
    if (window.Consis360Acessibilidade && window.Consis360Acessibilidade.anunciar) {
      window.Consis360Acessibilidade.anunciar("Consórcio selecionado: " + regiao.nomeReduzido + " (" + regiao.regiao + "). Ficha técnica disponível no painel de detalhes.");
    }
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

  function resetarSelecao(retornarFocoLista) {
    var idAnterior = regiaoSelecionadaId;
    regiaoSelecionadaId = null;
    if (camadaGeojson) {
      camadaGeojson.eachLayer(function (camada) { camadaGeojson.resetStyle(camada); });
      var limites = camadaGeojson.getBounds();
      if (limites.isValid()) mapa.fitBounds(limites, { padding: [16, 16] });
    }
    mostrarEstatisticasGerais();
    fecharPainel();
    removerPinoSede();
    document.querySelectorAll(".item-regiao[data-regiao-id]").forEach(function (el) {
      el.classList.remove("ativo");
      el.setAttribute("aria-pressed", "false");
    });
    var botaoTodos = document.getElementById("botao-todos-consorcios");
    if (botaoTodos) {
      botaoTodos.classList.add("ativo");
      botaoTodos.setAttribute("aria-pressed", "true");
    }
    var campoBusca = document.getElementById("busca-municipio");
    if (campoBusca) campoBusca.value = "";
    var lista = document.getElementById("lista-regioes");
    if (lista && lista.__renderizar) lista.__renderizar("");
    if (retornarFocoLista) {
      var alvoFoco = idAnterior !== null
        ? document.querySelector('.item-regiao[data-regiao-id="' + idAnterior + '"]')
        : botaoTodos;
      if (alvoFoco) alvoFoco.focus();
    }
  }

  /* Ponto garantidamente DENTRO do município (o centro da caixa envolvente
     cai fora quando o contorno é irregular — ex.: Boquira). Busca em grade o
     ponto interno mais distante das bordas (aprox. do "pólo de inacessibilidade"). */
  function dentroDoAnel(x, y, anel) {
    var dentro = false;
    for (var i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      var xi = anel[i][0], yi = anel[i][1], xj = anel[j][0], yj = anel[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  function distanciaAoAnel(x, y, anel) {
    var min = Infinity;
    for (var i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      var ax = anel[j][0], ay = anel[j][1], bx = anel[i][0], by = anel[i][1];
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var u = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      var px = ax + u * dx - x, py = ay + u * dy - y;
      var d = px * px + py * py;
      if (d < min) min = d;
    }
    return Math.sqrt(min);
  }
  function pontoInternoLatLng(geometria) {
    var poligonos = geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
    var melhor = null, melhorDist = -1;
    poligonos.forEach(function (poli) {
      var aneis = poli;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      aneis[0].forEach(function (c) {
        if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1];
      });
      var N = 48;
      for (var a = 0; a <= N; a++) {
        for (var b = 0; b <= N; b++) {
          var x = minX + (maxX - minX) * a / N, y = minY + (maxY - minY) * b / N;
          if (!dentroDoAnel(x, y, aneis[0])) continue;
          var furo = false;
          for (var k = 1; k < aneis.length; k++) { if (dentroDoAnel(x, y, aneis[k])) { furo = true; break; } }
          if (furo) continue;
          var d = distanciaAoAnel(x, y, aneis[0]);
          if (d > melhorDist) { melhorDist = d; melhor = [y, x]; }
        }
      }
    });
    return melhor;
  }

  function normalizarNome(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  /* A sede é localizada pelo código IBGE (sedeIbge); se ele não existir,
     cai para o nome normalizado (sem acento/espaço sobrando) — assim
     "Camacã" acha "Camacan" e "Boquira  " acha "Boquira". */
  function posicionarPinoSede(regiao) {
    removerPinoSede();
    if (!regiao || !regiao.sede || !camadaGeojson) return;
    var alvoCamada = null;
    var nomeSede = normalizarNome(regiao.sede);
    camadaGeojson.eachLayer(function (camada) {
      if (alvoCamada) return;
      var props = camada.feature.properties;
      if (!pertenceARegiao(props, regiao.id)) return;
      var confere = regiao.sedeIbge ? String(props.ibge) === String(regiao.sedeIbge) : normalizarNome(props.nome) === nomeSede;
      if (confere) alvoCamada = camada;
    });
    if (!alvoCamada || !alvoCamada.getBounds) return;
    var interno = pontoInternoLatLng(alvoCamada.feature.geometry);
    var centro = interno ? L.latLng(interno[0], interno[1]) : alvoCamada.getBounds().getCenter();
    var cfgPino = config.pinoSede || {};
    var tam = cfgPino.tamanho || [22, 29];
    var icone = L.icon({
      iconUrl: (window.CONSIS360_BASE || "") + (cfgPino.url || "assets/img/icones/pino-cidade-sede.png"),
      iconSize: tam,
      iconAnchor: [tam[0] / 2, tam[1]],
      popupAnchor: [0, -tam[1]]
    });
    marcadorSede = L.marker(centro, { icon: icone, zIndexOffset: 1000, keyboard: false, alt: "Cidade sede: " + regiao.sede }).addTo(mapa);
    marcadorSede.bindTooltip("Sede: " + regiao.sede, { direction: "top", offset: [0, -tam[1] + 3] });
  }

  function removerPinoSede() {
    if (marcadorSede) {
      mapa.removeLayer(marcadorSede);
      marcadorSede = null;
    }
  }

  function abrirPainelRegiao(regionId, moverFocoPainel) {
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
      var botaoFechar = painel.querySelector(".painel-detalhe__fechar");
      if (botaoFechar) {
        botaoFechar.addEventListener("click", function () {
          resetarSelecao(true);
        });
      }
      if (moverFocoPainel) {
        var tituloPainel = painel.querySelector(".painel-detalhe__titulo");
        if (tituloPainel) {
          tituloPainel.setAttribute("tabindex", "-1");
          tituloPainel.focus({ preventScroll: true });
        }
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
      if (botaoFecharErro) botaoFecharErro.addEventListener("click", function () { resetarSelecao(true); });
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
      "<p>Este município é conveniado a mais de um consórcio " + (config.rotuloTipo || "multifinalitário") + ". Selecione qual deseja consultar:</p>" +
      '<ul style="list-style:none;padding:0;display:grid;gap:8px;">' + opcoes + "</ul>";

    painel.classList.add("aberto");
    painel.querySelector(".painel-detalhe__fechar").addEventListener("click", function () { resetarSelecao(); });
    painel.querySelectorAll("[data-abrir-regiao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        selecionarRegiao(Number(botao.getAttribute("data-abrir-regiao")));
      });
    });
  }

  function abrirPainelSemConsorcio(props) {
    fecharTooltipAberto();
    var painel = document.getElementById("painel-detalhe");
    if (!painel) return;
    painel.innerHTML =
      '<button type="button" class="painel-detalhe__fechar" aria-label="Fechar">&times;</button>' +
      '<h2 class="painel-detalhe__titulo">' + util.escaparHtml(props.nome) + "</h2>" +
      '<p class="painel-detalhe__sem-consorcio">Esta cidade não está vinculada a nenhum consórcio.</p>';
    painel.classList.add("aberto");
    var botaoFechar = painel.querySelector(".painel-detalhe__fechar");
    if (botaoFechar) botaoFechar.addEventListener("click", function () { resetarSelecao(); });
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
    var linhaDiretor = regiao.diretorExecutivo
      ? "<div><dt>Diretor Executivo</dt><dd>" + util.escaparHtml(regiao.diretorExecutivo) + "</dd></div>"
      : "";
    var linhaVice = regiao.vicePresidente
      ? "<div><dt>Vice-presidente</dt><dd>" + util.escaparHtml(regiao.vicePresidente) +
        (regiao.municipioVicePresidente ? " (" + util.escaparHtml(regiao.municipioVicePresidente) + ")" : "") + "</dd></div>"
      : "";
    var linhaEndereco = regiao.endereco
      ? "<div><dt>Endereço</dt><dd>" + util.escaparHtml(regiao.endereco) + "</dd></div>"
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
        linhaDiretor +
        linhaVice +
        "<div><dt>Total de conveniados</dt><dd>" + util.formatarNumero(regiao.totalConsorciados) + "</dd></div>" +
        "<div><dt>População beneficiada</dt><dd>" + util.formatarNumero(regiao.populacao) + "</dd></div>" +
        "<div><dt>Área total</dt><dd>" + util.formatarArea(regiao.areaTotalKm2) + "</dd></div>" +
        linhaEndereco +
        linhaEmail +
        linhaCnpj +
        linhaSite +
      "</dl>" +
      '<div class="municipios-lista">' +
        '<p class="municipios-lista__titulo">Municípios consorciados (' + (regiao.municipios || []).length + ")</p>" +
        '<ul class="municipios-lista__tags">' + listaMunicipios + "</ul>" +
      "</div>"
    );
  }

  /* Municípios que não pertencem a nenhum consórcio (regionId nulo no
     GeoJSON carregado) — usados só na exportação XLS. */
  function municipiosSemConsorcio() {
    if (!geojsonCarregado) return [];
    return geojsonCarregado.features
      .filter(function (f) { return f.properties.regionId === null || f.properties.regionId === undefined; })
      .map(function (f) {
        return {
          nome: f.properties.nome,
          ibge: f.properties.ibge,
          populacao: f.properties.populacao,
          areaKm2: f.properties.areaKm2
        };
      });
  }

  /* ---------------------------------------------------------------
   * Exportação — PDF (mapa + legenda) e XLS (dados tabulados)
   * --------------------------------------------------------------- */
  function configurarBotoesExportacao() {
    var botaoPdf = document.getElementById("botao-exportar-pdf");
    var botaoXls = document.getElementById("botao-exportar-xls");

    if (botaoPdf) {
      botaoPdf.addEventListener("click", function () {
        if (!window.Consis360Exportar || !regioesCarregadas || !geojsonCarregado) return;
        var textoOriginal = botaoPdf.innerHTML;
        botaoPdf.disabled = true;
        botaoPdf.textContent = "Gerando PDF...";
        window.Consis360Exportar.exportarPDF(
          regioesCarregadas,
          geojsonCarregado,
          config.arquivoPdf || "consis360-mapa-multifinalitarios.pdf",
          config.tituloPdf || "Mapa de Consórcios Multifinalitários — CONSIS360"
        ).then(function () {
          botaoPdf.disabled = false;
          botaoPdf.innerHTML = textoOriginal;
        }).catch(function (erro) {
          console.error("CONSIS360: falha ao gerar PDF", erro);
          botaoPdf.disabled = false;
          botaoPdf.innerHTML = textoOriginal;
          window.alert("Não foi possível gerar o PDF. Detalhe técnico: " + (erro && erro.message ? erro.message : erro));
        });
      });
    }

    if (botaoXls) {
      botaoXls.addEventListener("click", function () {
        if (!window.Consis360Exportar || !regioesCarregadas) return;
        var textoOriginal = botaoXls.innerHTML;
        botaoXls.disabled = true;
        botaoXls.textContent = "Gerando XLS...";
        window.Consis360Exportar.exportarXLS(
          regioesCarregadas,
          municipiosSemConsorcio(),
          config.arquivoXls || "consis360-consorcios-multifinalitarios.xlsx",
          config.mostrarSecretario
        ).then(function () {
          botaoXls.disabled = false;
          botaoXls.innerHTML = textoOriginal;
        }).catch(function (erro) {
          console.error("CONSIS360: falha ao gerar XLS", erro);
          botaoXls.disabled = false;
          botaoXls.innerHTML = textoOriginal;
          window.alert("Não foi possível gerar o XLS. Detalhe técnico: " + (erro && erro.message ? erro.message : erro));
        });
      });
    }
  }

  window.iniciarMapaConsorcios = iniciar;
})();
