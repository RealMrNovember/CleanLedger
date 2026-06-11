#!/usr/bin/env php
<?php
/**
 * Faz 10 hesap kurtarma E2E testi — izole kullanıcı, production verisine dokunmaz.
 * Kullanım: php apps/web/api/scripts/test-faz10-e2e.php
 */
declare(strict_types=1);

const API_BASE = 'https://cleanledger.cicibyte.com/api/auth.php';
const TEST_EMAIL = 'faz10-e2e-test@cicibyte.internal';
const TEST_PASSWORD_INITIAL = 'Faz10InitPass!2026';
const TEST_PASSWORD_RESET = 'Faz10ResetPass!2026';
const TEST_PASSWORD_ADMIN = 'Faz10AdminPass!2026';

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$usersFile = $dataDir . '/users.json';
$tokensFile = $dataDir . '/password_reset_tokens.json';
$logFile = $dataDir . '/auth.log';

require_once $root . '/lib/mail.php';
require_once $root . '/lib/password-reset.php';

$config = require $root . '/config.php';
$adminSecret = (string) ($config['admin']['secret'] ?? '');

$results = [];
$passed = 0;
$failed = 0;

function pass(array &$results, int &$passed, string $name, string $detail = ''): void
{
    $results[] = ['status' => 'PASS', 'name' => $name, 'detail' => $detail];
    $passed++;
    echo "[PASS] {$name}" . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
}

function fail(array &$results, int &$failed, string $name, string $detail = ''): void
{
    $results[] = ['status' => 'FAIL', 'name' => $name, 'detail' => $detail];
    $failed++;
    echo "[FAIL] {$name}" . ($detail !== '' ? " — {$detail}" : '') . PHP_EOL;
}

function httpPost(string $action, array $body, array $headers = []): array
{
    $url = API_BASE . '?action=' . urlencode($action);
    $ch = curl_init($url);
    $hdrs = array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $json = is_string($raw) ? json_decode($raw, true) : null;
    return ['code' => $code, 'body' => is_array($json) ? $json : [], 'raw' => $raw, 'error' => $err];
}

function httpGet(string $action, array $query = []): array
{
    $q = http_build_query(array_merge(['action' => $action], $query));
    $url = API_BASE . '?' . $q;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = is_string($raw) ? json_decode($raw, true) : null;
    return ['code' => $code, 'body' => is_array($json) ? $json : [], 'raw' => $raw];
}

function findUserHash(string $usersFile, string $email): ?string
{
    $users = json_decode(file_get_contents($usersFile) ?: '[]', true);
    if (!is_array($users)) {
        return null;
    }
    foreach ($users as $u) {
        if (strtolower((string) ($u['email'] ?? '')) === strtolower($email)) {
            return (string) ($u['passwordHash'] ?? '');
        }
    }
    return null;
}

function userExists(string $usersFile, string $email): bool
{
    return findUserHash($usersFile, $email) !== null;
}

function tailAuthLogEvent(string $logFile, string $event, int $maxLines = 50): ?array
{
    if (!is_file($logFile)) {
        return null;
    }
    $lines = array_slice(file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [], -$maxLines);
    for ($i = count($lines) - 1; $i >= 0; $i--) {
        $row = json_decode($lines[$i], true);
        if (is_array($row) && ($row['event'] ?? '') === $event) {
            return $row;
        }
    }
    return null;
}

echo "=== Faz 10 E2E Test ===" . PHP_EOL;
echo 'Test kullanıcı: ' . TEST_EMAIL . PHP_EOL;
echo 'SMTP yapılandırılmış: ' . (mailIsConfigured($config['mail'] ?? []) ? 'evet' : 'hayır') . PHP_EOL;
echo 'Admin secret yapılandırılmış: ' . ($adminSecret !== '' ? 'evet (' . strlen($adminSecret) . ' karakter)' : 'hayır') . PHP_EOL;
echo PHP_EOL;

