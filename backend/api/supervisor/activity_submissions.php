<?php
// backend/api/supervisor/activity_submissions.php
// GET   /api/supervisor/activities/{id}/submissions — roster of all targeted interns
// PATCH /api/supervisor/submissions/{id}            — grade/feedback a submission.

$user_id = $user['userId'] ?? null;
$ip      = $_SERVER['REMOTE_ADDR'] ?? null;
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? null;

try {
    $sup_stmt = $pdo->prepare("SELECT supervisor_id FROM supervisors WHERE user_id = ?");
    $sup_stmt->execute([$user_id]);
    $sup = $sup_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sup) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Supervisor profile not found."]);
        exit;
    }
    $supervisor_id = $sup['supervisor_id'];

    // ── PATCH: grade a submission ──────────────────
    if ($method === 'PATCH' && $route_id) {
        $own_stmt = $pdo->prepare("
            SELECT s.submission_id, s.activity_id, a.is_graded, a.title
            FROM activity_submissions s
            JOIN activities a ON s.activity_id = a.activity_id
            WHERE s.submission_id = ? AND a.supervisor_id = ?
        ");
        $own_stmt->execute([$route_id, $supervisor_id]);
        $sub = $own_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sub) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Submission not found."]);
            exit;
        }

        if (!$sub['is_graded']) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "This activity is not graded."]);
            exit;
        }

        $grade    = isset($input['grade']) ? trim($input['grade']) : null;
        $feedback = isset($input['feedback']) ? trim($input['feedback']) : null;

        $pdo->prepare("
            UPDATE activity_submissions
            SET grade = ?, feedback = ?, status = 'graded', graded_at = NOW()
            WHERE submission_id = ?
        ")->execute([$grade ?: null, $feedback ?: null, $route_id]);

        // Notify the intern
        $intern_uid_stmt = $pdo->prepare("
            SELECT i.user_id FROM activity_submissions s
            JOIN interns i ON s.intern_id = i.intern_id
            WHERE s.submission_id = ?
        ");
        $intern_uid_stmt->execute([$route_id]);
        $intern_user_id = $intern_uid_stmt->fetchColumn();

        if ($intern_user_id) {
            $notif_msg = $grade
                ? "Your submission for \"{$sub['title']}\" has been graded: $grade."
                : "Your submission for \"{$sub['title']}\" has been reviewed by your supervisor.";
            $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ACTIVITY')")
                ->execute([$intern_user_id, "Activity Graded: {$sub['title']}", $notif_msg]);
        }

        $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$user_id, 'GRADE_SUBMISSION', 'Activities',
                "Graded submission ID: $route_id for activity \"{$sub['title']}\".", $ip, $ua]);

        echo json_encode(["status" => "success"]);
        exit;
    }

    // ── GET: roster with per-intern submission ─────
    if ($method === 'GET' && $route_id) {
        $own = $pdo->prepare("SELECT activity_id, title, is_graded, due_date, target_type FROM activities WHERE activity_id = ? AND supervisor_id = ?");
        $own->execute([$route_id, $supervisor_id]);
        $activity = $own->fetch(PDO::FETCH_ASSOC);

        if (!$activity) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Activity not found."]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT
                i.intern_id, i.first_name, i.last_name, i.school,
                s.submission_id, s.status, s.grade, s.feedback, s.submitted_at, s.graded_at
            FROM interns i
            CROSS JOIN (SELECT ? AS act_id) AS current_act
            LEFT JOIN activity_targets t ON t.activity_id = current_act.act_id AND t.intern_id = i.intern_id
            LEFT JOIN activity_submissions s ON s.intern_id = i.intern_id AND s.activity_id = current_act.act_id
            WHERE i.supervisor_id = ?
              AND (
                  (SELECT target_type FROM activities WHERE activity_id = current_act.act_id) = 'all' 
                  OR t.intern_id IS NOT NULL
              )
            ORDER BY i.last_name ASC, i.first_name ASC
        ");
        $stmt->execute([$route_id, $supervisor_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['is_late'] = false;
            if ($r['submission_id'] && $activity['due_date'] && $r['submitted_at']) {
                $r['is_late'] = strtotime($r['submitted_at']) > strtotime($activity['due_date']);
            }
            // Fetch files for this submission
            if ($r['submission_id']) {
                $file_stmt = $pdo->prepare("SELECT file_id, file_name, file_size, mime_type FROM activity_submission_files WHERE submission_id = ?");
                $file_stmt->execute([$r['submission_id']]);
                $r['files'] = $file_stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $r['files'] = [];
            }
        }

        $activity['is_graded'] = (bool)$activity['is_graded'];

        echo json_encode([
            "status"   => "success",
            "activity" => $activity,
            "roster"   => $rows,
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
