<?php
// backend/api/supervisor/activities.php
// GET    /api/supervisor/activities                — list this supervisor's activities
// POST   /api/supervisor/activities                — create
// PUT    /api/supervisor/activities/{id}           — update
// PATCH  /api/supervisor/activities/{id}/toggle    — toggle is_active

$user_id = $user['userId'] ?? null;
$ip      = $_SERVER['REMOTE_ADDR'] ?? null;
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? null;

function sup_audit($pdo, $uid, $action, $details, $ip, $ua) {
    $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
        ->execute([$uid, $action, 'Activities', $details, $ip, $ua]);
}

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

    // ── Toggle active ──────────────────────────────
    if ($method === 'PATCH' && $route_id && str_ends_with($path, '/toggle')) {
        $stmt = $pdo->prepare("SELECT title, is_active FROM activities WHERE activity_id = ? AND supervisor_id = ?");
        $stmt->execute([$route_id, $supervisor_id]);
        $act = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$act) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Activity not found."]);
            exit;
        }

        $new = $act['is_active'] ? 0 : 1;
        $pdo->prepare("UPDATE activities SET is_active = ? WHERE activity_id = ?")
            ->execute([$new, $route_id]);

        sup_audit($pdo, $user_id, $new ? 'ACTIVATE_ACTIVITY' : 'DEACTIVATE_ACTIVITY',
            "Set activity \"{$act['title']}\" (ID: $route_id) to " . ($new ? 'Active' : 'Inactive') . '.', $ip, $ua);

        echo json_encode(["status" => "success", "is_active" => (bool)$new]);
        exit;
    }

    // ── Create or Update (Unified Logic for Targets) ──
    if (($method === 'POST') || ($method === 'PUT' && $route_id)) {
        if ($method === 'PUT') {
            $owns = $pdo->prepare("SELECT 1 FROM activities WHERE activity_id = ? AND supervisor_id = ?");
            $owns->execute([$route_id, $supervisor_id]);
            if (!$owns->fetchColumn()) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Activity not found."]);
                exit;
            }
        }

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $due_date    = $input['due_date'] ?? null;
        $is_graded   = array_key_exists('is_graded', $input) ? (!empty($input['is_graded']) ? 1 : 0) : 1;
        $accept_late = array_key_exists('accept_late', $input) ? (!empty($input['accept_late']) ? 1 : 0) : 0;
        $target_type = $input['target_type'] ?? 'all';
        $intern_ids  = $input['intern_ids'] ?? [];

        if (!$title) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "Title is required."]);
            exit;
        }

        $pdo->beginTransaction();

        if ($method === 'POST') {
            $pdo->prepare("INSERT INTO activities (supervisor_id, title, description, due_date, is_graded, accept_late, target_type) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute([$supervisor_id, $title, $description, $due_date ?: null, $is_graded, $accept_late, $target_type]);
            $activity_id = $pdo->lastInsertId();
            $action = 'CREATE_ACTIVITY';
        } else {
            $activity_id = $route_id;
            $pdo->prepare("UPDATE activities SET title = ?, description = ?, due_date = ?, is_graded = ?, accept_late = ?, target_type = ? WHERE activity_id = ?")
                ->execute([$title, $description, $due_date ?: null, $is_graded, $accept_late, $target_type, $activity_id]);
            // Clear existing targets
            $pdo->prepare("DELETE FROM activity_targets WHERE activity_id = ?")->execute([$activity_id]);
            $action = 'UPDATE_ACTIVITY';
        }

        // Handle specific targets
        if ($target_type === 'specific' && is_array($intern_ids)) {
            $target_stmt = $pdo->prepare("INSERT INTO activity_targets (activity_id, intern_id) VALUES (?, ?)");
            foreach ($intern_ids as $iid) {
                // Verify intern belongs to this supervisor
                $check = $pdo->prepare("SELECT 1 FROM interns WHERE intern_id = ? AND supervisor_id = ?");
                $check->execute([$iid, $supervisor_id]);
                if ($check->fetchColumn()) {
                    $target_stmt->execute([$activity_id, $iid]);
                }
            }
        }

        sup_audit($pdo, $user_id, $action, "Activity \"$title\" (ID: $activity_id) targeted to $target_type.", $ip, $ua);

        // --- Notify Interns (only on Create) ---
        if ($method === 'POST') {
            $notif_targets = [];
            if ($target_type === 'all') {
                $nt_stmt = $pdo->prepare("SELECT user_id FROM interns WHERE supervisor_id = ?");
                $nt_stmt->execute([$supervisor_id]);
                $notif_targets = $nt_stmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                // Get user_ids for specific intern_ids
                $placeholders = implode(',', array_fill(0, count($intern_ids), '?'));
                if ($placeholders) {
                    $nt_stmt = $pdo->prepare("SELECT user_id FROM interns WHERE intern_id IN ($placeholders)");
                    $nt_stmt->execute($intern_ids);
                    $notif_targets = $nt_stmt->fetchAll(PDO::FETCH_COLUMN);
                }
            }

            if (!empty($notif_targets)) {
                $notif_stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ACTIVITY')");
                foreach ($notif_targets as $tid) {
                    $notif_stmt->execute([$tid, "New Activity: $title", "Your supervisor assigned a new activity: $title."]);
                }
            }
        }

        $pdo->commit();
        echo json_encode(["status" => "success", "activity_id" => (int)$activity_id]);
        exit;
    }

    // ── List ───────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT
                a.*,
                (SELECT COUNT(*) FROM activity_submissions s WHERE s.activity_id = a.activity_id) AS submission_count
            FROM activities a
            WHERE a.supervisor_id = ?
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$supervisor_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch total interns count for progress bars
        $cnt_stmt = $pdo->prepare("SELECT COUNT(*) FROM interns WHERE supervisor_id = ?");
        $cnt_stmt->execute([$supervisor_id]);
        $total_interns = (int)$cnt_stmt->fetchColumn();

        foreach ($rows as &$r) {
            $r['is_graded']        = (bool)$r['is_graded'];
            $r['is_active']        = (bool)$r['is_active'];
            $r['accept_late']      = (bool)$r['accept_late'];
            $r['submission_count'] = (int)$r['submission_count'];
            
            // If specific, fetch the targeted IDs
            if ($r['target_type'] === 'specific') {
                $t_stmt = $pdo->prepare("SELECT intern_id FROM activity_targets WHERE activity_id = ?");
                $t_stmt->execute([$r['activity_id']]);
                $r['intern_ids'] = $t_stmt->fetchAll(PDO::FETCH_COLUMN);
                $r['total_interns'] = count($r['intern_ids']);
            } else {
                $r['intern_ids'] = [];
                $r['total_interns'] = $total_interns;
            }
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
