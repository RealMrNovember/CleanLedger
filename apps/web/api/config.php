<?php
/**
 * CleanLedger API yapılandırması.
 * MySQL için config.local.php oluşturun (gitignore'da).
 */
$local = __DIR__ . '/config.local.php';
$defaults = [
    'storage' => 'json',
    'mysql' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'cleanledger',
        'username' => 'cleanledger',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
    'app_url' => 'https://cleanledger.cicibyte.com',
    'mail' => [
        'host' => getenv('CL_MAIL_HOST') ?: '',
        'port' => (int) (getenv('CL_MAIL_PORT') ?: 587),
        'encryption' => getenv('CL_MAIL_ENCRYPTION') ?: 'tls',
        'tls_peer_name' => getenv('CL_MAIL_TLS_PEER') ?: '',
        'username' => getenv('CL_MAIL_USERNAME') ?: '',
        'password' => getenv('CL_MAIL_PASSWORD') ?: '',
        'from_email' => getenv('CL_MAIL_FROM') ?: 'info@cicibyte.com',
        'from_name' => getenv('CL_MAIL_FROM_NAME') ?: 'CleanLedger',
    ],
    'admin' => [
        'secret' => getenv('CL_ADMIN_SECRET') ?: '',
    ],
];

if (is_file($local)) {
    $overrides = require $local;
    return array_replace_recursive($defaults, is_array($overrides) ? $overrides : []);
}

return $defaults;