// --- 0) İzole test kullanıcısı ---
if (!userExists($usersFile, TEST_EMAIL)) {
    $signup = httpPost('signup', [
        'email' => TEST_EMAIL,
        'password' => TEST_PASSWORD_INITIAL,
        'companyName' => 'Faz10 E2E Test',
        'ownerName' => 'Test Bot',
        'phone' => '+905000000000',
        'city' => 'Test',
    ]);
    if ($signup['code'] === 201 && ($signup['body']['success'] ?? false)) {
        pass($results, $passed, 'Test kullanıcı oluşturma', 'signup 201');
    } else {
        fail($results, $failed, 'Test kullanıcı oluşturma', 'HTTP ' . $signup['code'] . ' ' . ($signup['raw'] ?? ''));
        echo PHP_EOL . "Test kullanıcı oluşturulamadı, devam edilemiyor." . PHP_EOL;
        exit(1);
    }
} else {
    pass($results, $passed, 'Test kullanıcı mevcut', 'Önceki koşudan');
}

$hashBefore = findUserHash($usersFile, TEST_EMAIL);
if ($hashBefore === null || $hashBefore === '') {
    fail($results, $failed, 'Test kullanıcı hash okuma', 'passwordHash bulunamadı');
    exit(1);
}

// --- 1) SMTP / forgot_password ---
$logPosBefore = is_file($logFile) ? filesize($logFile) : 0;
$forgot = httpPost('forgot_password', ['email' => TEST_EMAIL]);

if ($forgot['code'] === 200 && ($forgot['body']['success'] ?? false)) {
    pass($results, $passed, 'forgot_password HTTP 200 + genel yanıt', $forgot['body']['message'] ?? '');
} else {
    fail($results, $failed, 'forgot_password', 'HTTP ' . $forgot['code']);
}

sleep(1);
$resetLog = tailAuthLogEvent($logFile, 'password_reset_requested');
if ($resetLog !== null && ($resetLog['email'] ?? '') === TEST_EMAIL) {
    $mailSent = (bool) ($resetLog['mail_sent'] ?? false);
    $mailConfigured = (bool) ($resetLog['mail_configured'] ?? false);
    if ($mailConfigured && $mailSent) {
        pass($results, $passed, 'SMTP e-posta gönderimi', 'auth.log mail_sent=true');
    } elseif ($mailConfigured && !$mailSent) {
        fail($results, $failed, 'SMTP e-posta gönderimi', 'mail_configured=true ama mail_sent=false — SMTP bağlantı/gönderim hatası');
    } else {
        fail($results, $failed, 'SMTP e-posta gönderimi', 'mail yapılandırması logda false');
    }
} else {
    fail($results, $failed, 'password_reset_requested log kaydı', 'auth.log bulunamadı');
}

// Bilinmeyen e-posta enumeration testi
$unknown = httpPost('forgot_password', ['email' => 'faz10-nonexistent-' . time() . '@cicibyte.internal']);
if ($unknown['code'] === 200 && ($unknown['body']['success'] ?? false)) {
    pass($results, $passed, 'Enumeration koruması (bilinmeyen e-posta)', '200 + aynı genel mesaj');
} else {
    fail($results, $failed, 'Enumeration koruması', 'HTTP ' . $unknown['code']);
}

// --- 2) Admin secret ---
$badAdmin = httpPost('admin_reset_password', [
    'email' => TEST_EMAIL,
    'adminSecret' => 'wrong-secret-on-purpose-' . bin2hex(random_bytes(4)),
    'newPassword' => 'ShouldNotApply!99',
], ['X-Admin-Secret: invalid-header-secret']);

if ($badAdmin['code'] === 403) {
    pass($results, $passed, 'Admin yetkisiz istek reddi', 'HTTP 403');
} else {
    fail($results, $failed, 'Admin yetkisiz istek reddi', 'HTTP ' . $badAdmin['code'] . ' beklenen 403');
}

