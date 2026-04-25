<?php
// backend/api/admin/audit_logs.php

try {
    $where_clauses = [];
    $params = [];

    // Filters
    if (!empty($_GET['module'])) {
        $where_clauses[] = "l.module = ?";
        $params[] = $_GET['module'];
    }
    if (!empty($_GET['date_from'])) {
        $where_clauses[] = "DATE(l.created_at) = ?";
        $params[] = $_GET['date_from'];
    }
    
    $where_sql = count($where_clauses) > 0 ? "WHERE " . implode(" AND ", $where_clauses) : "";

    // 1. Pagination settings
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    if ($page < 1) $page = 1;
    if ($limit < 1) $limit = 20;
    $offset = ($page - 1) * $limit;

    // 2. Count total records
    $count_query = "SELECT COUNT(*) FROM audit_logs l $where_sql";
    $count_stmt = $pdo->prepare($count_query);
    $count_stmt->execute($params);
    $total_items = (int)$count_stmt->fetchColumn();
    $total_pages = ceil($total_items / $limit);

    // 3. Fetch logs with performer details
    $query = "
        SELECT 
            l.*,
            u.email as user_email,
            COALESCE(a.first_name, s.first_name, i.first_name) as first_name,
            COALESCE(a.last_name, s.last_name, i.last_name) as last_name
        FROM audit_logs l
        LEFT JOIN users u ON l.user_id = u.user_id
        LEFT JOIN admins a ON u.user_id = a.user_id
        LEFT JOIN supervisors s ON u.user_id = s.user_id
        LEFT JOIN interns i ON u.user_id = i.user_id
        $where_sql
        ORDER BY l.created_at DESC 
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Transform for frontend consumption
    $formatted_logs = array_map(function($row) {
        return [
            "log_id" => $row['log_id'],
            "user_name" => $row['first_name'] ? ($row['first_name'] . ' ' . $row['last_name']) : 'System',
            "user_email" => $row['user_email'] ?? 'system@internal',
            "action" => $row['action'],
            "module" => $row['module'],
            "details" => $row['details'],
            "created_at" => $row['created_at'],
            "ip_address" => $row['ip_address']
        ];
    }, $logs);

    echo json_encode([
        "status" => "success",
        "logs" => $formatted_logs,
        "pagination" => [
            "total_items" => $total_items,
            "total_pages" => $total_pages,
            "current_page" => $page,
            "limit" => $limit
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
