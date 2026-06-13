<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE carrera SET cupomaximo = 200 WHERE nombre ILIKE '%Sistemas%'");
        DB::statement("UPDATE carrera SET cupomaximo = 150 WHERE nombre ILIKE '%Inform%tica%'");
    }

    public function down(): void
    {
        // No hay valor previo conocido; se deja sin revertir
    }
};
