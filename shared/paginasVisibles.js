(function (global) {
  'use strict';

  /**
   * Calcula qué números de página mostrar en la barra de paginación:
   * la primera, la última y las vecinas de la actual, con '…' en los
   * huecos. Si el hueco es de una sola página, muestra ese número.
   * Ej.: (7, 20) -> [1, '…', 6, 7, 8, '…', 20]
   */
  function calcularPaginasVisibles(actual, totalPaginas) {
    var total = Math.max(1, totalPaginas || 0);

    if (total <= 7) {
      var todas = [];
      for (var p = 1; p <= total; p++) todas.push(p);
      return todas;
    }

    var candidatas = [1, actual - 1, actual, actual + 1, total]
      .filter(function (n) { return n >= 1 && n <= total; })
      .sort(function (a, b) { return a - b; })
      .filter(function (n, i, arr) { return i === 0 || n !== arr[i - 1]; });

    var resultado = [];
    candidatas.forEach(function (n, i) {
      if (i > 0) {
        var anterior = candidatas[i - 1];
        if (n - anterior === 2) resultado.push(anterior + 1);
        else if (n - anterior > 2) resultado.push('…');
      }
      resultado.push(n);
    });

    return resultado;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcularPaginasVisibles };
  } else {
    global.calcularPaginasVisibles = calcularPaginasVisibles;
  }
})(typeof window !== 'undefined' ? window : globalThis);
