<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('gestion')) {
            DB::statement('
                CREATE TABLE gestion (
                    idgestion SERIAL PRIMARY KEY,
                    anio      INTEGER      NOT NULL,
                    periodo   VARCHAR(20)  NOT NULL,
                    activo    BOOLEAN      NOT NULL DEFAULT TRUE,
                    UNIQUE (anio, periodo)
                )
            ');
        }
    }

    public function down(): void {}
};
