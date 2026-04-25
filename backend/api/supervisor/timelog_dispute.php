<?php
// backend/api/supervisor/timelog_dispute.php
// PATCH /api/supervisor/timelogs/{id}/dispute
// Supervisor disputes or un-disputes a timelog entry.
// Disputed logs are excluded from rendered hours calculations.

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing timelog ID."]);
    exit;
}

$is_disputed   = isset($input['is_disputed']) ? (bool) $input['is_disputed'] : true;
$dispute_reason = trim($input['dispute_reason'] ?? '');

if ($is_disputed && $dispute_reason === '') {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "A reason is required when disputing a time log."]);
    exit;
}

try {
    // 1. Fetch the timelog and the intern it belongs to
    $stmt = $pdo->prepare("
        SELECT t.*, i.intern_id, i.user_id AS intern_user_id,
               i.first_name, i.last_name, i.supervisor_id
        FROM timelogs t
        JOIN interns i ON t.user_id = i.user_id
        WHERE t.timelog_id = ?
    ");
    $stmt->execute([$route_id]);
    $log = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$log) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Time log not found."]);
        exit;
    }

    // 2. Verify this supervisor owns the intern
    $sup_stmt = $pdo->prepare("SELECT supervisor_id FROM supervisors WHERE user_id = ?");
    $sup_stmt->execute([$user['userId']]);
    $sup = $sup_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sup || $log['supervisor_id'] != $sup['supervisor_id']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Access denied: this intern is not assigned to you."]);
        exit;
    }

    // 3. Apply dispute / un-dispute
    if ($is_disputed) {
        $pdo->prepare("
            UPDATE timelogs
            SET is_disputed = 1, disputed_by = ?, disputed_at = NOW(), dispute_reason = ?
            WHERE timelog_id = ?
        ")->execute([$user['userId'], $dispute_reason, $route_id]);
    } else {
        $pdo->prepare("
            UPDATE timelogs
            SET is_disputed = 0, disputed_by = NULL, disputed_at = NULL, dispute_reason = NULL
            WHERE timelog_id = ?
        ")->execute([$route_id]);
    }

    // 4. Notify the intern
    $action_label = $is_disputed ? 'disputed' : 'restored';
    $notif_title  = $is_disputed ? 'Time Log Disputed' : 'Time Log Restored';
    $notif_msg    = $is_disputed
        ? "Your time log for {$log['date']} has been disputed by your supervisor. Reason: {$dispute_reason}"
        : "Your time log for {$log['date']} has been restored and will count toward your rendered hours.";

    $pdo->prepare("
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
    ")->execute([
        $log['intern_user_id'],
        $notif_title,
        $notif_msg,
        $is_disputed ? 'WARNING' : 'INFO',
    ]);

    // 5. Audit log
    $audit_details = $is_disputed
        ? "Supervisor disputed timelog ID {$route_id} (date: {$log['date']}) for intern {$log['first_name']} {$log['last_name']}. Reason: {$dispute_reason}"
        : "Supervisor restored timelog ID {$route_id} (date: {$log['date']}) for intern {$log['first_name']} {$log['last_name']}.";

    $pdo->prepare("
        INSERT INTO audit_logs (user_id, action, module, details, ip_address)
        VALUES (?, ?, 'TIMELOGS', ?, ?)
    ")->execute([
        $user['userId'],
        $is_disputed ? 'TIMELOG_DISPUTE' : 'TIMELOG_RESTORE',
        $audit_details,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    echo json_encode([
        "status"  => "success",
        "message" => $is_disputed
            ? "Time log disputed. It will no longer count toward rendered hours."
            : "Time log restored. It will now count toward rendered hours.",
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
