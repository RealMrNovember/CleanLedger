<?php

function cl_config(): array
{
    static $cfg;
    if ($cfg === null) {
        $cfg = require dirname(__DIR__) . '/config.php';
    }
    return $cfg;
}

function cl_pdo(): ?PDO
{
    static $pdo;
    $cfg = cl_config();
    if (($cfg['storage'] ?? 'json') !== 'mysql') {
        return null;
    }
    if ($pdo !== null) {
        return $pdo;
    }
    $m = $cfg['mysql'];
    $pass = $m['password'] ?? '';
    if ($pass === '' && !is_file(dirname(__DIR__) . '/config.local.php')) {
        return null;
    }
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $m['host'],
            (int) $m['port'],
            $m['database'],
            $m['charset'] ?? 'utf8mb4'
        );
        $pdo = new PDO($dsn, $m['username'], $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_sync (
            user_id VARCHAR(64) PRIMARY KEY,
            payload LONGTEXT NOT NULL,
            updated_at VARCHAR(32) NOT NULL,
            INDEX idx_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        return $pdo;
    } catch (Throwable $e) {
        return null;
    }
}

function cl_sync_dir(): string
{
    $dir = dirname(__DIR__) . '/data/sync';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function cl_sync_read(string $userId): ?array
{
    $pdo = cl_pdo();
    if ($pdo) {
        $stmt = $pdo->prepare('SELECT payload, updated_at FROM tenant_sync WHERE user_id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $payload = json_decode($row['payload'], true);
        if (!is_array($payload)) {
            return null;
        }
        return [
            'payload' => $payload,
            'updatedAt' => $row['updated_at'],
        ];
    }

    $file = cl_sync_dir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode(file_get_contents($file) ?: '{}', true);
    if (!is_array($data) || !isset($data['payload'])) {
        return null;
    }
    return [
        'payload' => $data['payload'],
        'updatedAt' => $data['updatedAt'] ?? '',
    ];
}

function cl_sync_write(string $userId, array $payload, string $updatedAt): void
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    $pdo = cl_pdo();
    if ($pdo) {
        $stmt = $pdo->prepare(
            'INSERT INTO tenant_sync (user_id, payload, updated_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at)'
        );
        $stmt->execute([$userId, $json, $updatedAt]);
        return;
    }

    $file = cl_sync_dir() . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '.json';
    file_put_contents($file, json_encode([
        'payload' => $payload,
        'updatedAt' => $updatedAt,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function cl_find_user_by_token(string $token): ?array
{
    $usersFile = dirname(__DIR__) . '/data/users.json';
    if (!is_file($usersFile)) {
        return null;
    }
    $users = json_decode(file_get_contents($usersFile) ?: '[]', true);
    if (!is_array($users)) {
        return null;
    }
    foreach ($users as $u) {
        if (($u['token'] ?? '') === $token) {
            return $u;
        }
    }
    return null;
}
