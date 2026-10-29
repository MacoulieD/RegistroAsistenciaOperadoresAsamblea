/*
  Migración 02 (OPCIONAL) - Convertir fotos antiguas de base64 a binario
  ---------------------------------------------------------------------
  Requiere haber corrido la migración 01.
  HACER BACKUP DE LA BD ANTES DE EJECUTAR.

  Convierte por lotes las fotos guardadas como texto base64 en FotoRegistro
  ("data:image/jpeg;base64,...") a FotoBinaria, y vacía FotoRegistro.
  La app funciona igual con o sin esta migración: lee FotoBinaria y, si
  está vacía, usa FotoRegistro.

  Al terminar, el espacio liberado no se devuelve al disco automáticamente;
  coordinar con el DBA un ALTER INDEX ... REBUILD sobre la tabla.
*/

SET NOCOUNT ON;

DECLARE @TamanoLote INT = 200;
DECLARE @Filas INT = 1;

WHILE @Filas > 0
BEGIN
    -- Solo se vacía FotoRegistro cuando la conversión dio un binario válido;
    -- las fotos con base64 dañado se quedan intactas y salen en la verificación.
    UPDATE TOP (@TamanoLote) a
    SET a.FotoBinaria = c.Binario,
        a.FotoRegistro = NULL
    FROM dbo.GENAsistenciaOperador a
    CROSS APPLY (
        SELECT SUBSTRING(a.FotoRegistro, CHARINDEX(',', a.FotoRegistro) + 1, LEN(a.FotoRegistro)) AS Base64
    ) x
    CROSS APPLY (
        SELECT CAST(N'' AS XML).value('xs:base64Binary(sql:column("x.Base64"))', 'VARBINARY(MAX)') AS Binario
    ) c
    WHERE a.FotoBinaria IS NULL
      AND a.FotoRegistro LIKE 'data:image/%;base64,%'
      AND c.Binario IS NOT NULL
      AND DATALENGTH(c.Binario) > 0;

    SET @Filas = @@ROWCOUNT;
    PRINT 'Convertidos en este lote: ' + CAST(@Filas AS VARCHAR(10));
END;

-- Verificación: lista las fotos que no se pudieron convertir (debería estar vacía)
SELECT Id, LEFT(FotoRegistro, 40) AS InicioFoto
FROM dbo.GENAsistenciaOperador
WHERE FotoBinaria IS NULL AND FotoRegistro IS NOT NULL;
