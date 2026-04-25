<?php
// backend/api/admin/users_toggle_status.php

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing user ID."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT is_active FROM users WHERE user_id = ?");
    $stmt->execute([$route_id]);
    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit;
    }

    $new_status = $targetUser['is_active'] ? 0 : 1;

    $updateStmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE user_id = ?");
    $updateStmt->execute([$new_status, $route_id]);

    // If re-enabling a terminated intern, restore their status to 'incomplete'
    if ($new_status === 1) {
        $pdo->prepare("
            UPDATE interns SET status = 'incomplete', end_date = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND status = 'terminated'
        ")->execute([$route_id]);

        // Notify the user that their account has been re-enabled
        $pdo->prepare("
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, 'Account Re-enabled', 'Your account has been re-enabled by an administrator. You can now log in again.', 'INFO')
        ")->execute([$route_id]);
    }

    // Audit Log
    $admin_id = $user['userId'] ?? null;
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $action_name = $new_status ? 'ENABLE_USER' : 'DISABLE_USER';
    $status_name = $new_status ? 'Active' : 'Inactive';
    $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute([$admin_id, $action_name, 'User Management', "Changed status of user ID: $route_id to $status_name", $ip, $ua]);

    echo json_encode([
        "status" => "success",
        "message" => "User status updated successfully.",
        "is_active" => (bool)$new_status
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
