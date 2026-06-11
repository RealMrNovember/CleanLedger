<?php
/**
 * Parola sıfırlama token yönetimi ve rate limit.
 */

const PASSWORD_RESET_TTL_SECONDS = 3600;
const PASSWORD_RESET_EMAIL_LIMIT = 3;
const PASSWORD_RESET_IP_LIMIT = 10;
const PASSWORD_RESET_RATE_WINDOW = 3600;

function passwordResetTokensFile(string $dataDir): string
{
    return $dataDir . '/password_reset_tokens.json';
}

function passwordResetRateFile(string $dataDir): string
{
    return $dataDir . '/password_reset_rate.json';
}

function readPasswordResetTokens(string $file): array
{
    $raw = @file_get_contents($file);
    if ($raw === false) {
        return [];
    }
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function writePasswordResetTokens(string $file, array $tokens): void
{
    file_put_contents(
        $file,
        json_encode(array_values($tokens), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function prunePasswordResetTokens(array $tokens): array
{
    $now = time();
    return array_values(array_filter($tokens, function ($t) use ($now) {
        if (!empty($t['usedAt'])) {
            return false;
        }
        $expires = strtotime((string) ($t['expiresAt'] ?? ''));
        return $expires !== false && $expires > $now;
    }));
}

function readRateEvents(string $file): array
{
    $raw = @file_get_contents($file);
    if ($raw === false) {
        return [];
    }
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function writeRateEvents(string $file, array $events): void
{
    file_put_contents($file, json_encode(array_values($events), JSON_PRETTY_PRINT), LOCK_EX);
}

function pruneRateEvents(array $events): array
{
    $cutoff = time() - PASSWORD_RESET_RATE_WINDOW;
    return array_values(array_filter($events, function ($e) use ($cutoff) {
        return (int) ($e['ts'] ?? 0) >= $cutoff;
    }));
}

function passwordResetRateLimited(string $rateFile, string $email, string $ip): bool
{
    $events = pruneRateEvents(readRateEvents($rateFile));
    $emailCount = 0;
    $ipCount = 0;
    $emailLower = strtolower($email);

    foreach ($events as $e) {
        if (($e['type'] ?? '') === 'email' && strtolower((string) ($e['key'] ?? '')) === $emailLower) {
            $emailCount++;
        }
        if (($e['type'] ?? '') === 'ip' && ($e['key'] ?? '') === $ip) {
            $ipCount++;
        }
    }

    return $emailCount >= PASSWORD_RESET_EMAIL_LIMIT || $ipCount >= PASSWORD_RESET_IP_LIMIT;
}

function recordPasswordResetRateEvent(string $rateFile, string $email, string $ip): void
{
    $events = pruneRateEvents(readRateEvents($rateFile));
    $now = time();
    $events[] = ['type' => 'email', 'key' => strtolower($email), 'ts' => $now];
    $events[] = ['type' => 'ip', 'key' => $ip, 'ts' => $now];
    writeRateEvents($rateFile, $events);
}

function generatePasswordResetToken(): string
{
    return 'clr_' . bin2hex(random_bytes(16));
}

function hashPasswordResetToken(string $token): string
{
    return hash('sha256', $token);
}

function createPasswordResetToken(string $tokensFile, string $email): string
{
    $tokens = prunePasswordResetTokens(readPasswordResetTokens($tokensFile));

    // Eski bekleyen token'ları temizle (aynı e-posta)
    $emailLower = strtolower($email);
    $tokens = array_values(array_filter($tokens, function ($t) use ($emailLower) {
        return strtolower((string) ($t['email'] ?? '')) !== $emailLower;
    }));

    $plain = generatePasswordResetToken();
    $tokens[] = [
        'email' => $emailLower,
        'tokenHash' => hashPasswordResetToken($plain),
        'expiresAt' => date('c', time() + PASSWORD_RESET_TTL_SECONDS),
        'usedAt' => null,
        'createdAt' => date('c'),
    ];
    writePasswordResetTokens($tokensFile, $tokens);

    return $plain;
}

function findPasswordResetToken(array $tokens, string $plainToken): ?array
{
    $hash = hashPasswordResetToken($plainToken);
    foreach ($tokens as $t) {
        if (($t['tokenHash'] ?? '') === $hash) {
            return $t;
        }
    }
    return null;
}

function validatePasswordResetToken(string $tokensFile, string $plainToken): array
{
    $tokens = prunePasswordResetTokens(readPasswordResetTokens($tokensFile));
    writePasswordResetTokens($tokensFile, $tokens);

    if ($plainToken === '' || strpos($plainToken, 'clr_') !== 0) {
        return ['valid' => false, 'reason' => 'invalid_format'];
    }

    $found = findPasswordResetToken($tokens, $plainToken);
    if (!$found) {
        return ['valid' => false, 'reason' => 'not_found'];
    }

    $expires = strtotime((string) ($found['expiresAt'] ?? ''));
    if ($expires === false || $expires <= time()) {
        return ['valid' => false, 'reason' => 'expired', 'email' => $found['email'] ?? ''];
    }

    if (!empty($found['usedAt'])) {
        return ['valid' => false, 'reason' => 'used'];
    }

    return ['valid' => true, 'email' => strtolower((string) ($found['email'] ?? ''))];
}

function consumePasswordResetToken(string $tokensFile, string $plainToken): ?string
{
    $tokens = readPasswordResetTokens($tokensFile);
    $hash = hashPasswordResetToken($plainToken);
    $email = null;

    foreach ($tokens as &$t) {
        if (($t['tokenHash'] ?? '') === $hash && empty($t['usedAt'])) {
            $expires = strtotime((string) ($t['expiresAt'] ?? ''));
            if ($expires !== false && $expires > time()) {
                $t['usedAt'] = date('c');
                $email = strtolower((string) ($t['email'] ?? ''));
            }
            break;
        }
    }
    unset($t);

    writePasswordResetTokens($tokensFile, prunePasswordResetTokens($tokens));
    return $email;
}

function generateTemporaryPassword(int $length = 12): string
{
    $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
    $out = '';
    $max = strlen($chars) - 1;
    for ($i = 0; $i < $length; $i++) {
        $out .= $chars[random_int(0, $max)];
    }
    return $out;
}

function validateNewPassword(string $password): ?string
{
    if (strlen($password) < 8) {
        return 'Parola en az 8 karakter olmalı.';
    }
    return null;
}
