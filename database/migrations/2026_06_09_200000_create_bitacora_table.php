<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bitacora')) return;

        Schema::create('bitacora', function (Blueprint $table) {
            $table->increments('idbitacora');
            $table->unsignedInteger('idusuario')->nullable();
            $table->string('nombre_usuario', 100)->nullable();
            $table->string('rol', 50)->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('accion', 50);
            $table->text('descripcion')->nullable();
            $table->timestamp('fecha')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bitacora');
    }
};
