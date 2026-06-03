<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistroConfirmacion extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombres,
        public string $apellidos,
        public string $ci,
        public string $correo,
        public float  $monto,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirmación de inscripción — CUP FICCT',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registro_confirmacion',
        );
    }
}
