<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE postulante DROP CONSTRAINT IF EXISTS postulante_estadopostulante_check');
        DB::statement("
            ALTER TABLE postulante ADD CONSTRAINT postulante_estadopostulante_check
            CHECK (estadopostulante IN ('BORRADOR','PENDIENTE','INSCRITO','APROBADO','REPROBADO'))
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE postulante DROP CONSTRAINT IF EXISTS postulante_estadopostulante_check');
        DB::statement("
            ALTER TABLE postulante ADD CONSTRAINT postulante_estadopostulante_check
            CHECK (estadopostulante IN ('PENDIENTE','INSCRITO','APROBADO','REPROBADO'))
        ");
    }
};
