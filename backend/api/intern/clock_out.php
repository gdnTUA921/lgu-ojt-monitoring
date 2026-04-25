<?php
// backend/api/intern/clock_out.php

try {
    $current_user_id = $user['userId'];
    $today = date('Y-m-d');
    $now = date('H:i:s');

    // Extract geolocation from request body
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;

    // Find today's open timelog
    $check_query = "
        SELECT timelog_id, time_in FROM timelogs
        WHERE user_id = ? AND date = ? AND time_out IS NULL
    ";
    $check_stmt = $pdo->prepare($check_query);
    $check_stmt->execute([$current_user_id, $today]);
    $open_log = $check_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$open_log) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "No active clock-in found for today. Please clock in first."
        ]);
        exit;
    }

    // Calculate total hours
    $time_in = new DateTime($open_log['time_in']);
    $time_out = new DateTime($now);
    $diff = $time_in->diff($time_out);
    $total_hours = $diff->h + ($diff->i / 60);
    $overtime_hours = max(0, $total_hours - 8);

    // Update timelog with clock-out data
    $update_query = "
        UPDATE timelogs
        SET time_out = ?,
            time_out_latitude = ?,
            time_out_longitude = ?,
            total_hours = ?,
            overtime_hours = ?
        WHERE timelog_id = ?
    ";
    $update_stmt = $pdo->prepare($update_query);
    $update_stmt->execute([$now, $latitude, $longitude, $total_hours, $overtime_hours, $open_log['timelog_id']]);

    // Write audit log
    $audit_query = "
        INSERT INTO audit_logs (user_id, action, module, details, ip_address)
        VALUES (?, 'CLOCK_OUT', 'TIMELOGS', ?, ?)
    ";
    $audit_stmt = $pdo->prepare($audit_query);
    $audit_details = json_encode([
        'timelog_id' => $open_log['timelog_id'],
        'date' => $today,
        'time_in' => $open_log['time_in'],
        'time_out' => $now,
        'total_hours' => $total_hours
    ]);
    $audit_stmt->execute([$current_user_id, $audit_details, $_SERVER['REMOTE_ADDR'] ?? null]);

    // Fetch the updated log
    $fetch_query = "
        SELECT * FROM timelogs WHERE timelog_id = ?
    ";
    $fetch_stmt = $pdo->prepare($fetch_query);
    $fetch_stmt->execute([$open_log['timelog_id']]);
    $updated_log = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "message" => "Clocked out successfully",
        "timelog" => $updated_log
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
