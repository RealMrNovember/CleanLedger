<?php
/**
 * CleanLedger merkezi veri sync — Pull/Push (offline-first)
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/lib/storage.php';

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? '';
$token = $_GET['token'] ?? '';
$body = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($body)) {
    $body = [];
}
if ($token === '' && isset($body['token'])) {
    $token = (string) $body['token'];
}

$user = $token !== '' ? cl_find_user_by_token($token) : null;
if (!$user) {
    respond(401, ['success' => false, 'message' => 'Geçersiz oturum.']);
}

$userId = $user['id'] ?? $user['email'] ?? '';

if ($action === 'pull') {
    $stored = cl_sync_read($userId);
    if (!$stored) {
        respond(200, [
            'success' => true,
            'payload' => null,
            'updatedAt' => null,
            'message' => 'Henüz bulut yedeği yok.',
        ]);
    }
    respond(200, [
        'success' => true,
        'payload' => $stored['payload'],
        'updatedAt' => $stored['updatedAt'],
    ]);
}

if ($action === 'push') {
    $payload = $body['payload'] ?? null;
    $clientUpdatedAt = (string) ($body['updatedAt'] ?? '');
    if (!is_array($payload) || $clientUpdatedAt === '') {
        respond(422, ['success' => false, 'message' => 'payload ve updatedAt gerekli.']);
    }

    $stored = cl_sync_read($userId);
    if ($stored && ($stored['updatedAt'] ?? '') > $clientUpdatedAt) {
        respond(409, [
            'success' => false,
            'message' => 'Sunucuda daha yeni veri var. Önce pull yapın.',
            'serverUpdatedAt' => $stored['updatedAt'],
            'payload' => $stored['payload'],
        ]);
    }

    cl_sync_write($userId, $payload, $clientUpdatedAt);
    respond(200, [
        'success' => true,
        'updatedAt' => $clientUpdatedAt,
        'message' => 'Veriler buluta kaydedildi.',
    ]);
}

respond(404, ['success' => false, 'message' => 'Geçersiz işlem.']);
