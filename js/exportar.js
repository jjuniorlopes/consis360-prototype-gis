/**
 * CONSIS360 — Exportação de dados (PDF com mapa+legenda+lista, XLS tabulado)
 * ------------------------------------------------------------------
 * Compartilhado pelas páginas de mapa de Multifinalitários e de Saúde.
 * Carrega SheetJS e jsPDF sob demanda (só quando o usuário clica em
 * exportar), via CDN, para não pesar o carregamento inicial da página.
 *
 * O mapa do PDF é DESENHADO num <canvas> a partir das coordenadas do
 * GeoJSON (projeção equirretangular simples), não é uma captura de tela
 * do Leaflet — capturar o mapa ao vivo quebraria por causa das imagens
 * de tile do OpenStreetMap, que não têm cabeçalho CORS liberado e por
 * isso "contaminam" o canvas, impedindo exportar a imagem.
 * ------------------------------------------------------------------
 */
window.Consis360Exportar = (function () {
  "use strict";

  function carregarScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Falha ao carregar " + src)); };
      document.body.appendChild(s);
    });
  }

  /* Bibliotecas hospedadas no próprio projeto (assets/lib/) — não dependem
     de internet/CDN. O CDN fica só como plano B. */
  function carregarComFallback(local, cdn) {
    var base = window.CONSIS360_BASE || "";
    return carregarScript(base + local).catch(function () {
      return carregarScript(cdn);
    });
  }

  function garantirXLSX() {
    if (window.XLSX) return Promise.resolve();
    return carregarComFallback("assets/lib/xlsx.full.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  }

  function garantirJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return carregarComFallback("assets/lib/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
  }

  /* hex "#rrggbb" -> [r,g,b] números — jsPDF.setFillColor não aceita de
     forma confiável uma string hex direta em todas as versões/builds;
     passar 3 números é o jeito que funciona em qualquer versão. */
  function hexParaRgb(hex) {
    var limpo = String(hex || "#999999").replace("#", "");
    if (limpo.length === 3) {
      limpo = limpo[0] + limpo[0] + limpo[1] + limpo[1] + limpo[2] + limpo[2];
    }
    var num = parseInt(limpo, 16);
    if (isNaN(num)) return [153, 153, 153];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /* ---------------------------------------------------------------
   * XLS — uma linha por município consorciado + uma linha por
   * município SEM consórcio (campos do consórcio em branco, exceto
   * "Consórcio" = "SEM CONSÓRCIO" e "ID" = último ID de consórcio + 1).
   * --------------------------------------------------------------- */
  function exportarXLS(regioes, municipiosSemConsorcio, nomeArquivo, rotuloSecretario) {
    return garantirXLSX().then(function () {
      var linhas = [];
      /* IDs sequenciais 1..N na ordem original; "sem consórcio" = N+1 */
      var ordenadas = regioes.slice().sort(function (x, y) { return (x.id || 0) - (y.id || 0); });
      var idSequencial = {};
      ordenadas.forEach(function (r, i) { idSequencial[r.id] = i + 1; });
      var idSemConsorcio = ordenadas.length + 1;
      ordenadas.forEach(function (r) {
        (r.municipios || []).forEach(function (m) {
          var linha = {
            "ID": idSequencial[r.id],
            "Consórcio": r.consorcio,
            "Nome Reduzido": r.nomeReduzido,
            "Região": r.regiao,
            "Presidente": r.presidente,
            "Município Presidente": r.municipioPresidente,
            "Sede": r.sede
          };
          if (rotuloSecretario) linha["Secretário(a)"] = r.secretario || "";
          linha["E-mail"] = r.email || "";
          linha["CNPJ"] = r.cnpj || "";
          linha["Site"] = r.site || "";
          linha["Total de Municípios Consorciados"] = r.totalConsorciados;
          linha["População Beneficiada (consórcio)"] = r.populacao;
          linha["Área Total km² (consórcio)"] = r.areaTotalKm2;
          linha["Município Consorciado"] = m.nome;
          linha["Código IBGE"] = m.ibge;
          linha["População do Município"] = m.populacao;
          linha["Área do Município km²"] = m.areaKm2;
          linhas.push(linha);
        });
      });

      (municipiosSemConsorcio || []).forEach(function (m) {
        var linha = {
          "ID": idSemConsorcio,
          "Consórcio": "SEM CONSÓRCIO",
          "Nome Reduzido": "",
          "Região": "",
          "Presidente": "",
          "Município Presidente": "",
          "Sede": ""
        };
        if (rotuloSecretario) linha["Secretário(a)"] = "";
        linha["E-mail"] = "";
        linha["CNPJ"] = "";
        linha["Site"] = "";
        linha["Total de Municípios Consorciados"] = "";
        linha["População Beneficiada (consórcio)"] = m.populacao;
        linha["Área Total km² (consórcio)"] = m.areaKm2;
        linha["Município Consorciado"] = m.nome;
        linha["Código IBGE"] = m.ibge;
        linha["População do Município"] = m.populacao;
        linha["Área do Município km²"] = m.areaKm2;
        linhas.push(linha);
      });

      var ws = XLSX.utils.json_to_sheet(linhas);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consorcios");
      XLSX.writeFile(wb, nomeArquivo);
    });
  }

  /* ---------------------------------------------------------------
   * Desenha o GeoJSON colorido num canvas (projeção equirretangular,
   * escalada pela latitude média, suficiente pra área da Bahia).
   * --------------------------------------------------------------- */
  function construirCanvasMapa(geojson, largura, altura) {
    var canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);

    var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    function varrerAnel(anel) {
      for (var i = 0; i < anel.length; i++) {
        var lon = anel[i][0], lat = anel[i][1];
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    geojson.features.forEach(function (f) {
      var geom = f.geometry;
      if (geom.type === "Polygon") {
        varrerAnel(geom.coordinates[0]);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(function (poly) { varrerAnel(poly[0]); });
      }
    });

    var margem = 10;
    var larguraUtil = largura - margem * 2;
    var alturaUtil = altura - margem * 2;
    var fatorLat = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
    var escalaX = larguraUtil / ((maxLon - minLon) * fatorLat);
    var escalaY = alturaUtil / (maxLat - minLat);
    var escala = Math.min(escalaX, escalaY);
    var deslocX = margem + (larguraUtil - (maxLon - minLon) * fatorLat * escala) / 2;
    var deslocY = margem + (alturaUtil - (maxLat - minLat) * escala) / 2;

    function projetar(lon, lat) {
      var x = deslocX + (lon - minLon) * fatorLat * escala;
      var y = altura - deslocY - (lat - minLat) * escala;
      return [x, y];
    }

    function desenharAnel(anel) {
      ctx.beginPath();
      for (var i = 0; i < anel.length; i++) {
        var xy = projetar(anel[i][0], anel[i][1]);
        if (i === 0) ctx.moveTo(xy[0], xy[1]);
        else ctx.lineTo(xy[0], xy[1]);
      }
      ctx.closePath();
    }

    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(20,30,50,0.45)";
    geojson.features.forEach(function (f) {
      ctx.fillStyle = f.properties.cor || "#e2e8f0";
      var geom = f.geometry;
      if (geom.type === "Polygon") {
        desenharAnel(geom.coordinates[0]);
        ctx.fill();
        ctx.stroke();
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(function (poly) {
          desenharAnel(poly[0]);
          ctx.fill();
          ctx.stroke();
        });
      }
    });

    return canvas;
  }

  /* ---------------------------------------------------------------
   * PDF — bloco com borda (mapa + legenda) seguido da lista de cada
   * consórcio com total de municípios e a relação nominal deles.
   * --------------------------------------------------------------- */
  function exportarPDF(regioes, geojson, nomeArquivo, titulo) {
    return garantirJsPDF().then(function () {
      var jsPDFCtor = window.jspdf.jsPDF;
      var doc = new jsPDFCtor({ orientation: "portrait", unit: "pt", format: "a4" });
      var larguraPagina = doc.internal.pageSize.getWidth();
      var alturaPagina = doc.internal.pageSize.getHeight();
      var margem = 36;
      var yFimPagina = alturaPagina - margem;

      function novaPagina() {
        doc.addPage();
        return margem;
      }
      function garantirEspaco(y, alturaNecessaria) {
        if (y + alturaNecessaria > yFimPagina) return novaPagina();
        return y;
      }

      doc.setFontSize(16);
      doc.setTextColor(11, 47, 107);
      doc.text(titulo, margem, margem + 8);
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("Gerado em " + new Date().toLocaleDateString("pt-BR") + " pelo CONSIS360", margem, margem + 24);

      var yBloco = margem + 40;
      var larguraBloco = larguraPagina - margem * 2;
      var larguraMapa = larguraBloco - 24;
      var alturaMapa = 300;

      var canvas = construirCanvasMapa(geojson, larguraMapa * 2, alturaMapa * 2);
      var imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", margem + 12, yBloco + 12, larguraMapa, alturaMapa);

      var yLegendaTitulo = yBloco + 12 + alturaMapa + 18;
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text("Legenda:", margem + 12, yLegendaTitulo);

      var yLegenda = yLegendaTitulo + 14;
      doc.setFontSize(8);
      var colLarguraLeg = (larguraBloco - 24) / 2;
      var linhaAlturaLeg = 13;
      var colunaLeg = 0;
      regioes.forEach(function (r) {
        var x = margem + 12 + colunaLeg * colLarguraLeg;
        var rgb = hexParaRgb(r.cor);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(x, yLegenda - 6, 8, 8, "F");
        doc.setTextColor(30, 30, 30);
        doc.text(r.nomeReduzido, x + 12, yLegenda, { maxWidth: colLarguraLeg - 14 });
        colunaLeg = colunaLeg === 0 ? 1 : 0;
        if (colunaLeg === 0) yLegenda += linhaAlturaLeg;
      });
      if (colunaLeg === 1) yLegenda += linhaAlturaLeg;

      var yFimBloco = yLegenda + 8;
      doc.setDrawColor(180, 190, 205);
      doc.setLineWidth(1);
      doc.rect(margem, yBloco, larguraBloco, yFimBloco - yBloco);

      var y = yFimBloco + 28;
      y = garantirEspaco(y, 20);
      doc.setFontSize(13);
      doc.setTextColor(11, 47, 107);
      doc.text("Lista de Consórcios e Municípios Consorciados", margem, y);
      y += 22;

      regioes.forEach(function (r) {
        y = garantirEspaco(y, 50);

        var rgb = hexParaRgb(r.cor);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(margem, y - 9, 9, 9, "F");
        doc.setFontSize(11);
        doc.setTextColor(11, 47, 107);
        doc.text(r.nomeReduzido + " — " + r.regiao, margem + 14, y);
        y += 15;

        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        doc.text("Total de Municípios consorciados: " + (r.totalConsorciados || 0), margem, y);
        y += 14;

        var nomesMunicipios = (r.municipios || []).map(function (m) { return m.nome; });
        var textoMunicipios = "Municípios: " + formatarListaComE(nomesMunicipios) + ".";
        var linhasTexto = doc.splitTextToSize(textoMunicipios, larguraPagina - margem * 2);
        linhasTexto.forEach(function (linha) {
          y = garantirEspaco(y, 13);
          doc.text(linha, margem, y);
          y += 12;
        });

        y += 14;
      });

      doc.save(nomeArquivo);
    });
  }

  function formatarListaComE(itens) {
    if (!itens || itens.length === 0) return "";
    if (itens.length === 1) return itens[0];
    return itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
  }

  return { exportarXLS: exportarXLS, exportarPDF: exportarPDF };
})();
