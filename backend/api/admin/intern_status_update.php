<?php
// backend/api/admin/intern_status_update.php
// PATCH /api/admin/interns/{id}/status

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing intern ID."]);
    exit;
}

$newStatus = $input['status'] ?? null;
if (!in_array($newStatus, ['incomplete', 'complete', 'terminated'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid status: " . $newStatus]);
    exit;
}

try {
    // 1. Fetch Intern
    $stmt = $pdo->prepare("SELECT * FROM interns WHERE intern_id = ?");
    $stmt->execute([$route_id]);
    $intern = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$intern) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Intern not found."]);
        exit;
    }

    // 2. Eligibility checks when marking complete
    if ($newStatus === 'complete') {
        $missing = [];

        $hours_stmt = $pdo->prepare("SELECT COALESCE(SUM(total_hours), 0) FROM timelogs WHERE user_id = ? AND is_disputed = 0");
        $hours_stmt->execute([$intern['user_id']]);
        $rendered = (float) $hours_stmt->fetchColumn();
        $required = (float) $intern['required_hours'];
        if ($rendered < $required) {
            $missing['hours'] = [
                'rendered' => $rendered,
                'required' => $required,
                'short'    => round($required - $rendered, 2),
            ];
        }

        $docs_stmt = $pdo->prepare("
            SELECT dt.name
            FROM document_types dt
            LEFT JOIN documents d
                ON dt.document_type_id = d.document_type_id AND d.intern_id = ?
            WHERE dt.is_required = 1
              AND dt.is_active = 1
              AND (d.status IS NULL OR d.status != 'approved')
        ");
        $docs_stmt->execute([$route_id]);
        $missing_docs = $docs_stmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($missing_docs)) {
            $missing['documents'] = $missing_docs;
        }

        if (!empty($missing)) {
            http_response_code(422);
            echo json_encode([
                "status"  => "error",
                "message" => "Cannot mark intern as complete. Some requirements are not yet met.",
                "missing" => $missing,
            ]);
            exit;
        }
    }

    $pdo->beginTransaction();

    // 3. Update Status
    // If moving back to 'incomplete', clear end_date. Otherwise set end_date if not already set.
    $updateSql = "UPDATE interns SET status = ?, updated_at = CURRENT_TIMESTAMP";
    $params = [$newStatus];

    if ($newStatus === 'incomplete') {
        $updateSql .= ", end_date = NULL";
    } else {
        $updateSql .= ", end_date = IFNULL(end_date, CURRENT_DATE)";
    }

    $updateSql .= " WHERE intern_id = ?";
    $params[] = $route_id;

    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->execute($params);

    // 3. Handle User Deactivation/Reactivation
    // If 'terminated', deactivate user. If 'incomplete' or 'complete', ensure active (usually).
    // Actually, 'complete' doesn't mean deactivate. Only 'terminated' does.
    if ($newStatus === 'terminated') {
        $userUpdate = $pdo->prepare("UPDATE users SET is_active = 0 WHERE user_id = ?");
        $userUpdate->execute([$intern['user_id']]);
    } else {
        // If it was terminated before, reactivate it
        $userUpdate = $pdo->prepare("UPDATE users SET is_active = 1 WHERE user_id = ?");
        $userUpdate->execute([$intern['user_id']]);
    }

    // 4. Audit Log
    $log_stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)");
    $details = "Admin manually changed Intern (ID: {$route_id}) status from '{$intern['status']}' to '{$newStatus}'.";
    $log_stmt->execute([$user['userId'], 'ADMIN_STATUS_FIX', 'INTERNS', $details]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Intern status updated to '{$newStatus}'."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
