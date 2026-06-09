<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('usuario', 'debe_cambiar_password')) {
            DB::statement('ALTER TABLE usuario ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('usuario', 'debe_cambiar_password')) {
            DB::statement('ALTER TABLE usuario DROP COLUMN debe_cambiar_password');
        }
    }
};
