#!/usr/bin/env php
<?php
/** SMTP teşhis — kimlik bilgisi yazdırmaz, yalnızca adım sonuçları. */
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/lib/mail.php';
$config = require $root . '/config.php';
$mail = $config['mail'] ?? [];

$host = (string) ($mail['host'] ?? '');
$port = (int) ($mail['port'] ?? 587);
$encryption = strtolower((string) ($mail['encryption'] ?? 'tls'));
$user = (string) ($mail['username'] ?? '');
$from = (string) ($mail['from_email'] ?? $user);

echo "Host: {$host}:{$port} ({$encryption})\n";
echo "User: {$user}\n";
echo "From: {$from}\n";
echo "Password set: " . (trim((string) ($mail['password'] ?? '')) !== '' ? 'yes' : 'no') . "\n\n";

$remote = $encryption === 'ssl' ? "ssl://{$host}:{$port}" : "tcp://{$host}:{$port}";
$errno = 0;
$errstr = '';
$socket = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);

if (!$socket) {
    echo "FAIL tcp/ssl connect: [{$errno}] {$errstr}\n";
    exit(1);
}
echo "OK tcp connect\n";

stream_set_timeout($socket, 15);
$read = function () use ($socket): string {
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return trim($data);
};
$write = function (string $cmd) use ($socket, $read): string {
    fwrite($socket, $cmd . "\r\n");
    return $read();
};

echo "Greeting: " . $read() . "\n";
echo "EHLO: " . $write('EHLO cleanledger-diag.local') . "\n";

if ($encryption === 'tls') {
    $start = $write('STARTTLS');
    echo "STARTTLS: {$start}\n";
    if (strpos($start, '220') === false) {
        fclose($socket);
        exit(1);
    }
    $crypto = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    echo 'TLS enable: ' . ($crypto ? 'OK' : 'FAIL') . "\n";
    if (!$crypto) {
        fclose($socket);
        exit(1);
    }
    echo "EHLO after TLS: " . $write('EHLO cleanledger-diag.local') . "\n";
}

echo "AUTH LOGIN: " . $write('AUTH LOGIN') . "\n";
echo "USER: " . $write(base64_encode($user)) . "\n";
$auth = $write(base64_encode((string) ($mail['password'] ?? '')));
echo "PASS: " . (strpos($auth, '235') !== false ? 'OK (235)' : "FAIL ({$auth})") . "\n";

if (strpos($auth, '235') === false) {
    $write('QUIT');
    fclose($socket);
    exit(1);
}

// Gerçek gönderim testi (test kullanıcı e-postasına)
$testTo = 'faz10-e2e-test@cicibyte.internal';
$sent = sendSmtpEmail(
    $mail,
    $testTo,
    'CleanLedger SMTP Teşhis Testi',
    '<p>Bu mesaj Faz 10 SMTP teşhis scriptinden gönderildi.</p>',
    'Faz 10 SMTP teşhis testi.'
);
echo "\nsendSmtpEmail result: " . ($sent ? 'OK' : 'FAIL') . "\n";

$write('QUIT');
fclose($socket);
exit($sent ? 0 : 1);
