<?php
// backend/api/shared/timelog_detail.php

try {
    $current_user_id = $user['userId'];
    $user_role = $user['userType'];

    // Build query based on role
    if ($user_role === 'intern') {
        $query = "
            SELECT t.*,
                   CONCAT(i.first_name, ' ', i.middle_name, ' ', i.last_name) AS intern_name,
                   d.department_name
            FROM timelogs t
            LEFT JOIN interns i ON t.user_id = i.user_id
            LEFT JOIN departments d ON i.department_id = d.department_id
            WHERE t.timelog_id = ? AND t.user_id = ?
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$route_id, $current_user_id]);
    } else {
        $query = "
            SELECT t.*,
                   CONCAT(i.first_name, ' ', i.middle_name, ' ', i.last_name) AS intern_name,
                   d.department_name
            FROM timelogs t
            LEFT JOIN interns i ON t.user_id = i.user_id
            LEFT JOIN departments d ON i.department_id = d.department_id
            WHERE t.timelog_id = ?
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$route_id]);
    }

    $timelog = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$timelog) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Timelog not found"]);
        exit;
    }

    echo json_encode([
        "status" => "success",
        "timelog" => $timelog
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
