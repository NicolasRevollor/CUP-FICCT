<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('postulante', 'idusuario')) {
            DB::statement('ALTER TABLE postulante ADD COLUMN idusuario INTEGER NULL REFERENCES usuario(idusuario) ON DELETE SET NULL');
        }

        if (!Schema::hasColumn('postulante', 'foto')) {
            DB::statement('ALTER TABLE postulante ADD COLUMN foto TEXT NULL');
        }

        if (!DB::table('roles')->where('nombre', 'ESTUDIANTE')->exists()) {
            DB::table('roles')->insert(['nombre' => 'ESTUDIANTE']);
        }

        DB::statement("
            CREATE TABLE IF NOT EXISTS asistencia (
                idasistencia   SERIAL PRIMARY KEY,
                idpostulante   INTEGER NOT NULL REFERENCES postulante(idpostulante) ON DELETE CASCADE,
                idgrupo        INTEGER NOT NULL REFERENCES grupos(idgrupo) ON DELETE CASCADE,
                fecha          DATE NOT NULL,
                estado         VARCHAR(20) NOT NULL DEFAULT 'PRESENTE'
                                CHECK (estado IN ('PRESENTE','AUSENTE','JUSTIFICADO')),
                observacion    TEXT NULL
            )
        ");
    }

    public function down(): void {}
};
