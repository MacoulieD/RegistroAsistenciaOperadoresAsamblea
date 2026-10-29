const TAMANO_POR_DEFECTO = 50;
const TAMANO_MAXIMO = 200;

/**
 * Lee "pagina" y "tamano" de los query params y devuelve valores seguros,
 * junto con el rango de filas (1-based, inclusivo) para ROW_NUMBER().
 */
function parsearPaginacion(query) {
  let pagina = parseInt((query && query.pagina) || '', 10);
  let tamano = parseInt((query && query.tamano) || '', 10);

  if (isNaN(pagina) || pagina < 1) pagina = 1;
  if (isNaN(tamano) || tamano < 1) tamano = TAMANO_POR_DEFECTO;
  if (tamano > TAMANO_MAXIMO) tamano = TAMANO_MAXIMO;

  const desde = (pagina - 1) * tamano + 1;
  const hasta = pagina * tamano;

  return { pagina, tamano, desde, hasta };
}

module.exports = { parsearPaginacion, TAMANO_POR_DEFECTO, TAMANO_MAXIMO };
