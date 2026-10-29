/*
  Migración 01 - Fotos en VARBINARY y tabla de auditoría
  ------------------------------------------------------
  EJECUTAR ANTES de desplegar la versión del código que guarda en FotoBinaria.
  Es idempotente: se puede correr varias veces sin error.

  - Agrega GENAsistenciaOperador.FotoBinaria (VARBINARY(MAX)).
  - Permite NULL en FotoRegistro: los registros nuevos ya no la llenan,
    los antiguos la conservan hasta correr la migración 02.
  - Crea dbo.GENAuditoriaAsistencia.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.GENAsistenciaOperador', 'FotoBinaria') IS NULL
BEGIN
    ALTER TABLE dbo.GENAsistenciaOperador ADD FotoBinaria VARBINARY(MAX) NULL;
END;

ALTER TABLE dbo.GENAsistenciaOperador ALTER COLUMN FotoRegistro NVARCHAR(MAX) NULL;

IF OBJECT_ID('dbo.GENAuditoriaAsistencia', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GENAuditoriaAsistencia (
        Id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GENAuditoriaAsistencia PRIMARY KEY,
        Fecha           DATETIME2(0)  NOT NULL,   -- UTC
        IdUsuario       INT           NULL,
        CodigoUsuario   NVARCHAR(50)  NULL,
        Metodo          NVARCHAR(10)  NOT NULL,
        Ruta            NVARCHAR(400) NOT NULL,
        Parametros      NVARCHAR(MAX) NULL,
        CodigoRespuesta INT           NOT NULL
    );

    CREATE INDEX IX_GENAuditoriaAsistencia_Fecha ON dbo.GENAuditoriaAsistencia (Fecha);
END;

COMMIT TRANSACTION;
