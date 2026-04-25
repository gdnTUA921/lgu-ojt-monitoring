<?php
// backend/api/admin/document_types.php
// Handles GET (list), POST (create), PUT (update), PATCH (toggle-active) for document_types

$admin_id = $user['userId'] ?? null;
$ip       = $_SERVER['REMOTE_ADDR'] ?? null;
$ua       = $_SERVER['HTTP_USER_AGENT'] ?? null;

function audit($pdo, $admin_id, $action, $details, $ip, $ua) {
    $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
        ->execute([$admin_id, $action, 'Requirement Settings', $details, $ip, $ua]);
}

try {
    // PATCH /api/document-types/{id}/toggle-active
    if ($method === 'PATCH' && $route_id) {
        $stmt = $pdo->prepare("SELECT name, is_active FROM document_types WHERE document_type_id = ?");
        $stmt->execute([$route_id]);
        $type = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$type) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Document type not found."]);
            exit;
        }

        $new_status  = $type['is_active'] ? 0 : 1;
        $status_name = $new_status ? 'Active' : 'Inactive';

        $pdo->prepare("UPDATE document_types SET is_active = ? WHERE document_type_id = ?")
            ->execute([$new_status, $route_id]);

        audit($pdo, $admin_id, $new_status ? 'ACTIVATE_REQUIREMENT' : 'DEACTIVATE_REQUIREMENT',
            "Set requirement \"{$type['name']}\" (ID: $route_id) to $status_name.", $ip, $ua);

        echo json_encode(["status" => "success", "is_active" => (bool)$new_status]);

    // PUT /api/document-types/{id}
    } elseif ($method === 'PUT' && $route_id) {
        $name        = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $is_required = isset($input['is_required']) ? (bool)$input['is_required'] : true;

        if (!$name) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "Requirement name is required."]);
            exit;
        }

        $pdo->prepare("UPDATE document_types SET name = ?, description = ?, is_required = ? WHERE document_type_id = ?")
            ->execute([$name, $description, $is_required ? 1 : 0, $route_id]);

        audit($pdo, $admin_id, 'UPDATE_REQUIREMENT',
            "Updated requirement ID: $route_id — name: \"$name\", required: " . ($is_required ? 'yes' : 'no') . ".", $ip, $ua);

        echo json_encode(["status" => "success", "message" => "Requirement updated."]);

    // POST /api/document-types
    } elseif ($method === 'POST') {
        $name        = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $is_required = isset($input['is_required']) ? (bool)$input['is_required'] : true;

        if (!$name) {
            http_response_code(422);
            echo json_encode(["status" => "error", "message" => "Requirement name is required."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO document_types (name, description, is_required) VALUES (?, ?, ?)");
        $stmt->execute([$name, $description, $is_required ? 1 : 0]);
        $new_id = $pdo->lastInsertId();

        audit($pdo, $admin_id, 'CREATE_REQUIREMENT',
            "Created new requirement \"$name\" (ID: $new_id).", $ip, $ua);

        echo json_encode(["status" => "success", "document_type_id" => $new_id]);

    // GET /api/document-types
    } elseif ($method === 'GET') {
        $where  = [];
        $params = [];

        if (isset($_GET['is_active']) && $_GET['is_active'] !== '') {
            $where[]  = "is_active = ?";
            $params[] = ($_GET['is_active'] === 'true' || $_GET['is_active'] === '1') ? 1 : 0;
        }

        $where_sql = $where ? "WHERE " . implode(" AND ", $where) : "";
        $stmt = $pdo->prepare("SELECT * FROM document_types $where_sql ORDER BY created_at DESC");
        $stmt->execute($params);

        echo json_encode(["status" => "success", "document_types" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

    } else {
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
