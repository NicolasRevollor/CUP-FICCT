<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE carrera SET cupomaximo = 100 WHERE nombre ILIKE '%Redes%'");
        DB::statement("UPDATE carrera SET cupomaximo = 20  WHERE nombre ILIKE '%Rob%tica%'");
    }

    public function down(): void {}
};
