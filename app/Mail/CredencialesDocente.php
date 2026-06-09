<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CredencialesDocente extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombres,
        public string $username,
        public string $password,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu postulación fue aprobada — CUP FICCT');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.credenciales_docente');
    }
}