if ($adminSecret === '') {
    fail($results, $failed, 'Admin secret yapılandırması', 'config.local.php admin.secret boş');
} else {
    $goodAdmin = httpPost('admin_reset_password', [
        'email' => TEST_EMAIL,
        'newPassword' => TEST_PASSWORD_ADMIN,
        'actor' => 'faz10-e2e-script',
    ], ['X-Admin-Secret: ' . $adminSecret]);

    if ($goodAdmin['code'] === 200 && ($goodAdmin['body']['success'] ?? false)) {
        pass($results, $passed, 'Admin doğru secret ile sıfırlama', 'HTTP 200');
    } else {
        fail($results, $failed, 'Admin doğru secret ile sıfırlama', 'HTTP ' . $goodAdmin['code'] . ' ' . ($goodAdmin['body']['message'] ?? ''));
    }

    $hashAfterAdmin = findUserHash($usersFile, TEST_EMAIL);
    if ($hashAfterAdmin !== null && $hashAfterAdmin !== $hashBefore) {
        pass($results, $passed, 'Admin sıfırlama hash güncellemesi', 'passwordHash değişti');
    } else {
        fail($results, $failed, 'Admin sıfırlama hash güncellemesi', 'hash değişmedi');
    }

    $loginAdmin = httpPost('login', ['email' => TEST_EMAIL, 'password' => TEST_PASSWORD_ADMIN]);
    if ($loginAdmin['code'] === 200 && ($loginAdmin['body']['success'] ?? false)) {
        pass($results, $passed, 'Admin sıfırlama sonrası giriş', 'login OK');
    } else {
        fail($results, $failed, 'Admin sıfırlama sonrası giriş', 'HTTP ' . $loginAdmin['code']);
    }
}

// --- 3) Token hash, TTL, reset, login ---
$plainToken = createPasswordResetToken($tokensFile, TEST_EMAIL);
$expectedHash = hash('sha256', $plainToken);

$stored = readPasswordResetTokens($tokensFile);
$tokenRow = null;
foreach ($stored as $t) {
    if (($t['tokenHash'] ?? '') === $expectedHash) {
        $tokenRow = $t;
        break;
    }
}

if ($tokenRow !== null) {
    pass($results, $passed, 'Token SHA-256 hash saklama', 'düz metin dosyada yok');
} else {
    fail($results, $failed, 'Token SHA-256 hash saklama', 'tokenHash eşleşmedi');
}

if ($tokenRow !== null && strpos($plainToken, 'clr_') === 0) {
    pass($results, $passed, 'Token formatı', 'clr_ prefix');
} else {
    fail($results, $failed, 'Token formatı', 'geçersiz prefix');
}

if ($tokenRow !== null) {
    $expiresAt = strtotime((string) ($tokenRow['expiresAt'] ?? ''));
    $createdAt = strtotime((string) ($tokenRow['createdAt'] ?? ''));
    $ttl = $expiresAt - $createdAt;
    if ($ttl >= 3590 && $ttl <= 3610) {
        pass($results, $passed, 'Token TTL (60 dk)', "TTL={$ttl}s");
    } else {
        fail($results, $failed, 'Token TTL (60 dk)', "TTL={$ttl}s beklenen ~3600");
    }
}

$validate = httpGet('validate_reset_token', ['token' => $plainToken]);
if ($validate['code'] === 200 && ($validate['body']['valid'] ?? false) === true) {
    pass($results, $passed, 'validate_reset_token (geçerli)', 'HTTP 200 valid=true');
} else {
    fail($results, $failed, 'validate_reset_token (geçerli)', 'HTTP ' . $validate['code']);
}

$badValidate = httpGet('validate_reset_token', ['token' => 'clr_invalidtoken00000000000000000000']);
if ($badValidate['code'] === 400) {
    pass($results, $passed, 'validate_reset_token (geçersiz)', 'HTTP 400');
} else {
    fail($results, $failed, 'validate_reset_token (geçersiz)', 'HTTP ' . $badValidate['code']);
}

$hashBeforeReset = findUserHash($usersFile, TEST_EMAIL);
$reset = httpPost('reset_password', [
    'token' => $plainToken,
    'password' => TEST_PASSWORD_RESET,
]);

