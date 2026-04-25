<?php
// backend/api/intern/dashboard_stats.php

try {
    $current_user_id = $user['userId'];

    // 1. Fetch intern profile with department and supervisor info
    $query = "
        SELECT
            i.intern_id,
            i.first_name,
            i.middle_name,
            i.last_name,
            i.contact_num,
            i.school,
            i.required_hours,
            i.status,
            i.start_date,
            i.end_date,
            i.pfpic,
            d.department_name,
            CONCAT(s.first_name, ' ', s.last_name) AS supervisor_name
        FROM interns i
        LEFT JOIN departments d ON i.department_id = d.department_id
        LEFT JOIN supervisors s ON i.supervisor_id = s.supervisor_id
        WHERE i.user_id = ?
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$current_user_id]);
    $intern = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intern) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Intern profile not found"]);
        exit;
    }

    // 2. Calculate completed hours from timelogs
    $query_hours = "
        SELECT COALESCE(SUM(total_hours), 0) AS completed_hours
        FROM timelogs
        WHERE user_id = ? AND is_disputed = 0
    ";
    $stmt_hours = $pdo->prepare($query_hours);
    $stmt_hours->execute([$current_user_id]);
    $hours_result = $stmt_hours->fetch(PDO::FETCH_ASSOC);
    $intern['completed_hours'] = (float) $hours_result['completed_hours'];

    // 3. Requirements submitted (documents vs active document_types)
    $query_total_requirements = "
        SELECT COUNT(*) AS total
        FROM document_types
        WHERE is_active = 1
    ";
    $stmt_total_req = $pdo->prepare($query_total_requirements);
    $stmt_total_req->execute();
    $total_requirements = (int) $stmt_total_req->fetch(PDO::FETCH_ASSOC)['total'];

    $query_submitted_requirements = "
        SELECT COUNT(*) AS submitted
        FROM documents
        WHERE intern_id = ?
    ";
    $stmt_submitted_req = $pdo->prepare($query_submitted_requirements);
    $stmt_submitted_req->execute([$intern['intern_id']]);
    $submitted_requirements = (int) $stmt_submitted_req->fetch(PDO::FETCH_ASSOC)['submitted'];

    // 4. Reports / Activities submitted count
    $query_combined = "
        SELECT (
            (SELECT COUNT(*) FROM reports WHERE intern_id = ?) +
            (SELECT COUNT(*) FROM activity_submissions WHERE intern_id = ?)
        ) AS total_count
    ";
    $stmt_combined = $pdo->prepare($query_combined);
    $stmt_combined->execute([$intern['intern_id'], $intern['intern_id']]);
    $reports_count = (int) $stmt_combined->fetch(PDO::FETCH_ASSOC)['total_count'];

    // 5. Recent timelogs (latest 5, DESC order)
    $query_recent_timelogs = "
        SELECT timelog_id, date, time_in, time_out, total_hours, overtime_hours,
               time_in_latitude, time_in_longitude, time_out_latitude, time_out_longitude
        FROM timelogs
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 5
    ";
    $stmt_recent_timelogs = $pdo->prepare($query_recent_timelogs);
    $stmt_recent_timelogs->execute([$current_user_id]);
    $recent_timelogs = $stmt_recent_timelogs->fetchAll(PDO::FETCH_ASSOC);

    // Build response
    echo json_encode([
        "status" => "success",
        "intern" => $intern,
        "requirements_submitted" => [
            "submitted" => $submitted_requirements,
            "total" => $total_requirements
        ],
        "reports_submitted" => $reports_count,
        "recent_timelogs" => $recent_timelogs
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
