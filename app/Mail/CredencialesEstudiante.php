<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CredencialesEstudiante extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombres,
        public string $username,
        public string $password,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tus credenciales de acceso — CUP FICCT');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.credenciales_estudiante');
    }
}
