(function (global) {
  'use strict';

  function formatFechaBogota(fechaStr) {
    if (!fechaStr) return '—';
    return new Date(fechaStr).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatFechaBogota };
  } else {
    global.formatFechaBogota = formatFechaBogota;
  }
})(typeof window !== 'undefined' ? window : globalThis);
