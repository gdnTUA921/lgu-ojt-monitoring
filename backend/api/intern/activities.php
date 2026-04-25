<?php
// backend/api/intern/activities.php
// GET  /api/intern/activities                    — list active activities from this intern's supervisor
// POST /api/intern/activities/{id}/submit        — multipart upload (field name: files[])
//
// NOTE: php.ini must allow 50 MB uploads:
//   upload_max_filesize = 50M
//   post_max_size       = 52M

$user_id = $user['userId'] ?? null;
$ip      = $_SERVER['REMOTE_ADDR'] ?? null;
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? null;

const MAX_UPLOAD_BYTES = 52428800; // 50 MB (Total)
const MAX_FILES = 10;

try {
    $stmt = $pdo->prepare("SELECT intern_id, supervisor_id, first_name, last_name FROM interns WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $intern = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intern) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Intern profile not found."]);
        exit;
    }
    $intern_id     = $intern['intern_id'];
    $supervisor_id = $intern['supervisor_id'];
    $intern_name   = trim($intern['first_name'] . ' ' . $intern['last_name']);

    // ── POST: submit multiple files ────────────────
    if ($method === 'POST' && $route_id) {
        $act_stmt = $pdo->prepare("
            SELECT activity_id, title, due_date, is_active, accept_late
            FROM activities
            WHERE activity_id = ? AND supervisor_id = ?
        ");
        $act_stmt->execute([$route_id, $supervisor_id]);
        $activity = $act_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$activity || !$activity['is_active']) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Activity not available."]);
            exit;
        }

        // Check for existing submission
        $ex_stmt = $pdo->prepare("SELECT submission_id, status FROM activity_submissions WHERE activity_id = ? AND intern_id = ?");
        $ex_stmt->execute([$route_id, $intern_id]);
        $existing = $ex_stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing && $existing['status'] === 'graded') {
            http_response_code(409);
            echo json_encode(["status" => "error", "message" => "Cannot resubmit — your submission has already been graded."]);
            exit;
        }

        $now      = time();
        $past_due = $activity['due_date'] && strtotime($activity['due_date']) < $now;

        if ($past_due && !$activity['accept_late'] && !$existing) {
            http_response_code(409);
            echo json_encode(["status" => "error", "message" => "Cannot submit — the due date has passed and late submissions are not accepted."]);
            exit;
        }

        if ($existing && $past_due) {
            http_response_code(409);
            echo json_encode(["status" => "error", "message" => "Cannot resubmit — the due date has passed."]);
            exit;
        }

        if (empty($_FILES['files'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No files uploaded."]);
            exit;
        }

        $files = $_FILES['files'];
        $file_count = is_array($files['name']) ? count($files['name']) : 1;

        if ($file_count > MAX_FILES) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Maximum " . MAX_FILES . " files allowed."]);
            exit;
        }

        $pdo->beginTransaction();

        // 1. Create/Update Submission record
        $comments = $_POST['comments'] ?? null;
        if ($existing) {
            $submission_id = $existing['submission_id'];
            $pdo->prepare("
                UPDATE activity_submissions
                SET comments = ?, status = 'submitted', grade = NULL, feedback = NULL, graded_at = NULL, submitted_at = NOW()
                WHERE submission_id = ?
            ")->execute([$comments, $submission_id]);

            // Delete old files from disk and DB
            $old_files = $pdo->prepare("SELECT file_path FROM activity_submission_files WHERE submission_id = ?");
            $old_files->execute([$submission_id]);
            foreach ($old_files->fetchAll() as $of) {
                $old_full = __DIR__ . '/../../' . $of['file_path'];
                if (is_file($old_full)) @unlink($old_full);
            }
            $pdo->prepare("DELETE FROM activity_submission_files WHERE submission_id = ?")->execute([$submission_id]);
        } else {
            $pdo->prepare("
                INSERT INTO activity_submissions (activity_id, intern_id, comments)
                VALUES (?, ?, ?)
            ")->execute([$route_id, $intern_id, $comments]);
            $submission_id = $pdo->lastInsertId();
        }

        // 2. Handle File Uploads
        $upload_dir = __DIR__ . '/../../uploads/submissions/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

        for ($i = 0; $i < $file_count; $i++) {
            $f_error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            $f_name  = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $f_tmp   = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $f_size  = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            $f_type  = is_array($files['type']) ? $files['type'][$i] : $files['type'];

            if ($f_error !== UPLOAD_ERR_OK) continue;
            if ($f_size > MAX_UPLOAD_BYTES) continue; // Skip too large files (should be handled by client)

            $ext       = pathinfo($f_name, PATHINFO_EXTENSION);
            $safe_base = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($f_name, PATHINFO_FILENAME));
            $safe_base = substr($safe_base, 0, 60);
            $filename  = "s{$submission_id}_f{$i}_" . time() . "_{$safe_base}" . ($ext ? ".$ext" : '');
            $target    = $upload_dir . $filename;

            if (move_uploaded_file($f_tmp, $target)) {
                $rel_path = "uploads/submissions/$filename";
                $pdo->prepare("
                    INSERT INTO activity_submission_files (submission_id, file_path, file_name, file_size, mime_type)
                    VALUES (?, ?, ?, ?, ?)
                ")->execute([$submission_id, $rel_path, $f_name, $f_size, $f_type]);
            }
        }

        // 3. Audit Log
        $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$user_id, $existing ? 'RESUBMIT_ACTIVITY' : 'SUBMIT_ACTIVITY', 'Activities',
                "Intern submitted $file_count files for activity ID: $route_id.", $ip, $ua]);

        $pdo->commit();

        // 4. Notify supervisor
        if ($supervisor_id) {
            $sup_uid_stmt = $pdo->prepare("SELECT user_id FROM supervisors WHERE supervisor_id = ?");
            $sup_uid_stmt->execute([$supervisor_id]);
            $sup_user_id = $sup_uid_stmt->fetchColumn();

            if ($sup_user_id) {
                $action_label = $existing ? 'resubmitted' : 'submitted';
                $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ACTIVITY')")
                    ->execute([
                        $sup_user_id,
                        "New Submission: {$activity['title']}",
                        "{$intern_name} {$action_label} their work for \"{$activity['title']}\"."
                    ]);
            }
        }

        echo json_encode(["status" => "success", "submission_id" => (int)$submission_id]);
        exit;
    }

    // ── GET: list assigned activities ──────────────
    if ($method === 'GET') {
        if (!$supervisor_id) {
            echo json_encode(["status" => "success", "activities" => []]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT
                a.activity_id, a.title, a.description, a.due_date, a.is_graded, a.accept_late, a.created_at,
                s.submission_id, s.comments,
                s.status AS submission_status, s.grade, s.feedback, s.submitted_at, s.graded_at
            FROM activities a
            LEFT JOIN activity_targets t ON t.activity_id = a.activity_id
            LEFT JOIN activity_submissions s
                   ON s.activity_id = a.activity_id AND s.intern_id = ?
            WHERE a.supervisor_id = ? 
              AND a.is_active = 1
              AND (a.target_type = 'all' OR t.intern_id = ?)
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$intern_id, $supervisor_id, $intern_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $now = time();
        foreach ($rows as &$r) {
            $r['is_graded']   = (bool)$r['is_graded'];
            $r['accept_late'] = (bool)$r['accept_late'];
            $r['is_late']   = ($r['submission_id'] && $r['due_date'] && $r['submitted_at'])
                ? strtotime($r['submitted_at']) > strtotime($r['due_date']) : false;
            $r['past_due'] = $r['due_date'] ? strtotime($r['due_date']) < $now : false;

            // Fetch intern submission files
            if ($r['submission_id']) {
                $f_stmt = $pdo->prepare("SELECT file_id, file_name, file_size, mime_type FROM activity_submission_files WHERE submission_id = ?");
                $f_stmt->execute([$r['submission_id']]);
                $r['files'] = $f_stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $r['files'] = [];
            }

            // Fetch supervisor instruction files
            $if_stmt = $pdo->prepare("SELECT file_id, file_name, file_size, mime_type FROM activity_instruction_files WHERE activity_id = ? ORDER BY uploaded_at ASC");
            $if_stmt->execute([$r['activity_id']]);
            $r['instruction_files'] = $if_stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(["status" => "success", "activities" => $rows]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
