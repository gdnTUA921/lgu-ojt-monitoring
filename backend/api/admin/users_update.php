<?php
// backend/api/admin/users_update.php

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing user ID."]);
    exit;
}

try {
    // Validation: Intern's supervisor must belong to the selected department and map the correct foreign key
    if (($input['user_type'] ?? '') === 'intern' && !empty($input['supervisor_id'])) {
        $supStmt = $pdo->prepare("SELECT supervisor_id, department_id FROM supervisors WHERE user_id = ?");
        $supStmt->execute([$input['supervisor_id']]);
        $supData = $supStmt->fetch(PDO::FETCH_ASSOC);

        if (!$supData) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid supervisor selected."]);
            exit;
        }

        if (!empty($input['department_id']) && $supData['department_id'] != $input['department_id']) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid assignment: The selected supervisor does not belong to the specified department."]);
            exit;
        }

        // Extremely important: Map the payload user_id into the physical table supervisor_id
        $input['supervisor_id'] = $supData['supervisor_id'];
    }

    $pdo->beginTransaction();

    // 1. Update users table (email only; password updates are forbidden here)
    $stmt = $pdo->prepare("UPDATE users SET email = ? WHERE user_id = ?");
    $stmt->execute([$input['email'], $route_id]);

    // Determine current role from DB, or trust the frontend input user_type if role changing is not supported
    // The frontend sends user_type, we can use it.
    $role = $input['user_type'];

    if ($role === 'intern') {
        $stmt = $pdo->prepare("UPDATE interns SET first_name = ?, middle_name = ?, last_name = ?, contact_num = ?, department_id = ?, supervisor_id = ?, school = ?, required_hours = ?, start_date = ? WHERE user_id = ?");
        $stmt->execute([
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null,
            empty($input['department_id']) ? null : $input['department_id'],
            empty($input['supervisor_id']) ? null : $input['supervisor_id'],
            $input['school'] ?? null,
            empty($input['required_hours']) ? null : $input['required_hours'],
            empty($input['start_date']) ? null : $input['start_date'],
            $route_id
        ]);
    } else if ($role === 'supervisor') {
        $stmt = $pdo->prepare("UPDATE supervisors SET first_name = ?, middle_name = ?, last_name = ?, contact_num = ?, department_id = ? WHERE user_id = ?");
        $stmt->execute([
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null,
            empty($input['department_id']) ? null : $input['department_id'],
            $route_id
        ]);
    } else if ($role === 'admin') {
        $stmt = $pdo->prepare("UPDATE admins SET first_name = ?, middle_name = ?, last_name = ?, contact_num = ? WHERE user_id = ?");
        $stmt->execute([
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null,
            $route_id
        ]);
    }

    $pdo->commit();

    // Audit Log
    $admin_id = $user['userId'] ?? null;
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute([$admin_id, 'UPDATE_USER', 'User Management', 'Updated details for user: ' . $input['email'], $ip, $ua]);

    echo json_encode([
        "status" => "success",
        "message" => "User updated successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
