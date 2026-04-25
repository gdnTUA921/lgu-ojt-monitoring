<?php
// backend/api/supervisor/activity_files.php
// POST   /api/supervisor/activities/{id}/files  — upload instruction files (max 5 total)
// DELETE /api/supervisor/activities/{id}/files/{file_id} — delete one instruction file

const MAX_INSTRUCTION_FILES = 5;
const MAX_INSTRUCTION_BYTES = 20971520; // 20 MB per file

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

    // Verify the activity belongs to this supervisor
    $act_stmt = $pdo->prepare("SELECT activity_id, title FROM activities WHERE activity_id = ? AND supervisor_id = ?");
    $act_stmt->execute([$route_id, $supervisor_id]);
    $activity = $act_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$activity) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Activity not found."]);
        exit;
    }

    // ── DELETE: remove one instruction file ────────────────────────────────
    if ($method === 'DELETE') {
        // $file_id is passed via a secondary segment parsed in index.php
        $file_id_to_delete = $extra_id ?? null;

        if (!$file_id_to_delete) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing file ID."]);
            exit;
        }

        $f_stmt = $pdo->prepare("SELECT file_path, file_name FROM activity_instruction_files WHERE file_id = ? AND activity_id = ?");
        $f_stmt->execute([$file_id_to_delete, $route_id]);
        $f = $f_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$f) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "File not found."]);
            exit;
        }

        $full = __DIR__ . '/../../' . $f['file_path'];
        if (is_file($full)) @unlink($full);

        $pdo->prepare("DELETE FROM activity_instruction_files WHERE file_id = ?")->execute([$file_id_to_delete]);

        $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$user_id, 'DELETE_INSTRUCTION_FILE', 'Activities',
                "Deleted instruction file \"{$f['file_name']}\" from activity \"{$activity['title']}\" (ID: {$route_id}).", $ip, $ua]);

        echo json_encode(["status" => "success"]);
        exit;
    }

    // ── POST: upload new instruction files ─────────────────────────────────
    if ($method === 'POST') {
        if (empty($_FILES['files'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No files provided."]);
            exit;
        }

        // Count existing instruction files
        $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM activity_instruction_files WHERE activity_id = ?");
        $count_stmt->execute([$route_id]);
        $existing_count = (int)$count_stmt->fetchColumn();

        $files      = $_FILES['files'];
        $file_count = is_array($files['name']) ? count($files['name']) : 1;

        if ($existing_count + $file_count > MAX_INSTRUCTION_FILES) {
            $remaining = MAX_INSTRUCTION_FILES - $existing_count;
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Maximum " . MAX_INSTRUCTION_FILES . " files allowed. You can add $remaining more."]);
            exit;
        }

        $upload_dir = __DIR__ . '/../../uploads/instructions/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

        $uploaded = 0;
        for ($i = 0; $i < $file_count; $i++) {
            $f_error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            $f_name  = is_array($files['name'])  ? $files['name'][$i]  : $files['name'];
            $f_tmp   = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $f_size  = is_array($files['size'])  ? $files['size'][$i]  : $files['size'];
            $f_type  = is_array($files['type'])  ? $files['type'][$i]  : $files['type'];

            if ($f_error !== UPLOAD_ERR_OK) continue;
            if ($f_size > MAX_INSTRUCTION_BYTES) continue;

            $ext       = pathinfo($f_name, PATHINFO_EXTENSION);
            $safe_base = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($f_name, PATHINFO_FILENAME));
            $safe_base = substr($safe_base, 0, 60);
            $filename  = "act{$route_id}_f{$i}_" . time() . "_{$safe_base}" . ($ext ? ".$ext" : '');
            $target    = $upload_dir . $filename;

            if (move_uploaded_file($f_tmp, $target)) {
                $rel_path = "uploads/instructions/$filename";
                $pdo->prepare("
                    INSERT INTO activity_instruction_files (activity_id, file_path, file_name, file_size, mime_type)
                    VALUES (?, ?, ?, ?, ?)
                ")->execute([$route_id, $rel_path, $f_name, $f_size, $f_type]);
                $uploaded++;
            }
        }

        $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$user_id, 'UPLOAD_INSTRUCTION_FILES', 'Activities',
                "Uploaded $uploaded instruction file(s) to activity \"{$activity['title']}\" (ID: {$route_id}).", $ip, $ua]);

        // Fetch updated file list
        $f_stmt = $pdo->prepare("SELECT file_id, file_name, file_size, mime_type, uploaded_at FROM activity_instruction_files WHERE activity_id = ? ORDER BY uploaded_at ASC");
        $f_stmt->execute([$route_id]);
        $updated_files = $f_stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["status" => "success", "uploaded" => $uploaded, "files" => $updated_files]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
