<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('asistencia')) return;

        Schema::create('asistencia', function (Blueprint $table) {
            $table->increments('idasistencia');
            $table->unsignedInteger('idpostulante');
            $table->unsignedInteger('idgrupo');
            $table->date('fecha');
            // PRESENTE, AUSENTE, JUSTIFICADO
            $table->string('estado', 20)->default('PRESENTE');
            $table->text('observacion')->nullable();
            // docente o funcionario que registró
            $table->unsignedInteger('registrado_por')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asistencia');
    }
};
