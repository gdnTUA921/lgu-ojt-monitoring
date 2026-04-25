<?php
// backend/api/shared/timelogs_list.php

try {
    $where_clauses = [];
    $params = [];

    // Role-based filtering
    if ($user['userType'] === 'intern') {
        $where_clauses[] = "t.user_id = ?";
        $params[] = $user['userId'];
    } elseif ($user['userType'] === 'supervisor') {
        // Supervisors see interns assigned to them
        $where_clauses[] = "i.supervisor_id = (SELECT supervisor_id FROM supervisors WHERE user_id = ?)";
        $params[] = $user['userId'];
    }
    // Admins see everything (no extra where needed)

    // Optional filters from frontend
    if (!empty($_GET['date_from'])) {
        $where_clauses[] = "t.date >= ?";
        $params[] = $_GET['date_from'];
    }
    if (!empty($_GET['user_id']) && $user['userType'] !== 'intern') {
        $where_clauses[] = "t.user_id = ?";
        $params[] = $_GET['user_id'];
    }

    $where_sql = count($where_clauses) > 0 ? "WHERE " . implode(" AND ", $where_clauses) : "";

    // 1. Sorting logic
    $sort = $_GET['sort'] ?? 'desc';
    $order_sql = ($sort === 'asc') ? "ORDER BY t.date ASC, t.time_in ASC" : "ORDER BY t.date DESC, t.time_in DESC";

    // 2. Pagination settings
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
    if ($page < 1)
        $page = 1;
    if ($limit < 1)
        $limit = 10;
    $offset = ($page - 1) * $limit;

    // 3. Count total records
    $count_query = "
        SELECT COUNT(*) 
        FROM timelogs t
        LEFT JOIN interns i ON t.user_id = i.user_id
        $where_sql
    ";
    $count_stmt = $pdo->prepare($count_query);
    $count_stmt->execute($params);
    $total_items = (int) $count_stmt->fetchColumn();
    $total_pages = ceil($total_items / $limit);

    // 4. Fetch records
    $query = "
        SELECT 
            t.*,
            CONCAT(i.first_name, ' ', i.last_name) as intern_name,
            d.department_name
        FROM timelogs t
        LEFT JOIN interns i ON t.user_id = i.user_id
        LEFT JOIN departments d ON i.department_id = d.department_id
        $where_sql
        $order_sql
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "timelogs" => $logs,
        "pagination" => [
            "total_items" => $total_items,
            "total_pages" => $total_pages,
            "current_page" => $page,
            "limit" => $limit
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
