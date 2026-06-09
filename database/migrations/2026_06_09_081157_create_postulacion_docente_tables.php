<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            CREATE TABLE IF NOT EXISTS postulacion_docente (
                idpostulacion      SERIAL PRIMARY KEY,
                ci                 VARCHAR(20)  NOT NULL,
                nombres            VARCHAR(150) NOT NULL,
                apellidos          VARCHAR(150) NOT NULL,
                sexo               CHAR(1)      NOT NULL DEFAULT 'M',
                correo             VARCHAR(150) NOT NULL,
                telefono           VARCHAR(20),
                profesion          VARCHAR(150),
                maestria           VARCHAR(200),
                diplomadoedsup     BOOLEAN      NOT NULL DEFAULT FALSE,
                estado             VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE'
                                   CHECK (estado IN ('PENDIENTE','APROBADO','RECHAZADO')),
                observacion        TEXT,
                fecha_postulacion  TIMESTAMP    NOT NULL DEFAULT NOW()
            )
        ");

        DB::statement("
            CREATE TABLE IF NOT EXISTS postulacion_docente_documentos (
                iddocumento      SERIAL PRIMARY KEY,
                idpostulacion    INTEGER      NOT NULL REFERENCES postulacion_docente(idpostulacion) ON DELETE CASCADE,
                nombre_original  VARCHAR(255) NOT NULL,
                nombre_archivo   VARCHAR(255) NOT NULL,
                tipo_mime        VARCHAR(100),
                fecha_subida     TIMESTAMP    NOT NULL DEFAULT NOW()
            )
        ");
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS postulacion_docente_documentos');
        DB::statement('DROP TABLE IF EXISTS postulacion_docente');
    }
};
