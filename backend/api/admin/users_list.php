<?php
// backend/api/admin/users_list.php

try {
    $where_clauses = [];
    $params = [];

    if (!empty($_GET['user_type'])) {
        $where_clauses[] = "u.user_type = ?";
        $params[] = $_GET['user_type'];
    }

    if (isset($_GET['is_active']) && $_GET['is_active'] !== '') {
        $where_clauses[] = "u.is_active = ?";
        $params[] = ($_GET['is_active'] === 'true' || $_GET['is_active'] === '1') ? 1 : 0;
    }

    $where_sql = count($where_clauses) > 0 ? "WHERE " . implode(" AND ", $where_clauses) : "";

    // 1. Pagination settings
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    if ($page < 1) $page = 1;
    if ($limit < 1) $limit = 10;
    $offset = ($page - 1) * $limit;

    // 2. Count total records for this filter
    $count_query = "SELECT COUNT(*) FROM users u $where_sql";
    $count_stmt = $pdo->prepare($count_query);
    $count_stmt->execute($params);
    $total_items = (int)$count_stmt->fetchColumn();
    $total_pages = ceil($total_items / $limit);

    // 3. Fetch paginated records
    $query = "
        SELECT 
            u.user_id, 
            u.email, 
            u.user_type, 
            u.is_active, 
            u.is_2fa_enabled,
            u.created_at,
            COALESCE(a.first_name, s.first_name, i.first_name) as first_name,
            COALESCE(a.middle_name, s.middle_name, i.middle_name) as middle_name,
            COALESCE(a.last_name, s.last_name, i.last_name) as last_name,
            COALESCE(a.contact_num, s.contact_num, i.contact_num) as contact_num,
            COALESCE(a.pfpic, i.pfpic) as pfpic,
            COALESCE(s.department_id, i.department_id) as department_id,
            d.department_name,
            (SELECT user_id FROM supervisors WHERE supervisor_id = i.supervisor_id) as supervisor_id,
            i.school,
            i.required_hours,
            i.start_date,
            i.end_date,
            i.status
        FROM users u
        LEFT JOIN admins a ON u.user_id = a.user_id
        LEFT JOIN supervisors s ON u.user_id = s.user_id
        LEFT JOIN interns i ON u.user_id = i.user_id
        LEFT JOIN departments d ON (s.department_id = d.department_id OR i.department_id = d.department_id)
        $where_sql
        ORDER BY u.created_at DESC
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "users" => $users,
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
