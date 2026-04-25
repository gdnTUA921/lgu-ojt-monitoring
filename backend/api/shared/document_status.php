<?php
// backend/api/shared/document_status.php
// PATCH /api/documents/{id}/status — admin or supervisor only

if (!$route_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing document ID."]);
    exit;
}

if (!in_array($user['userType'], ['admin', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Forbidden."]);
    exit;
}

$status = $input['status'] ?? '';
if (!in_array($status, ['pending', 'approved', 'rejected'])) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Invalid status value."]);
    exit;
}

try {
    $remarks = $input['remarks'] ?? null;
    $pdo->prepare("UPDATE documents SET status = ?, remarks = ? WHERE document_id = ?")
        ->execute([$status, $remarks, $route_id]);

    echo json_encode(["status" => "success", "message" => "Document status updated."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
