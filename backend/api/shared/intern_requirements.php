<?php
// backend/api/shared/intern_requirements.php
// GET /api/interns/{id}/requirements
// Returns all active document types merged with this intern's submission status.

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing intern ID."]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT
            dt.document_type_id,
            dt.name,
            dt.description,
            dt.is_required,
            d.status,
            d.verified_at,
            CASE WHEN d.document_id IS NOT NULL THEN 1 ELSE 0 END AS submitted
        FROM document_types dt
        LEFT JOIN documents d
            ON dt.document_type_id = d.document_type_id
            AND d.intern_id = ?
        WHERE dt.is_active = 1
        ORDER BY dt.created_at ASC
    ");
    $stmt->execute([$route_id]);
    $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $total    = count($requirements);
    $submitted = count(array_filter($requirements, fn($r) => (int)$r['submitted'] === 1));
    $approved  = count(array_filter($requirements, fn($r) => $r['status'] === 'approved'));

    echo json_encode([
        "status"       => "success",
        "requirements" => $requirements,
        "stats"        => [
            "total"     => $total,
            "submitted" => $submitted,
            "approved"  => $approved,
        ],
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
