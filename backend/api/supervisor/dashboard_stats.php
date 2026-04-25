<?php
// backend/api/supervisor/dashboard_stats.php

try {
    // Resolve supervisor_id from the authenticated user_id
    $sup_stmt = $pdo->prepare("SELECT supervisor_id FROM supervisors WHERE user_id = ?");
    $sup_stmt->execute([$user['userId']]);
    $supervisor_id = $sup_stmt->fetchColumn();

    if (!$supervisor_id) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Supervisor profile not found."]);
        exit;
    }

    // 1. All interns ever assigned to this supervisor
    $s1 = $pdo->prepare("SELECT COUNT(*) FROM interns WHERE supervisor_id = ?");
    $s1->execute([$supervisor_id]);
    $assigned_interns = (int)$s1->fetchColumn();

    // 2. Active interns (incomplete OJT + account active)
    $s2 = $pdo->prepare("
        SELECT COUNT(*) FROM interns i
        JOIN users u ON i.user_id = u.user_id
        WHERE i.supervisor_id = ? AND i.status = 'incomplete' AND u.is_active = 1
    ");
    $s2->execute([$supervisor_id]);
    $active_interns = (int)$s2->fetchColumn();

    // 3. Pending submissions (submitted, not yet graded) from active interns
    $s3 = $pdo->prepare("
        SELECT COUNT(*) FROM activity_submissions s
        JOIN activities a ON s.activity_id = a.activity_id
        JOIN interns i ON s.intern_id = i.intern_id
        JOIN users u ON i.user_id = u.user_id
        WHERE a.supervisor_id = ? AND s.status = 'submitted'
          AND i.status = 'incomplete' AND u.is_active = 1
    ");
    $s3->execute([$supervisor_id]);
    $pending_submissions = (int)$s3->fetchColumn();

    // 4. Graded submissions from active interns
    $s4 = $pdo->prepare("
        SELECT COUNT(*) FROM activity_submissions s
        JOIN activities a ON s.activity_id = a.activity_id
        JOIN interns i ON s.intern_id = i.intern_id
        JOIN users u ON i.user_id = u.user_id
        WHERE a.supervisor_id = ? AND s.status = 'graded'
          AND i.status = 'incomplete' AND u.is_active = 1
    ");
    $s4->execute([$supervisor_id]);
    $graded_submissions = (int)$s4->fetchColumn();

    // 5. Recent activity: clock-ins + activity submissions from this supervisor's interns
    $s5 = $pdo->prepare("
        (SELECT
            CONCAT(i.first_name, ' ', i.last_name) AS intern_name,
            'Clocked In' AS action,
            tl.created_at AS event_time,
            'clock_in' AS type
         FROM timelogs tl
         JOIN interns i ON tl.user_id = i.user_id
         WHERE i.supervisor_id = ? AND tl.time_in IS NOT NULL)
        UNION ALL
        (SELECT
            CONCAT(i.first_name, ' ', i.last_name) AS intern_name,
            CONCAT('Submitted: ', a.title) AS action,
            s.submitted_at AS event_time,
            'submission' AS type
         FROM activity_submissions s
         JOIN interns i ON s.intern_id = i.intern_id
         JOIN activities a ON s.activity_id = a.activity_id
         WHERE i.supervisor_id = ?)
        ORDER BY event_time DESC
        LIMIT 6
    ");
    $s5->execute([$supervisor_id, $supervisor_id]);
    $recent_activity = $s5->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status"              => "success",
        "assigned_interns"    => $assigned_interns,
        "active_interns"      => $active_interns,
        "pending_submissions" => $pending_submissions,
        "graded_submissions"  => $graded_submissions,
        "recent_activity"     => $recent_activity,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
