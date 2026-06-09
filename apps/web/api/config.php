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
];

if (is_file($local)) {
    $overrides = require $local;
    return array_replace_recursive($defaults, is_array($overrides) ? $overrides : []);
}

return $defaults;
