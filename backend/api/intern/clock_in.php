<?php
// backend/api/intern/clock_in.php

try {
    $current_user_id = $user['userId'];
    $today = date('Y-m-d');
    $now = date('H:i:s');

    // Extract geolocation from request body
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;

    // Check if already clocked in today
    $check_query = "
        SELECT timelog_id FROM timelogs
        WHERE user_id = ? AND date = ?
    ";
    $check_stmt = $pdo->prepare($check_query);
    $check_stmt->execute([$current_user_id, $today]);
    $existing = $check_stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "You have already clocked in today. Please clock out first."
        ]);
        exit;
    }

    // Create new timelog entry
    $insert_query = "
        INSERT INTO timelogs (user_id, date, time_in, time_in_latitude, time_in_longitude)
        VALUES (?, ?, ?, ?, ?)
    ";
    $insert_stmt = $pdo->prepare($insert_query);
    $insert_stmt->execute([$current_user_id, $today, $now, $latitude, $longitude]);

    $timelog_id = $pdo->lastInsertId();

    // Write audit log
    $audit_query = "
        INSERT INTO audit_logs (user_id, action, module, details, ip_address)
        VALUES (?, 'CLOCK_IN', 'TIMELOGS', ?, ?)
    ";
    $audit_stmt = $pdo->prepare($audit_query);
    $audit_details = json_encode(['timelog_id' => $timelog_id, 'date' => $today, 'time_in' => $now]);
    $audit_stmt->execute([$current_user_id, $audit_details, $_SERVER['REMOTE_ADDR'] ?? null]);

    // Fetch the created log
    $fetch_query = "
        SELECT * FROM timelogs WHERE timelog_id = ?
    ";
    $fetch_stmt = $pdo->prepare($fetch_query);
    $fetch_stmt->execute([$timelog_id]);
    $new_log = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "message" => "Clocked in successfully",
        "timelog" => $new_log
    ]);

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "A timelog for today already exists."
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
}
