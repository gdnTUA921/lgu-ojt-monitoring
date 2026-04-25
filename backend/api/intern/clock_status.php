<?php
// backend/api/intern/clock_status.php

try {
    $current_user_id = $user['userId'];
    $today = date('Y-m-d');

    // Check if intern has an open timelog for today
    $query = "
        SELECT timelog_id, date, time_in, time_out, total_hours, overtime_hours,
               time_in_latitude, time_in_longitude, time_out_latitude, time_out_longitude
        FROM timelogs
        WHERE user_id = ? AND date = ? AND time_out IS NULL
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$current_user_id, $today]);
    $open_log = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($open_log) {
        echo json_encode([
            "status" => "success",
            "clocked_in" => true,
            "current_log" => $open_log
        ]);
    } else {
        echo json_encode([
            "status" => "success",
            "clocked_in" => false,
            "current_log" => null
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
