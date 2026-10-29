/**
 * Construye la cláusula WHERE y los parámetros para filtrar
 * dbo.GENAsistenciaOperador a partir de los query params del panel admin.
 * Compartida entre la consulta JSON y la exportación a Excel para que
 * ambas apliquen exactamente los mismos filtros.
 */
function construirFiltroAsistencias(query, sql) {
  const { fechaInicio, fechaFin, idUsuario, idBaseDatos } = query;

  let where = 'WHERE 1=1';
  const inputs = [];

  if (fechaInicio) {
    inputs.push({ nombre: 'fechaInicio', tipo: sql.DateTime, valor: new Date(fechaInicio + 'T00:00:00') });
    where += ' AND a.Fecha >= @fechaInicio';
  }
  if (fechaFin) {
    inputs.push({ nombre: 'fechaFin', tipo: sql.DateTime, valor: new Date(fechaFin + 'T23:59:59') });
    where += ' AND a.Fecha <= @fechaFin';
  }
  if (idUsuario && !isNaN(parseInt(idUsuario, 10))) {
    inputs.push({ nombre: 'idUsuario', tipo: sql.Int, valor: parseInt(idUsuario, 10) });
    where += ' AND a.IdUsuario = @idUsuario';
  }
  if (idBaseDatos && !isNaN(parseInt(idBaseDatos, 10))) {
    inputs.push({ nombre: 'idBaseDatos', tipo: sql.Int, valor: parseInt(idBaseDatos, 10) });
    where += ' AND a.IdBaseDatos = @idBaseDatos';
  }

  return { where, inputs };
}

/**
 * Aplica los inputs construidos por construirFiltroAsistencias a un
 * request de mssql.
 */
function aplicarFiltroAsistencias(request, inputs) {
  inputs.forEach(({ nombre, tipo, valor }) => request.input(nombre, tipo, valor));
  return request;
}

module.exports = { construirFiltroAsistencias, aplicarFiltroAsistencias };