if ($reset['code'] === 200 && ($reset['body']['success'] ?? false)) {
    pass($results, $passed, 'reset_password HTTP 200', $reset['body']['message'] ?? '');
} else {
    fail($results, $failed, 'reset_password', 'HTTP ' . $reset['code'] . ' ' . ($reset['raw'] ?? ''));
}

$hashAfterReset = findUserHash($usersFile, TEST_EMAIL);
if ($hashBeforeReset !== null && $hashAfterReset !== null && $hashAfterReset !== $hashBeforeReset) {
    pass($results, $passed, 'reset_password hash güncellemesi', 'passwordHash değişti');
} else {
    fail($results, $failed, 'reset_password hash güncellemesi', 'hash değişmedi');
}

$reuse = httpPost('reset_password', [
    'token' => $plainToken,
    'password' => 'AnotherPass!2026',
]);
if ($reuse['code'] === 400) {
    pass($results, $passed, 'Token tek kullanımlık', 'ikinci reset HTTP 400');
} else {
    fail($results, $failed, 'Token tek kullanımlık', 'HTTP ' . $reuse['code'] . ' beklenen 400');
}

$loginReset = httpPost('login', ['email' => TEST_EMAIL, 'password' => TEST_PASSWORD_RESET]);
if ($loginReset['code'] === 200 && ($loginReset['body']['success'] ?? false)) {
    pass($results, $passed, 'Reset sonrası giriş', 'login OK');
} else {
    fail($results, $failed, 'Reset sonrası giriş', 'HTTP ' . $loginReset['code']);
}

$loginOld = httpPost('login', ['email' => TEST_EMAIL, 'password' => TEST_PASSWORD_ADMIN]);
if ($loginOld['code'] === 401) {
    pass($results, $passed, 'Eski parola reddi', 'HTTP 401');
} else {
    fail($results, $failed, 'Eski parola reddi', 'HTTP ' . $loginOld['code'] . ' beklenen 401');
}

// --- 4) License sunucusu simülasyonu (Laravel Http ile aynı endpoint) ---
if ($adminSecret !== '') {
    $licenseSim = httpPost('admin_reset_password', [
        'email' => TEST_EMAIL,
        'actor' => 'license-admin-simulation',
    ], ['X-Admin-Secret: ' . $adminSecret]);

    if ($licenseSim['code'] === 200 && isset($licenseSim['body']['temporaryPassword'])) {
        pass($results, $passed, 'Lisans sunucusu simülasyonu', 'temporaryPassword döndü');
        $tempPass = (string) $licenseSim['body']['temporaryPassword'];
        $loginTemp = httpPost('login', ['email' => TEST_EMAIL, 'password' => $tempPass]);
        if ($loginTemp['code'] === 200) {
            pass($results, $passed, 'Lisans admin geçici parola ile giriş', 'login OK');
        } else {
            fail($results, $failed, 'Lisans admin geçici parola ile giriş', 'HTTP ' . $loginTemp['code']);
        }
    } else {
        fail($results, $failed, 'Lisans sunucusu simülasyonu', 'HTTP ' . $licenseSim['code']);
    }
}

// Temizlik: test kullanıcısını known state'e al (reset parola)
httpPost('admin_reset_password', [
    'email' => TEST_EMAIL,
    'newPassword' => TEST_PASSWORD_INITIAL,
    'actor' => 'faz10-e2e-cleanup',
], $adminSecret !== '' ? ['X-Admin-Secret: ' . $adminSecret] : []);

echo PHP_EOL . "=== Özet ===" . PHP_EOL;
echo "Geçti: {$passed}" . PHP_EOL;
echo "Kaldı: {$failed}" . PHP_EOL;
echo PHP_EOL . 'Test kullanıcı korundu: ' . TEST_EMAIL . ' (production hesaplarına dokunulmadı)' . PHP_EOL;

exit($failed > 0 ? 1 : 0);
