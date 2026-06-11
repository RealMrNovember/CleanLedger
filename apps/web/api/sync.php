<?php
/**
 * CleanLedger org-scoped sync — incremental push/pull + geçiş dönemi snapshot
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
require_once __DIR__ . '/lib/sync-org.php';

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

$orgId = cl_org_id_from_user($user);
$protocol = (string) ($_GET['protocol'] ?? $body['protocol'] ?? '');

if ($action === 'changes') {
    if ($protocol !== 'v2' && $protocol !== 'org') {
        respond(400, [
            'success' => false,
            'message' => 'org veya v2 protocol gerekli.',
        ]);
    }

    $since = (string) ($_GET['since'] ?? $body['since'] ?? '');
    $state = cl_org_sync_read($orgId);
    $changes = cl_changes_since($state, $since !== '' ? $since : null);

    respond(200, [
        'success' => true,
        'organizationId' => $orgId,
        'serverUpdatedAt' => (string) ($state['updatedAt'] ?? ''),
        'changes' => $changes,
        'count' => count($changes),
    ]);
}

if ($action === 'pull') {
    $since = (string) ($_GET['since'] ?? $body['since'] ?? '');
    $bootstrap = (string) ($_GET['bootstrap'] ?? $body['bootstrap'] ?? '') === '1';

    if ($protocol !== 'v2' && $protocol !== 'org') {
        $legacyUserId = $user['id'] ?? $user['email'] ?? '';
        $stored = cl_sync_read((string) $legacyUserId);
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

    $state = cl_org_sync_read($orgId);
    $changes = cl_changes_since($state, $since !== '' ? $since : null);
    $snapshot = is_array($state['snapshot'] ?? null) ? $state['snapshot'] : null;

    respond(200, [
        'success' => true,
        'organizationId' => $orgId,
        'serverUpdatedAt' => (string) ($state['updatedAt'] ?? ''),
        'changes' => $changes,
        'snapshot' => $bootstrap || ($since === '' && $snapshot) ? $snapshot : null,
        'message' => $changes || $snapshot ? null : 'Henüz org verisi yok.',
    ]);
}

if ($action === 'push') {
    if ($protocol !== 'v2' && $protocol !== 'org') {
        $payload = $body['payload'] ?? null;
        $clientUpdatedAt = (string) ($body['updatedAt'] ?? '');
        if (!is_array($payload) || $clientUpdatedAt === '') {
            respond(422, ['success' => false, 'message' => 'payload ve updatedAt gerekli.']);
        }

        $legacyUserId = $user['id'] ?? $user['email'] ?? '';
        $stored = cl_sync_read((string) $legacyUserId);
        if ($stored && ($stored['updatedAt'] ?? '') > $clientUpdatedAt) {
            respond(409, [
                'success' => false,
                'message' => 'Sunucuda daha yeni veri var. Önce pull yapın.',
                'serverUpdatedAt' => $stored['updatedAt'],
                'payload' => $stored['payload'],
            ]);
        }

        cl_sync_write((string) $legacyUserId, $payload, $clientUpdatedAt);
        respond(200, [
            'success' => true,
            'updatedAt' => $clientUpdatedAt,
            'message' => 'Veriler buluta kaydedildi.',
        ]);
    }

    $organizationId = (string) ($body['organizationId'] ?? $orgId);
    if ($organizationId !== $orgId) {
        respond(403, ['success' => false, 'message' => 'Organization kimliği uyuşmuyor.']);
    }

    $result = cl_apply_org_push($orgId, $body);
    if (!empty($result['conflict'])) {
        respond(409, [
            'success' => false,
            'message' => 'Sunucuda daha yeni veri var.',
            'organizationId' => $orgId,
            'serverUpdatedAt' => $result['serverUpdatedAt'],
            'snapshot' => $result['snapshot'] ?? null,
            'changes' => $result['changes'] ?? [],
        ]);
    }

    respond(200, [
        'success' => true,
        'organizationId' => $orgId,
        'serverUpdatedAt' => $result['serverUpdatedAt'],
        'message' => 'Değişiklikler kaydedildi.',
    ]);
}

respond(404, ['success' => false, 'message' => 'Geçersiz işlem.']);
