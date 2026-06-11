<?php

const CL_ORDER_NUMBER_PREFIX = 'CL';

function cl_parse_order_number(string $value): ?array
{
    if (!preg_match('/^CL-(\d{4})-(\d+)$/', trim($value), $m)) {
        return null;
    }
    return [
        'prefix' => CL_ORDER_NUMBER_PREFIX,
        'year' => (int) $m[1],
        'sequence' => (int) $m[2],
    ];
}

function cl_format_order_number(int $year, int $sequence): string
{
    return sprintf('%s-%d-%06d', CL_ORDER_NUMBER_PREFIX, $year, $sequence);
}

function cl_format_item_number(string $orderNumber, int $itemIndex): string
{
    return sprintf('%s-%02d', $orderNumber, $itemIndex);
}

/**
 * @param array<int, array<string, mixed>> $orders
 * @return array<int, int> year => max sequence
 */
function cl_build_max_sequence_by_year(array $orders): array
{
    $map = [];
    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        $parsed = cl_parse_order_number((string) ($order['orderNumber'] ?? ''));
        if (!$parsed) {
            continue;
        }
        $year = $parsed['year'];
        $map[$year] = max($map[$year] ?? 0, $parsed['sequence']);
    }
    return $map;
}

/**
 * @param array<int, array<string, mixed>> $orders
 * @param array<string, bool> $excludeNumbers
 */
function cl_allocate_order_number(array $orders, int $year, array $excludeNumbers = []): string
{
    $map = cl_build_max_sequence_by_year($orders);
    $seq = ($map[$year] ?? 0) + 1;
    $used = [];
    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        $num = (string) ($order['orderNumber'] ?? '');
        if ($num !== '') {
            $used[$num] = true;
        }
    }
    foreach ($excludeNumbers as $num => $_) {
        $used[$num] = true;
    }
    $candidate = cl_format_order_number($year, $seq);
    while (isset($used[$candidate])) {
        $seq++;
        $candidate = cl_format_order_number($year, $seq);
    }
    return $candidate;
}

/**
 * @param array<int, array<string, mixed>> $orders
 * @return array{orderNumber: string, reassignments: array<int, array{globalId: string, orderNumber: string}>}
 */
function cl_resolve_order_number_conflict(
    array $orders,
    array $incoming,
    bool $preferIncoming = true
): array {
    $incomingGid = (string) ($incoming['globalId'] ?? '');
    $incomingNumber = (string) ($incoming['orderNumber'] ?? '');
    $conflict = null;
    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        if ((string) ($order['globalId'] ?? '') === $incomingGid) {
            continue;
        }
        if ((string) ($order['orderNumber'] ?? '') === $incomingNumber) {
            $conflict = $order;
            break;
        }
    }
    if (!$conflict) {
        return ['orderNumber' => $incomingNumber, 'reassignments' => []];
    }

    $parsed = cl_parse_order_number($incomingNumber)
        ?: cl_parse_order_number((string) ($conflict['orderNumber'] ?? ''));
    $year = $parsed['year'] ?? (int) date('Y');
    $reassignments = [];

    if ($preferIncoming) {
        $newNumber = cl_allocate_order_number($orders, $year, [$incomingNumber => true]);
        $reassignments[] = [
            'globalId' => (string) ($conflict['globalId'] ?? ''),
            'orderNumber' => $newNumber,
        ];
        return ['orderNumber' => $incomingNumber, 'reassignments' => $reassignments];
    }

    $newIncoming = cl_allocate_order_number($orders, $year);
    return ['orderNumber' => $newIncoming, 'reassignments' => []];
}

/**
 * @param array<int, array<string, mixed>> $items
 * @return array<int, array{id: int, itemNumber: string}>
 */
function cl_remap_item_numbers_for_order(
    string $orderNumber,
    array $items,
    int $orderId
): array {
    $orderItems = [];
    foreach ($items as $item) {
        if (!is_array($item) || (int) ($item['orderId'] ?? 0) !== $orderId) {
            continue;
        }
        $orderItems[] = $item;
    }
    usort($orderItems, static fn ($a, $b) => ((int) ($a['id'] ?? 0)) <=> ((int) ($b['id'] ?? 0)));
    $mapped = [];
    foreach ($orderItems as $index => $item) {
        $mapped[] = [
            'id' => (int) ($item['id'] ?? 0),
            'itemNumber' => cl_format_item_number($orderNumber, $index + 1),
        ];
    }
    return $mapped;
}

/**
 * Snapshot içinde sipariş numarası çakışmalarını çözer; kalem numaralarını günceller.
 *
 * @param array<string, mixed> $data
 * @return array{data: array<string, mixed>, incomingOrder: array<string, mixed>}
 */
function cl_apply_order_number_integrity(
    array $data,
    array $incomingOrder,
    bool $preferIncoming = true
): array {
    $orders = is_array($data['orders'] ?? null) ? $data['orders'] : [];
    $items = is_array($data['orderItems'] ?? null) ? $data['orderItems'] : [];
    $resolution = cl_resolve_order_number_conflict($orders, $incomingOrder, $preferIncoming);
    $normalizedNumber = $resolution['orderNumber'];
    $incomingGid = (string) ($incomingOrder['globalId'] ?? '');

    foreach ($resolution['reassignments'] as $reassignment) {
        $gid = (string) ($reassignment['globalId'] ?? '');
        $newNumber = (string) ($reassignment['orderNumber'] ?? '');
        $localOrderId = null;
        foreach ($orders as $i => $order) {
            if (!is_array($order) || (string) ($order['globalId'] ?? '') !== $gid) {
                continue;
            }
            $localOrderId = (int) ($order['id'] ?? 0);
            $orders[$i]['orderNumber'] = $newNumber;
            break;
        }
        if ($localOrderId !== null && $localOrderId > 0) {
            $updates = cl_remap_item_numbers_for_order($newNumber, $items, $localOrderId);
            foreach ($updates as $update) {
                foreach ($items as $j => $item) {
                    if (!is_array($item) || (int) ($item['id'] ?? 0) !== $update['id']) {
                        continue;
                    }
                    $items[$j]['itemNumber'] = $update['itemNumber'];
                }
            }
        }
    }

    $incomingOrder['orderNumber'] = $normalizedNumber;
    $localIncomingId = null;
    foreach ($orders as $order) {
        if (is_array($order) && (string) ($order['globalId'] ?? '') === $incomingGid) {
            $localIncomingId = (int) ($order['id'] ?? 0);
            break;
        }
    }
    if ($localIncomingId !== null && $localIncomingId > 0) {
        $updates = cl_remap_item_numbers_for_order($normalizedNumber, $items, $localIncomingId);
        foreach ($updates as $update) {
            foreach ($items as $j => $item) {
                if (!is_array($item) || (int) ($item['id'] ?? 0) !== $update['id']) {
                    continue;
                }
                $items[$j]['itemNumber'] = $update['itemNumber'];
            }
        }
    }

    $data['orders'] = array_values($orders);
    $data['orderItems'] = array_values($items);
    return ['data' => $data, 'incomingOrder' => $incomingOrder];
}

function cl_find_order_in_snapshot(array $orders, string $globalId): ?array
{
    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        if ((string) ($order['globalId'] ?? '') === $globalId) {
            return $order;
        }
    }
    return null;
}
