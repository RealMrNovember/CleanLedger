<?php
/**
 * CleanLedger Auth API — sadece cleanledger.cicibyte.com
 * Web kayıt/giriş + masaüstü sync için ortak kullanıcı deposu
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/lib/mail.php';
require_once __DIR__ . '/lib/password-reset.php';

$config = require __DIR__ . '/config.php';
$dataDir = __DIR__ . '/data';
$usersFile = $dataDir . '/users.json';
$logFile = $dataDir . '/auth.log';
$resetTokensFile = passwordResetTokensFile($dataDir);
$resetRateFile = passwordResetRateFile($dataDir);

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([]));
}

function authLog(string $event, array $context = []): void
{
    global $logFile;
    $entry = [
        'ts' => date('c'),
        'event' => $event,
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'action' => $_GET['action'] ?? '',
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? '',
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ] + $context;
    file_put_contents(
        $logFile,
        json_encode($entry, JSON_UNESCAPED_UNICODE) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}

function readUsers(string $file): array
{
    $raw = @file_get_contents($file);
    if ($raw === false) {
        authLog('users_read_failed', ['file' => $file, 'reason' => 'file_get_contents_failed']);
        return [];
    }
    $data = json_decode($raw ?: '[]', true);
    if (!is_array($data)) {
        authLog('users_read_failed', ['file' => $file, 'reason' => 'json_decode_failed']);
        return [];
    }
    return $data;
}

function writeUsers(string $file, array $users): void
{
    $ok = file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($ok === false) {
        authLog('users_write_failed', ['file' => $file, 'reason' => 'file_put_contents_failed']);
    }
}

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function generateToken(): string
{
    return bin2hex(random_bytes(32));
}

$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($body)) {
    $body = [];
}

$users = readUsers($usersFile);

if ($action === 'signup') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';
    $companyName = trim($body['companyName'] ?? '');
    $ownerName = trim($body['ownerName'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $city = trim($body['city'] ?? '');

    if ($email === '' || $password === '' || $companyName === '' || $ownerName === '' || $phone === '') {
        respond(422, ['success' => false, 'message' => 'Zorunlu alanları doldurun.']);
    }

    foreach ($users as $u) {
        if (strtolower($u['email']) === $email) {
            respond(409, ['success' => false, 'message' => 'Bu e-posta zaten kayıtlı.']);
        }
    }

    $token = generateToken();
    $user = [
        'id' => uniqid('cl_', true),
        'email' => $email,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'companyName' => $companyName,
        'ownerName' => $ownerName,
        'phone' => $phone,
        'city' => $city,
        'token' => $token,
        'trialEndsAt' => date('c', strtotime('+14 days')),
        'createdAt' => date('c'),
    ];
    $users[] = $user;
    writeUsers($usersFile, $users);

    $verifyUsers = readUsers($usersFile);
    $written = null;
    foreach ($verifyUsers as $vu) {
        if (strtolower((string) ($vu['email'] ?? '')) === $email) {
            $written = $vu;
            break;
        }
    }
    if (!$written || !password_verify($password, (string) ($written['passwordHash'] ?? ''))) {
        authLog('signup_hash_verify_failed', ['email' => $email, 'user_id' => $user['id']]);
    } else {
        authLog('signup_success', ['email' => $email, 'user_id' => $user['id']]);
    }

    respond(201, [
        'success' => true,
        'token' => $token,
        'organizationId' => $email,
        'user' => [
            'email' => $user['email'],
            'organizationId' => $email,
            'companyName' => $user['companyName'],
            'ownerName' => $user['ownerName'],
            'phone' => $user['phone'],
            'city' => $user['city'],
            'trialEndsAt' => $user['trialEndsAt'],
        ],
    ]);
}

if ($action === 'login') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    authLog('login_attempt', [
        'email' => $email !== '' ? $email : '(empty)',
        'has_password' => $password !== '',
        'user_count' => count($users),
    ]);

    if ($email === '' || $password === '') {
        authLog('login_failed', ['reason' => 'missing_fields', 'email' => $email]);
        respond(422, [
            'success' => false,
            'code' => 'MISSING_FIELDS',
            'message' => 'E-posta ve şifre gerekli.',
        ]);
    }

    if ($users === [] && !file_exists($usersFile)) {
        authLog('login_failed', ['reason' => 'users_file_missing', 'email' => $email]);
        respond(500, [
            'success' => false,
            'code' => 'USERS_STORE_UNAVAILABLE',
            'message' => 'Kullanıcı deposu okunamadı.',
        ]);
    }

    $userFound = false;
    foreach ($users as &$u) {
        if (strtolower($u['email']) === $email) {
            $userFound = true;
            if (!isset($u['passwordHash']) || !is_string($u['passwordHash'])) {
                authLog('login_failed', [
                    'reason' => 'password_hash_missing',
                    'email' => $email,
                    'user_id' => $u['id'] ?? null,
                ]);
                respond(500, [
                    'success' => false,
                    'code' => 'PASSWORD_HASH_MISSING',
                    'message' => 'Hesap kaydı bozuk. Destek ile iletişime geçin.',
                ]);
            }
            if (!password_verify($password, $u['passwordHash'])) {
                authLog('login_failed', [
                    'reason' => 'wrong_password',
                    'email' => $email,
                    'user_id' => $u['id'] ?? null,
                ]);
                respond(401, [
                    'success' => false,
                    'code' => 'WRONG_PASSWORD',
                    'message' => 'E-posta veya şifre hatalı.',
                    'support' => [
                        'forgotPassword' => true,
                        'whatsapp' => 'https://wa.me/905354895050',
                    ],
                ]);
            }
            $u['token'] = generateToken();
            writeUsers($usersFile, $users);
            authLog('login_success', [
                'email' => $email,
                'user_id' => $u['id'] ?? null,
                'token_prefix' => substr($u['token'], 0, 8),
            ]);
            respond(200, [
                'success' => true,
                'token' => $u['token'],
                'organizationId' => $email,
                'user' => [
                    'email' => $u['email'],
                    'organizationId' => $email,
                    'companyName' => $u['companyName'],
                    'ownerName' => $u['ownerName'],
                    'phone' => $u['phone'],
                    'city' => $u['city'],
                    'trialEndsAt' => $u['trialEndsAt'],
                ],
            ]);
        }
    }
    unset($u);

    authLog('login_failed', [
        'reason' => $userFound ? 'unknown' : 'user_not_found',
        'email' => $email,
    ]);
    respond(401, [
        'success' => false,
        'code' => 'USER_NOT_FOUND',
        'message' => 'E-posta veya şifre hatalı.',
    ]);
}

if ($action === 'profile') {
    $token = $_GET['token'] ?? ($body['token'] ?? '');
    if ($token === '') {
        respond(401, ['success' => false, 'message' => 'Token gerekli.']);
    }

    foreach ($users as $u) {
        if (($u['token'] ?? '') === $token) {
            respond(200, [
                'success' => true,
                'user' => [
                    'email' => $u['email'],
                    'companyName' => $u['companyName'],
                    'ownerName' => $u['ownerName'],
                    'phone' => $u['phone'],
                    'city' => $u['city'],
                    'trialEndsAt' => $u['trialEndsAt'],
                ],
            ]);
        }
    }

    respond(401, ['success' => false, 'message' => 'Geçersiz oturum.']);
}

if ($action === 'change_password') {
    $token = trim($body['token'] ?? $_GET['token'] ?? '');
    $currentPassword = $body['currentPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';

    if ($token === '') {
        respond(401, ['success' => false, 'message' => 'Oturum gerekli.']);
    }
    if ($currentPassword === '' || $newPassword === '') {
        respond(422, ['success' => false, 'message' => 'Mevcut ve yeni şifre gerekli.']);
    }
    if (strlen($newPassword) < 6) {
        respond(422, ['success' => false, 'message' => 'Yeni şifre en az 6 karakter olmalı.']);
    }
    if ($currentPassword === $newPassword) {
        respond(422, ['success' => false, 'message' => 'Yeni şifre mevcut şifreden farklı olmalı.']);
    }

    foreach ($users as &$u) {
        if (($u['token'] ?? '') === $token) {
            if (!password_verify($currentPassword, $u['passwordHash'])) {
                respond(401, ['success' => false, 'message' => 'Mevcut şifre hatalı.']);
            }
            $u['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
            $u['token'] = generateToken();
            writeUsers($usersFile, $users);
            $orgEmail = strtolower(trim((string) $u['email']));
            respond(200, [
                'success' => true,
                'token' => $u['token'],
                'organizationId' => $orgEmail,
                'user' => [
                    'email' => $u['email'],
                    'organizationId' => $orgEmail,
                    'companyName' => $u['companyName'],
                    'ownerName' => $u['ownerName'],
                    'phone' => $u['phone'],
                    'city' => $u['city'],
                    'trialEndsAt' => $u['trialEndsAt'],
                ],
            ]);
        }
    }
    unset($u);

    respond(401, ['success' => false, 'message' => 'Geçersiz oturum.']);
}

if ($action === 'forgot_password') {
    $email = strtolower(trim($body['email'] ?? ''));
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $genericMessage = 'Kayıtlı bir hesabınız varsa sıfırlama bağlantısı e-posta adresinize gönderildi.';

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(200, ['success' => true, 'message' => $genericMessage]);
    }

    if (passwordResetRateLimited($resetRateFile, $email, $ip)) {
        authLog('password_reset_rate_limited', ['email' => $email, 'ip' => $ip]);
        respond(200, ['success' => true, 'message' => $genericMessage]);
    }

    $userExists = false;
    foreach ($users as $u) {
        if (strtolower((string) ($u['email'] ?? '')) === $email) {
            $userExists = true;
            break;
        }
    }

    if ($userExists) {
        recordPasswordResetRateEvent($resetRateFile, $email, $ip);
        $plainToken = createPasswordResetToken($resetTokensFile, $email);
        $appUrl = rtrim((string) ($config['app_url'] ?? 'https://cleanledger.cicibyte.com'), '/');
        $resetUrl = $appUrl . '/reset-password?token=' . urlencode($plainToken);

        $companyName = '';
        foreach ($users as $u) {
            if (strtolower((string) ($u['email'] ?? '')) === $email) {
                $companyName = (string) ($u['companyName'] ?? '');
                break;
            }
        }

        $sent = sendPasswordResetEmail($config, $email, $resetUrl, $companyName);
        authLog('password_reset_requested', [
            'email' => $email,
            'mail_sent' => $sent,
            'mail_configured' => mailIsConfigured($config['mail'] ?? []),
        ]);
    } else {
        authLog('password_reset_unknown_email', ['email' => $email]);
    }

    respond(200, ['success' => true, 'message' => $genericMessage]);
}

if ($action === 'validate_reset_token') {
    $token = trim($_GET['token'] ?? ($body['token'] ?? ''));
    $result = validatePasswordResetToken($resetTokensFile, $token);

    if (!$result['valid']) {
        $messages = [
            'expired' => 'Sıfırlama bağlantısının süresi dolmuş.',
            'used' => 'Bu sıfırlama bağlantısı zaten kullanılmış.',
            'not_found' => 'Geçersiz sıfırlama bağlantısı.',
            'invalid_format' => 'Geçersiz sıfırlama bağlantısı.',
        ];
        respond(400, [
            'success' => false,
            'valid' => false,
            'reason' => $result['reason'] ?? 'invalid',
            'message' => $messages[$result['reason'] ?? ''] ?? 'Geçersiz sıfırlama bağlantısı.',
        ]);
    }

    respond(200, ['success' => true, 'valid' => true]);
}

if ($action === 'reset_password') {
    $token = trim($body['token'] ?? '');
    $password = $body['password'] ?? '';

    $validation = validatePasswordResetToken($resetTokensFile, $token);
    if (!$validation['valid']) {
        $messages = [
            'expired' => 'Sıfırlama bağlantısının süresi dolmuş. Yeni bir talep oluşturun.',
            'used' => 'Bu sıfırlama bağlantısı zaten kullanılmış.',
            'not_found' => 'Geçersiz sıfırlama bağlantısı.',
            'invalid_format' => 'Geçersiz sıfırlama bağlantısı.',
        ];
        respond(400, [
            'success' => false,
            'message' => $messages[$validation['reason'] ?? ''] ?? 'Geçersiz sıfırlama bağlantısı.',
        ]);
    }

    $passwordError = validateNewPassword($password);
    if ($passwordError !== null) {
        respond(422, ['success' => false, 'message' => $passwordError]);
    }

    $email = consumePasswordResetToken($resetTokensFile, $token);
    if ($email === null) {
        respond(400, ['success' => false, 'message' => 'Geçersiz veya süresi dolmuş sıfırlama bağlantısı.']);
    }

    $updated = false;
    foreach ($users as &$u) {
        if (strtolower((string) ($u['email'] ?? '')) === $email) {
            $u['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
            $u['token'] = generateToken();
            $updated = true;
            break;
        }
    }
    unset($u);

    if (!$updated) {
        respond(404, ['success' => false, 'message' => 'Hesap bulunamadı.']);
    }

    writeUsers($usersFile, $users);
    authLog('password_reset_completed', ['email' => $email]);

    respond(200, [
        'success' => true,
        'message' => 'Parolanız güncellendi. Giriş yapabilirsiniz.',
    ]);
}

if ($action === 'admin_reset_password') {
    $adminSecret = (string) ($config['admin']['secret'] ?? '');
    $provided = trim($body['adminSecret'] ?? ($_SERVER['HTTP_X_ADMIN_SECRET'] ?? ''));

    if ($adminSecret === '' || !hash_equals($adminSecret, $provided)) {
        authLog('admin_reset_denied', ['ip' => $_SERVER['REMOTE_ADDR'] ?? '']);
        respond(403, ['success' => false, 'message' => 'Yetkisiz.']);
    }

    $email = strtolower(trim($body['email'] ?? ''));
    $newPassword = trim($body['newPassword'] ?? '');
    $notify = (bool) ($body['notify'] ?? false);
    $actor = trim($body['actor'] ?? 'license-admin');

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(422, ['success' => false, 'message' => 'Geçerli e-posta gerekli.']);
    }

    if ($newPassword === '') {
        $newPassword = generateTemporaryPassword();
    } else {
        $passwordError = validateNewPassword($newPassword);
        if ($passwordError !== null) {
            respond(422, ['success' => false, 'message' => $passwordError]);
        }
    }

    $updated = false;
    foreach ($users as &$u) {
        if (strtolower((string) ($u['email'] ?? '')) === $email) {
            $u['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
            $u['token'] = generateToken();
            $updated = true;
            break;
        }
    }
    unset($u);

    if (!$updated) {
        respond(404, ['success' => false, 'message' => 'CleanLedger hesabı bulunamadı.']);
    }

    writeUsers($usersFile, $users);
    authLog('admin_password_reset', [
        'email' => $email,
        'actor' => $actor,
        'notify' => $notify,
    ]);

    if ($notify) {
        sendAdminPasswordResetNotice($config, $email);
    }

    respond(200, [
        'success' => true,
        'message' => 'Parola sıfırlandı.',
        'temporaryPassword' => $newPassword,
    ]);
}

respond(404, ['success' => false, 'message' => 'Geçersiz işlem.']);
