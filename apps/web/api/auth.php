<?php
/**
 * CleanLedger Auth API — sadece cleanledger.cicibyte.com
 * Web kayıt/giriş + masaüstü sync için ortak kullanıcı deposu
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataDir = __DIR__ . '/data';
$usersFile = $dataDir . '/users.json';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([]));
}

function readUsers(string $file): array
{
    $raw = file_get_contents($file);
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function writeUsers(string $file, array $users): void
{
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
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

    respond(201, [
        'success' => true,
        'token' => $token,
        'user' => [
            'email' => $user['email'],
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

    if ($email === '' || $password === '') {
        respond(422, ['success' => false, 'message' => 'E-posta ve şifre gerekli.']);
    }

    foreach ($users as &$u) {
        if (strtolower($u['email']) === $email) {
            if (!password_verify($password, $u['passwordHash'])) {
                respond(401, ['success' => false, 'message' => 'E-posta veya şifre hatalı.']);
            }
            $u['token'] = generateToken();
            writeUsers($usersFile, $users);
            respond(200, [
                'success' => true,
                'token' => $u['token'],
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
    unset($u);

    respond(401, ['success' => false, 'message' => 'E-posta veya şifre hatalı.']);
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
            respond(200, [
                'success' => true,
                'token' => $u['token'],
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
    unset($u);

    respond(401, ['success' => false, 'message' => 'Geçersiz oturum.']);
}

respond(404, ['success' => false, 'message' => 'Geçersiz işlem.']);
