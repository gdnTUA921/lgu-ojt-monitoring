<?php
// backend/api/shared/intern_complete.php
// PATCH /api/interns/{id}/complete

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing intern ID."]);
    exit;
}

try {
    // 1. Fetch Intern
    $stmt = $pdo->prepare("SELECT * FROM interns WHERE intern_id = ?");
    $stmt->execute([$route_id]);
    $intern = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intern) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Intern not found."]);
        exit;
    }

    // 2. Authorization Check
    if ($user['userType'] === 'supervisor') {
        // Find supervisor_id for this user
        $sup_stmt = $pdo->prepare("SELECT supervisor_id FROM supervisors WHERE user_id = ?");
        $sup_stmt->execute([$user['userId']]);
        $sup = $sup_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sup || $intern['supervisor_id'] != $sup['supervisor_id']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Access denied: You are not this intern's supervisor."]);
            exit;
        }
    } elseif ($user['userType'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Access denied: Only supervisors or admins can mark interns as complete."]);
        exit;
    }

    // 3. Eligibility checks
    $missing = [];

    $hours_stmt = $pdo->prepare("SELECT COALESCE(SUM(total_hours), 0) FROM timelogs WHERE user_id = ? AND is_disputed = 0");
    $hours_stmt->execute([$intern['user_id']]);
    $rendered = (float) $hours_stmt->fetchColumn();
    $required = (float) $intern['required_hours'];
    if ($rendered < $required) {
        $missing['hours'] = [
            'rendered' => $rendered,
            'required' => $required,
            'short'    => round($required - $rendered, 2),
        ];
    }

    $docs_stmt = $pdo->prepare("
        SELECT dt.name
        FROM document_types dt
        LEFT JOIN documents d
            ON dt.document_type_id = d.document_type_id AND d.intern_id = ?
        WHERE dt.is_required = 1
          AND dt.is_active = 1
          AND (d.status IS NULL OR d.status != 'approved')
    ");
    $docs_stmt->execute([$route_id]);
    $missing_docs = $docs_stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($missing_docs)) {
        $missing['documents'] = $missing_docs;
    }

    if (!empty($missing)) {
        http_response_code(422);
        echo json_encode([
            "status"  => "error",
            "message" => "Cannot mark intern as complete. Some requirements are not yet met.",
            "missing" => $missing,
        ]);
        exit;
    }

    // 4. Check if already complete
    if ($intern['status'] === 'complete') {
        echo json_encode([
            "status" => "success",
            "message" => "Intern is already marked as complete."
        ]);
        exit;
    }

    // 4. Update Status and End Date
    $update = $pdo->prepare("UPDATE interns SET status = 'complete', end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE intern_id = ?");
    $update->execute([$route_id]);

    // 5. Audit Log
    $log_stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)");
    $details = "Intern {$intern['first_name']} {$intern['last_name']} (ID: {$route_id}) marked as complete.";
    $log_stmt->execute([$user['userId'], 'MARK_COMPLETE', 'INTERNS', $details]);

    // 6. Notification for Intern
    $notif_stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'SUCCESS')");
    $notif_stmt->execute([
        $intern['user_id'],
        "Internship Completed",
        "Congratulations! Your supervisor has marked your internship as complete."
    ]);

    echo json_encode([
        "status" => "success",
        "message" => "Intern marked as complete successfully."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
