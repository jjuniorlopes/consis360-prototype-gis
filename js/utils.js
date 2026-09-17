/**
 * CONSIS360 — Utilitários compartilhados
 * ------------------------------------------------------------------
 */
window.Consis360Utils = (function () {
  "use strict";

  function formatarNumero(valor) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
    return Number(valor).toLocaleString("pt-BR");
  }

  function formatarArea(valorKm2) {
    if (valorKm2 === null || valorKm2 === undefined || Number.isNaN(valorKm2)) return "—";
    return Number(valorKm2).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " km²";
  }

  function escaparHtml(texto) {
    if (texto === null || texto === undefined) return "";
    var div = document.createElement("div");
    div.textContent = String(texto);
    return div.innerHTML;
  }

  function valorOuPendente(valor, textoPendente) {
    if (valor === null || valor === undefined || valor === "" || valor === "nan") {
      return '<span class="dado-pendente">' + (textoPendente || "dado não informado na fonte") + "</span>";
    }
    return escaparHtml(valor);
  }

  function debounce(fn, atraso) {
    var timer = null;
    return function () {
      var args = arguments;
      var contexto = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(contexto, args);
      }, atraso);
    };
  }

  return {
    formatarNumero: formatarNumero,
    formatarArea: formatarArea,
    escaparHtml: escaparHtml,
    valorOuPendente: valorOuPendente,
    debounce: debounce
  };
})();
