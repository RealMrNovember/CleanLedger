<?php

require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/order-numbers.php';

const CL_SYNC_CHANGE_LOG_LIMIT = 2000;

function cl_normalize_org_id(string $email): string
{
    return strtolower(trim($email));
}

function cl_org_id_from_user(array $user): string
{
    $email = strtolower(trim((string) ($user['email'] ?? '')));
    if ($email !== '') {
        return cl_normalize_org_id($email);
    }
    return preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($user['id'] ?? 'unknown'));
}

function cl_org_sync_dir(): string
{
    $dir = dirname(__DIR__) . '/data/sync/orgs';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function cl_org_sync_file(string $orgId): string
{
    $safe = preg_replace('/[^a-zA-Z0-9@._-]/', '_', $orgId);
    return cl_org_sync_dir() . '/' . $safe . '.json';
}

function cl_empty_org_state(string $orgId): array
{
    return [
        'organizationId' => $orgId,
        'schemaVersion' => 3,
        'updatedAt' => '',
        'snapshot' => null,
        'changes' => [],
    ];
}

function cl_org_sync_read(string $orgId): array
{
    $pdo = cl_pdo();
    if ($pdo) {
        $stmt = $pdo->prepare(
            'SELECT payload, updated_at FROM tenant_sync WHERE user_id = ?'
        );
        $stmt->execute(['org:' . $orgId]);
        $row = $stmt->fetch();
        if ($row) {
            $decoded = json_decode($row['payload'], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    $file = cl_org_sync_file($orgId);
    if (is_file($file)) {
        $decoded = json_decode(file_get_contents($file) ?: '{}', true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    $legacyUserId = preg_replace('/[^a-zA-Z0-9_-]/', '', $orgId);
    $legacy = cl_sync_read($legacyUserId);
    if ($legacy && is_array($legacy['payload'])) {
        $migrated = cl_empty_org_state($orgId);
        $migrated['updatedAt'] = (string) ($legacy['updatedAt'] ?? '');
        $migrated['snapshot'] = [
            'schemaVersion' => 3,
            'data' => $legacy['payload'],
            'updatedAt' => $migrated['updatedAt'],
        ];
        cl_org_sync_write($orgId, $migrated);
        return $migrated;
    }

    return cl_empty_org_state($orgId);
}

function cl_org_sync_write(string $orgId, array $state): void
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    $updatedAt = (string) ($state['updatedAt'] ?? date('c'));
    $pdo = cl_pdo();
    if ($pdo) {
        $stmt = $pdo->prepare(
            'INSERT INTO tenant_sync (user_id, payload, updated_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at)'
        );
        $stmt->execute(['org:' . $orgId, $json, $updatedAt]);
        return;
    }

    file_put_contents(
        cl_org_sync_file($orgId),
        json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
}

function cl_change_is_newer(array $incoming, ?array $existing): bool
{
    if (!$existing) {
        return true;
    }
    $inTs = (string) ($incoming['clientUpdatedAt'] ?? '');
    $exTs = (string) ($existing['clientUpdatedAt'] ?? '');
    return $inTs >= $exTs;
}

function cl_apply_change_to_snapshot(?array &$snapshot, array $change): void
{
    if (!is_array($snapshot)) {
        $snapshot = [
            'schemaVersion' => 3,
            'updatedAt' => date('c'),
            'data' => [],
        ];
    }
    if (!isset($snapshot['data']) || !is_array($snapshot['data'])) {
        $snapshot['data'] = [];
    }

    $data = &$snapshot['data'];
    $entityType = (string) ($change['entityType'] ?? '');
    $operation = (string) ($change['operation'] ?? 'update');
    $payload = is_array($change['payload'] ?? null) ? $change['payload'] : [];

    if ($entityType === 'customer') {
        $customers = is_array($data['customers'] ?? null) ? $data['customers'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');
        if ($operation === 'delete') {
            $data['customers'] = array_values(array_filter(
                $customers,
                static fn ($c) => is_array($c) && (string) ($c['globalId'] ?? '') !== $gid
            ));
            return;
        }
        $incoming = is_array($payload['customer'] ?? null) ? $payload['customer'] : null;
        if (!$incoming) {
            return;
        }
        $found = false;
        foreach ($customers as $i => $c) {
            if (!is_array($c)) {
                continue;
            }
            if ((string) ($c['globalId'] ?? '') === $gid) {
                $customers[$i] = array_merge($c, $incoming);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $customers[] = $incoming;
        }
        $data['customers'] = array_values($customers);
        return;
    }

    if ($entityType === 'order') {
        $orders = is_array($data['orders'] ?? null) ? $data['orders'] : [];
        $items = is_array($data['orderItems'] ?? null) ? $data['orderItems'] : [];
        $payments = is_array($data['orderPayments'] ?? null) ? $data['orderPayments'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');
        $incomingOrder = is_array($payload['order'] ?? null) ? $payload['order'] : null;
        $incomingItems = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        $incomingPayments = is_array($payload['payments'] ?? null) ? $payload['payments'] : [];

        if ($operation === 'delete') {
            $localId = null;
            foreach ($orders as $o) {
                if (is_array($o) && (string) ($o['globalId'] ?? '') === $gid) {
                    $localId = $o['id'] ?? null;
                    break;
                }
            }
            $data['orders'] = array_values(array_filter(
                $orders,
                static fn ($o) => is_array($o) && (string) ($o['globalId'] ?? '') !== $gid
            ));
            if ($localId !== null) {
                $data['orderItems'] = array_values(array_filter(
                    $items,
                    static fn ($it) => is_array($it) && ($it['orderId'] ?? null) != $localId
                ));
                $data['orderPayments'] = array_values(array_filter(
                    $payments,
                    static fn ($p) => is_array($p) && ($p['orderId'] ?? null) != $localId
                ));
            }
            return;
        }

        if (!$incomingOrder) {
            return;
        }

        $existingOrder = cl_find_order_in_snapshot($orders, $gid);
        $preferIncoming = !$existingOrder || cl_change_is_newer(
            $change,
            ['clientUpdatedAt' => (string) ($existingOrder['createdAt'] ?? '')]
        );
        $integrity = cl_apply_order_number_integrity($data, $incomingOrder, $preferIncoming);
        $data = $integrity['data'];
        $incomingOrder = $integrity['incomingOrder'];
        $orders = is_array($data['orders'] ?? null) ? $data['orders'] : [];
        $items = is_array($data['orderItems'] ?? null) ? $data['orderItems'] : [];

        $localOrderId = $incomingOrder['id'] ?? null;
        $found = false;
        foreach ($orders as $i => $o) {
            if (!is_array($o)) {
                continue;
            }
            if ((string) ($o['globalId'] ?? '') === $gid) {
                $localOrderId = $o['id'] ?? $localOrderId;
                $orders[$i] = array_merge($o, $incomingOrder);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $orders[] = $incomingOrder;
            $localOrderId = $incomingOrder['id'] ?? $localOrderId;
        }
        $data['orders'] = array_values($orders);

        if ($localOrderId !== null) {
            $items = array_values(array_filter(
                $items,
                static fn ($it) => is_array($it) && ($it['orderId'] ?? null) != $localOrderId
            ));
            $payments = array_values(array_filter(
                $payments,
                static fn ($p) => is_array($p) && ($p['orderId'] ?? null) != $localOrderId
            ));
            foreach ($incomingItems as $it) {
                if (is_array($it)) {
                    $it['orderId'] = $localOrderId;
                    $items[] = $it;
                }
            }
            $itemUpdates = cl_remap_item_numbers_for_order(
                (string) ($incomingOrder['orderNumber'] ?? ''),
                $items,
                (int) $localOrderId
            );
            foreach ($itemUpdates as $update) {
                foreach ($items as $j => $item) {
                    if (!is_array($item) || (int) ($item['id'] ?? 0) !== $update['id']) {
                        continue;
                    }
                    $items[$j]['itemNumber'] = $update['itemNumber'];
                }
            }
            foreach ($incomingPayments as $p) {
                if (is_array($p)) {
                    $p['orderId'] = $localOrderId;
                    $payments[] = $p;
                }
            }
            $data['orderItems'] = array_values($items);
            $data['orderPayments'] = array_values($payments);
        }
        return;
    }

    if ($entityType === 'product') {
        $products = is_array($data['products'] ?? null) ? $data['products'] : [];
        $servicePrices = is_array($data['servicePrices'] ?? null) ? $data['servicePrices'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');

        if ($operation === 'delete') {
            $localId = null;
            foreach ($products as $p) {
                if (is_array($p) && (string) ($p['globalId'] ?? '') === $gid) {
                    $localId = $p['id'] ?? null;
                    break;
                }
            }
            $data['products'] = array_values(array_filter(
                $products,
                static fn ($p) => is_array($p) && (string) ($p['globalId'] ?? '') !== $gid
            ));
            if ($localId !== null) {
                $data['servicePrices'] = array_values(array_filter(
                    $servicePrices,
                    static fn ($sp) => is_array($sp) && ($sp['productId'] ?? null) != $localId
                ));
            }
            return;
        }

        $incoming = is_array($payload['product'] ?? null) ? $payload['product'] : null;
        $incomingPrices = is_array($payload['servicePrices'] ?? null) ? $payload['servicePrices'] : [];
        if (!$incoming) {
            return;
        }

        $localProductId = $incoming['id'] ?? null;
        $found = false;
        foreach ($products as $i => $p) {
            if (!is_array($p)) {
                continue;
            }
            if ((string) ($p['globalId'] ?? '') === $gid) {
                $localProductId = $p['id'] ?? $localProductId;
                $products[$i] = array_merge($p, $incoming);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $products[] = $incoming;
            $localProductId = $incoming['id'] ?? $localProductId;
        }
        $data['products'] = array_values($products);

        if ($localProductId !== null) {
            foreach ($incomingPrices as $sp) {
                if (!is_array($sp)) {
                    continue;
                }
                $sp['productId'] = $localProductId;
                $spGid = (string) ($sp['globalId'] ?? '');
                $matched = false;
                foreach ($servicePrices as $j => $existing) {
                    if (!is_array($existing)) {
                        continue;
                    }
                    if (
                        ($spGid !== '' && (string) ($existing['globalId'] ?? '') === $spGid)
                        || (
                            ($existing['productId'] ?? null) == $localProductId
                            && ($existing['serviceType'] ?? '') === ($sp['serviceType'] ?? '')
                        )
                    ) {
                        $servicePrices[$j] = array_merge($existing, $sp);
                        $matched = true;
                        break;
                    }
                }
                if (!$matched) {
                    $servicePrices[] = $sp;
                }
            }
            $data['servicePrices'] = array_values($servicePrices);
        }
        return;
    }

    if ($entityType === 'coupon') {
        $coupons = is_array($data['coupons'] ?? null) ? $data['coupons'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');

        if ($operation === 'delete') {
            $data['coupons'] = array_values(array_filter(
                $coupons,
                static fn ($c) => is_array($c) && (string) ($c['globalId'] ?? '') !== $gid
            ));
            return;
        }

        $incoming = is_array($payload['coupon'] ?? null) ? $payload['coupon'] : null;
        if (!$incoming) {
            return;
        }

        $found = false;
        foreach ($coupons as $i => $c) {
            if (!is_array($c)) {
                continue;
            }
            if ((string) ($c['globalId'] ?? '') === $gid) {
                $coupons[$i] = array_merge($c, $incoming);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $coupons[] = $incoming;
        }
        $data['coupons'] = array_values($coupons);
        return;
    }

    if ($entityType === 'customer_tag') {
        $tags = is_array($data['customerTags'] ?? null) ? $data['customerTags'] : [];
        $customers = is_array($data['customers'] ?? null) ? $data['customers'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');

        if ($operation === 'delete') {
            $localId = null;
            foreach ($tags as $t) {
                if (is_array($t) && (string) ($t['globalId'] ?? '') === $gid) {
                    $localId = $t['id'] ?? null;
                    break;
                }
            }
            $data['customerTags'] = array_values(array_filter(
                $tags,
                static fn ($t) => is_array($t) && (string) ($t['globalId'] ?? '') !== $gid
            ));
            if ($localId !== null) {
                foreach ($customers as $i => $c) {
                    if (is_array($c) && ($c['tagId'] ?? null) == $localId) {
                        $customers[$i]['tagId'] = 1;
                    }
                }
                $data['customers'] = array_values($customers);
            }
            return;
        }

        $incoming = is_array($payload['customerTag'] ?? null) ? $payload['customerTag'] : null;
        if (!$incoming) {
            return;
        }

        $found = false;
        foreach ($tags as $i => $t) {
            if (!is_array($t)) {
                continue;
            }
            if ((string) ($t['globalId'] ?? '') === $gid) {
                $tags[$i] = array_merge($t, $incoming);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $tags[] = $incoming;
        }
        $data['customerTags'] = array_values($tags);
        return;
    }

    if ($entityType === 'service_price') {
        $servicePrices = is_array($data['servicePrices'] ?? null) ? $data['servicePrices'] : [];
        $products = is_array($data['products'] ?? null) ? $data['products'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');

        if ($operation === 'delete') {
            $data['servicePrices'] = array_values(array_filter(
                $servicePrices,
                static fn ($sp) => is_array($sp) && (string) ($sp['globalId'] ?? '') !== $gid
            ));
            return;
        }

        $incoming = is_array($payload['servicePrice'] ?? null) ? $payload['servicePrice'] : null;
        $productGlobalId = (string) ($payload['productGlobalId'] ?? '');
        if (!$incoming || $productGlobalId === '') {
            return;
        }

        $localProductId = null;
        foreach ($products as $p) {
            if (is_array($p) && (string) ($p['globalId'] ?? '') === $productGlobalId) {
                $localProductId = $p['id'] ?? null;
                break;
            }
        }
        if ($localProductId === null) {
            return;
        }

        $incoming['productId'] = $localProductId;
        $spGid = (string) ($incoming['globalId'] ?? '');
        $found = false;
        foreach ($servicePrices as $i => $sp) {
            if (!is_array($sp)) {
                continue;
            }
            if (
                ($spGid !== '' && (string) ($sp['globalId'] ?? '') === $spGid)
                || (
                    ($sp['productId'] ?? null) == $localProductId
                    && ($sp['serviceType'] ?? '') === ($incoming['serviceType'] ?? '')
                )
            ) {
                $servicePrices[$i] = array_merge($sp, $incoming);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $servicePrices[] = $incoming;
        }
        $data['servicePrices'] = array_values($servicePrices);
    }

    if ($entityType === 'organization_settings') {
        $profile = is_array($payload['profile'] ?? null) ? $payload['profile'] : null;
        if ($profile) {
            $logoAsset = is_array($payload['logoAsset'] ?? null) ? $payload['logoAsset'] : null;
            if ($logoAsset && !empty($logoAsset['logoDataUrl'])) {
                $profile['logoDataUrl'] = $logoAsset['logoDataUrl'];
                $profile['logoHash'] = $logoAsset['logoHash'] ?? ($profile['logoHash'] ?? null);
            }
            $data['organizationProfile'] = $profile;
        }
        return;
    }

    if ($entityType === 'whatsapp_template') {
        $templates = is_array($data['whatsappTemplates'] ?? null) ? $data['whatsappTemplates'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');
        $incoming = is_array($payload['whatsappTemplate'] ?? null) ? $payload['whatsappTemplate'] : null;
        if (!$incoming) {
            return;
        }
        $found = false;
        foreach ($templates as $i => $t) {
            if (!is_array($t)) {
                continue;
            }
            if ((string) ($t['globalId'] ?? '') === $gid) {
                $existingUpdated = (string) ($t['updatedAt'] ?? '');
                $incomingUpdated = (string) ($incoming['updatedAt'] ?? '');
                if ($incomingUpdated >= $existingUpdated) {
                    $templates[$i] = array_merge($t, $incoming);
                }
                $found = true;
                break;
            }
        }
        if (!$found) {
            $templates[] = $incoming;
        }
        $data['whatsappTemplates'] = array_values($templates);
        return;
    }

    if ($entityType === 'credit_ledger') {
        $ledger = is_array($data['creditLedger'] ?? null) ? $data['creditLedger'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');
        $incoming = is_array($payload['creditLedgerEntry'] ?? null) ? $payload['creditLedgerEntry'] : null;
        if (!$incoming || $gid === '') {
            return;
        }
        foreach ($ledger as $e) {
            if (is_array($e) && (string) ($e['globalId'] ?? '') === $gid) {
                return;
            }
        }
        $ledger[] = $incoming;
        $data['creditLedger'] = array_values($ledger);
        return;
    }

    if ($entityType === 'audit_log') {
        $logs = is_array($data['auditLog'] ?? null) ? $data['auditLog'] : [];
        $gid = (string) ($change['entityGlobalId'] ?? '');
        $incoming = is_array($payload['auditLogEntry'] ?? null) ? $payload['auditLogEntry'] : null;
        if (!$incoming || $gid === '') {
            return;
        }
        foreach ($logs as $e) {
            if (is_array($e) && (string) ($e['globalId'] ?? '') === $gid) {
                return;
            }
        }
        $logs[] = $incoming;
        $data['auditLog'] = array_values($logs);
        return;
    }
}

function cl_upsert_change_log(array $changes, array $incoming): array
{
    $key = (string) ($incoming['entityType'] ?? '') . ':' . (string) ($incoming['entityGlobalId'] ?? '');
    $map = [];
    foreach ($changes as $c) {
        if (!is_array($c)) {
            continue;
        }
        $k = (string) ($c['entityType'] ?? '') . ':' . (string) ($c['entityGlobalId'] ?? '');
        $map[$k] = $c;
    }
    $existing = $map[$key] ?? null;
    if (cl_change_is_newer($incoming, $existing)) {
        $map[$key] = $incoming;
    }
    $merged = array_values($map);
    usort($merged, static fn ($a, $b) => strcmp(
        (string) ($a['clientUpdatedAt'] ?? ''),
        (string) ($b['clientUpdatedAt'] ?? '')
    ));
    if (count($merged) > CL_SYNC_CHANGE_LOG_LIMIT) {
        $merged = array_slice($merged, -CL_SYNC_CHANGE_LOG_LIMIT);
    }
    return $merged;
}

function cl_changes_since(array $state, ?string $since): array
{
    $changes = is_array($state['changes'] ?? null) ? $state['changes'] : [];
    if ($since === null || $since === '') {
        return $changes;
    }
    return array_values(array_filter(
        $changes,
        static fn ($c) => is_array($c) && (string) ($c['clientUpdatedAt'] ?? '') > $since
    ));
}

function cl_entity_belongs_to_org(array $entity, string $orgId): bool
{
    $expected = cl_normalize_org_id($orgId);
    $incoming = cl_normalize_org_id((string) ($entity['organizationId'] ?? ''));
    if ($incoming === '') {
        return false;
    }
    return $incoming === $expected;
}

function cl_change_belongs_to_org(array $change, string $orgId): bool
{
    $expected = cl_normalize_org_id($orgId);
    $incoming = cl_normalize_org_id((string) ($change['organizationId'] ?? ''));
    if ($incoming === '') {
        return false;
    }
    return $incoming === $expected;
}

function cl_sanitize_snapshot_for_org(array $snapshotData, string $orgId): array
{
    $expected = cl_normalize_org_id($orgId);
    $lists = [
        'customers',
        'orders',
        'orderItems',
        'orderPayments',
        'products',
        'coupons',
        'customerTags',
        'servicePrices',
        'creditLedger',
        'creditResets',
        'auditLog',
        'whatsappTemplates',
    ];
    foreach ($lists as $key) {
        if (!is_array($snapshotData[$key] ?? null)) {
            continue;
        }
        $snapshotData[$key] = array_values(array_filter(
            $snapshotData[$key],
            static function ($row) use ($expected) {
                if (!is_array($row)) {
                    return false;
                }
                $incoming = cl_normalize_org_id((string) ($row['organizationId'] ?? ''));
                return $incoming !== '' && $incoming === $expected;
            }
        ));
    }
    if (is_array($snapshotData['organizationProfile'] ?? null)) {
        $profileOrg = cl_normalize_org_id(
            (string) ($snapshotData['organizationProfile']['organizationId']
                ?? $snapshotData['organizationProfile']['email']
                ?? '')
        );
        if ($profileOrg !== $expected) {
            $snapshotData['organizationProfile'] = null;
        }
    }
    return $snapshotData;
}

function cl_apply_org_push(string $orgId, array $body): array
{
    $state = cl_org_sync_read($orgId);
    $clientUpdatedAt = (string) ($body['updatedAt'] ?? date('c'));
    $incomingChanges = is_array($body['changes'] ?? null) ? $body['changes'] : [];
    $fullSnapshot = $body['fullSnapshot'] ?? null;

    if (is_array($fullSnapshot)) {
        $snapshotData = $fullSnapshot['data'] ?? null;
        if (!is_array($snapshotData) && isset($fullSnapshot['products'])) {
            $snapshotData = $fullSnapshot;
        }
        if (!is_array($snapshotData)) {
            return [
                'conflict' => false,
                'serverUpdatedAt' => (string) ($state['updatedAt'] ?? ''),
            ];
        }
        $snapshotData = cl_sanitize_snapshot_for_org($snapshotData, $orgId);
        $remoteUpdatedAt = (string) ($fullSnapshot['updatedAt'] ?? $clientUpdatedAt);
        if (($state['updatedAt'] ?? '') > $clientUpdatedAt && !empty($state['snapshot'])) {
            return [
                'conflict' => true,
                'serverUpdatedAt' => (string) $state['updatedAt'],
                'snapshot' => $state['snapshot'],
                'changes' => cl_changes_since($state, null),
            ];
        }
        $state['snapshot'] = [
            'schemaVersion' => 3,
            'updatedAt' => $remoteUpdatedAt,
            'data' => $snapshotData,
        ];
        $state['updatedAt'] = $remoteUpdatedAt;
        cl_org_sync_write($orgId, $state);
        return [
            'conflict' => false,
            'serverUpdatedAt' => $state['updatedAt'],
        ];
    }

    if ($incomingChanges === []) {
        return [
            'conflict' => false,
            'serverUpdatedAt' => (string) ($state['updatedAt'] ?? ''),
        ];
    }

    $snapshot = is_array($state['snapshot'] ?? null) ? $state['snapshot'] : null;
    foreach ($incomingChanges as $change) {
        if (!is_array($change)) {
            continue;
        }
        if (!cl_change_belongs_to_org($change, $orgId)) {
            continue;
        }
        cl_apply_change_to_snapshot($snapshot, $change);
        $state['changes'] = cl_upsert_change_log(
            is_array($state['changes'] ?? null) ? $state['changes'] : [],
            $change
        );
    }
    if (is_array($snapshot)) {
        $snapshot['updatedAt'] = $clientUpdatedAt;
        $state['snapshot'] = $snapshot;
    }
    $state['updatedAt'] = $clientUpdatedAt;
    cl_org_sync_write($orgId, $state);

    return [
        'conflict' => false,
        'serverUpdatedAt' => $state['updatedAt'],
    ];
}
