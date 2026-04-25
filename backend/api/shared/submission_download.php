<?php
// backend/api/shared/submission_download.php
// GET /api/files/{id}/download
// Serves both intern submission files and supervisor instruction files.

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing file ID."]);
    exit;
}

$user_id = $user['userId']   ?? null;
$role    = $user['userType'] ?? null;

try {
    // Try intern submission file first
    $stmt = $pdo->prepare("
        SELECT f.file_path, f.file_name, f.mime_type,
               i.user_id AS intern_user_id,
               sup.user_id AS supervisor_user_id
        FROM activity_submission_files f
        JOIN activity_submissions s ON f.submission_id = s.submission_id
        JOIN interns i              ON s.intern_id = i.intern_id
        LEFT JOIN supervisors sup   ON i.supervisor_id = sup.supervisor_id
        WHERE f.file_id = ?
    ");
    $stmt->execute([$route_id]);
    $file_rec = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($file_rec) {
        $allowed = ($role === 'admin')
            || ($role === 'intern'      && (int)$file_rec['intern_user_id']      === (int)$user_id)
            || ($role === 'supervisor'  && (int)$file_rec['supervisor_user_id']  === (int)$user_id);

        if (!$allowed) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Access denied."]);
            exit;
        }
    } else {
        // Try supervisor instruction file
        $stmt2 = $pdo->prepare("
            SELECT f.file_path, f.file_name, f.mime_type,
                   sup.user_id AS supervisor_user_id
            FROM activity_instruction_files f
            JOIN activities a    ON f.activity_id = a.activity_id
            JOIN supervisors sup ON a.supervisor_id = sup.supervisor_id
            WHERE f.file_id = ?
        ");
        $stmt2->execute([$route_id]);
        $file_rec = $stmt2->fetch(PDO::FETCH_ASSOC);

        if (!$file_rec) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "File not found."]);
            exit;
        }

        // Interns and their supervisor + admin may download instruction files
        $allowed = ($role === 'admin')
            || ($role === 'intern')
            || ($role === 'supervisor' && (int)$file_rec['supervisor_user_id'] === (int)$user_id);

        if (!$allowed) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Access denied."]);
            exit;
        }
    }

    $full = __DIR__ . '/../../' . $file_rec['file_path'];
    if (!is_file($full)) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "File missing on server."]);
        exit;
    }

    $mime = $file_rec['mime_type'] ?: 'application/octet-stream';
    header("Content-Type: $mime");
    header("Content-Length: " . filesize($full));
    header("Content-Disposition: attachment; filename=\"" . addslashes($file_rec['file_name']) . "\"");
    header("Cache-Control: private, max-age=0");
    readfile($full);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
