<?php
// backend/api/admin/requirement_toggle.php
// PATCH /api/admin/intern-requirements
// Admin can mark/unmark a requirement for an intern regardless of whether a document was uploaded.
// If a document record exists → updates its status.
// If no record exists → creates a manual stub with file_path='admin_manual'.

$intern_id        = $input['intern_id'] ?? null;
$document_type_id = $input['document_type_id'] ?? null;
$status           = $input['status'] ?? 'approved';

if (!$intern_id || !$document_type_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing intern_id or document_type_id."]);
    exit;
}

if (!in_array($status, ['pending', 'approved', 'rejected'])) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Invalid status value."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT document_id FROM documents WHERE intern_id = ? AND document_type_id = ?");
    $stmt->execute([$intern_id, $document_type_id]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    $verified_at = $status === 'approved' ? date('Y-m-d H:i:s') : null;

    if ($doc) {
        $pdo->prepare("UPDATE documents SET status = ?, verified_at = ? WHERE document_id = ?")
            ->execute([$status, $verified_at, $doc['document_id']]);
    } else {
        $pdo->prepare("INSERT INTO documents (intern_id, document_type_id, status, verified_at) VALUES (?, ?, ?, ?)")
            ->execute([$intern_id, $document_type_id, $status, $verified_at]);
    }

    echo json_encode(["status" => "success"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
