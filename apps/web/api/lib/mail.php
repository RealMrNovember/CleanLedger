<?php
/**
 * Minimal SMTP e-posta gönderimi (harici bağımlılık yok).
 * TLS: tls_peer_name + sistem CA bundle (PHP 8.3 FPM uyumu).
 */

function mailIsConfigured(array $mailConfig): bool
{
    return trim((string) ($mailConfig['host'] ?? '')) !== ''
        && trim((string) ($mailConfig['username'] ?? '')) !== ''
        && trim((string) ($mailConfig['password'] ?? '')) !== '';
}

function mailResolveCaFile(array $mailConfig): ?string
{
    $configured = trim((string) ($mailConfig['cafile'] ?? ''));
    if ($configured !== '' && is_file($configured)) {
        return $configured;
    }

    foreach ([
        __DIR__ . '/ca-bundle.crt',
        '/etc/ssl/certs/ca-certificates.crt',
        '/etc/pki/tls/certs/ca-bundle.crt',
        '/etc/ssl/cert.pem',
    ] as $path) {
        if (is_file($path)) {
            return $path;
        }
    }

    return null;
}

function mailSslContextOptions(array $mailConfig, string $tlsPeerName): array
{
    $options = [
        'verify_peer' => true,
        'verify_peer_name' => true,
        'peer_name' => $tlsPeerName,
        'SNI_enabled' => true,
    ];

    $caFile = mailResolveCaFile($mailConfig);
    if ($caFile !== null) {
        $options['cafile'] = $caFile;
    }

    return $options;
}

function sendSmtpEmail(array $mailConfig, string $to, string $subject, string $htmlBody, string $textBody = ''): bool
{
    if (!mailIsConfigured($mailConfig)) {
        return false;
    }

    $host = (string) $mailConfig['host'];
    $port = (int) ($mailConfig['port'] ?? 587);
    $username = (string) $mailConfig['username'];
    $password = (string) $mailConfig['password'];
    $fromEmail = (string) ($mailConfig['from_email'] ?? $username);
    $fromName = (string) ($mailConfig['from_name'] ?? 'CleanLedger');
    $encryption = strtolower((string) ($mailConfig['encryption'] ?? 'tls'));
    $tlsPeerName = trim((string) ($mailConfig['tls_peer_name'] ?? ''));
    if ($tlsPeerName === '') {
        $tlsPeerName = $host;
    }

    if ($textBody === '') {
        $textBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));
    }

    $remote = $encryption === 'ssl'
        ? "ssl://{$host}:{$port}"
        : "tcp://{$host}:{$port}";

    $streamContext = stream_context_create([
        'ssl' => mailSslContextOptions($mailConfig, $tlsPeerName),
    ]);

    $socket = @stream_socket_client(
        $remote,
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        $streamContext
    );
    if (!$socket) {
        return false;
    }

    stream_set_timeout($socket, 15);

    $read = function () use ($socket): string {
        $data = '';
        while (($line = fgets($socket, 515)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };

    $write = function (string $cmd) use ($socket, $read): string {
        fwrite($socket, $cmd . "\r\n");
        return $read();
    };

    $read();
    $write('EHLO cleanledger.local');

    if ($encryption === 'tls') {
        $write('STARTTLS');
        $sslOptions = mailSslContextOptions($mailConfig, $tlsPeerName);
        foreach ($sslOptions as $key => $value) {
            stream_context_set_option($socket, 'ssl', $key, $value);
        }
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            return false;
        }
        $write('EHLO cleanledger.local');
    }

    $write('AUTH LOGIN');
    $write(base64_encode($username));
    $auth = $write(base64_encode($password));
    if (strpos($auth, '235') === false) {
        fclose($socket);
        return false;
    }

    $write('MAIL FROM:<' . $fromEmail . '>');
    $write('RCPT TO:<' . $to . '>');
    $write('DATA');

    $boundary = 'cl_' . bin2hex(random_bytes(8));
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'From: ' . mailEncodeHeader($fromName) . " <{$fromEmail}>",
        'To: <' . $to . '>',
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'Date: ' . date('r'),
    ];

    $body = "--{$boundary}\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
        . $textBody . "\r\n\r\n"
        . "--{$boundary}\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n\r\n"
        . $htmlBody . "\r\n\r\n"
        . "--{$boundary}--";

    fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.\r\n");
    $result = $read();
    $write('QUIT');
    fclose($socket);

    return strpos($result, '250') !== false;
}

function mailEncodeHeader(string $value): string
{
    if (preg_match('/[^\x20-\x7E]/', $value)) {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
    return $value;
}

function sendPasswordResetEmail(array $config, string $to, string $resetUrl, string $companyName = ''): bool
{
    $mailConfig = $config['mail'] ?? [];
    $subject = 'CleanLedger — Parola Sıfırlama';
    $greeting = $companyName !== '' ? htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') : 'CleanLedger kullanıcısı';

    $html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">'
        . '<h2 style="color:#0f3d3a">Parola sıfırlama</h2>'
        . '<p>Merhaba ' . $greeting . ',</p>'
        . '<p>CleanLedger hesabınız için parola sıfırlama talebi aldık. Aşağıdaki bağlantı <strong>60 dakika</strong> geçerlidir:</p>'
        . '<p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '" '
        . 'style="display:inline-block;padding:12px 20px;background:#40916c;color:#fff;text-decoration:none;border-radius:8px">'
        . 'Parolamı Sıfırla</a></p>'
        . '<p style="color:#666;font-size:14px">Bağlantı çalışmazsa tarayıcınıza yapıştırın:<br>'
        . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="color:#666;font-size:14px">Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>'
        . '</div>';

    $text = "Merhaba,\n\nParola sıfırlama bağlantınız (60 dk geçerli):\n{$resetUrl}\n\n"
        . "Bu talebi siz yapmadıysanız bu e-postayı yok sayın.";

    return sendSmtpEmail($mailConfig, $to, $subject, $html, $text);
}

function sendAdminPasswordResetNotice(array $config, string $to): bool
{
    $mailConfig = $config['mail'] ?? [];
    $subject = 'CleanLedger — Parolanız Sıfırlandı';
    $html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">'
        . '<h2 style="color:#0f3d3a">Parola güncellendi</h2>'
        . '<p>CleanLedger hesabınızın parolası yönetici tarafından sıfırlandı.</p>'
        . '<p>Yeni parolanızı almak için destek ekibinizle iletişime geçin ve ardından giriş yaptıktan sonra parolanızı değiştirin.</p>'
        . '</div>';
    $text = "CleanLedger hesabınızın parolası yönetici tarafından sıfırlandı.\n"
        . "Yeni parolanızı destek ekibinizden alın.";

    return sendSmtpEmail($mailConfig, $to, $subject, $html, $text);
}
