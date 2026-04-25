<?php
// backend/api/shared/intern_terminate.php
// PATCH /api/interns/{id}/terminate

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

    // 2. Authorization Check (Supervisor or Admin)
    if ($user['userType'] === 'supervisor') {
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
        echo json_encode(["status" => "error", "message" => "Access denied: Only supervisors or admins can terminate interns."]);
        exit;
    }

    $pdo->beginTransaction();

    // 3. Update Intern Status and End Date
    $updateIntern = $pdo->prepare("UPDATE interns SET status = 'terminated', end_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE intern_id = ?");
    $updateIntern->execute([$route_id]);

    // 4. Set User to Inactive
    $updateUser = $pdo->prepare("UPDATE users SET is_active = 0 WHERE user_id = ?");
    $updateUser->execute([$intern['user_id']]);

    // 5. Audit Log
    $log_stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)");
    $details = "Intern {$intern['first_name']} {$intern['last_name']} (ID: {$route_id}) has been terminated and deactivated.";
    $log_stmt->execute([$user['userId'], 'TERMINATE_INTERN', 'INTERNS', $details]);

    // 6. Notification for Intern
    $notif_stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ERROR')");
    $notif_stmt->execute([
        $intern['user_id'],
        "Internship Terminated",
        "Your internship has been terminated. Your account is now inactive."
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Intern terminated and deactivated successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
