<?php
// backend/api/admin/interns_list.php
// Returns all interns with rendered hours and department info for the admin view.

try {
    $where = [];
    $params = [];

    if (!empty($_GET['search'])) {
        $s = '%' . $_GET['search'] . '%';
        $where[] = "(i.first_name LIKE ? OR i.last_name LIKE ? OR i.school LIKE ?)";
        array_push($params, $s, $s, $s);
    }

    if (!empty($_GET['status'])) {
        $where[] = "i.status = ?";
        $params[] = $_GET['status'];
    }

    if (!empty($_GET['department_id'])) {
        $where[] = "i.department_id = ?";
        $params[] = $_GET['department_id'];
    }

    $where_sql = $where ? "WHERE " . implode(" AND ", $where) : "";

    $order_by = "i.last_name ASC, i.first_name ASC";
    if (!empty($_GET['sort'])) {
        if ($_GET['sort'] === 'start_asc') $order_by = "i.start_date ASC";
        if ($_GET['sort'] === 'start_desc') $order_by = "i.start_date DESC";
    }

    $stmt = $pdo->prepare("
        SELECT
            i.intern_id,
            i.user_id,
            i.first_name,
            i.last_name,
            i.school,
            i.required_hours,
            i.start_date,
            i.end_date,
            i.contact_num,
            i.status,
            d.department_name,
            COALESCE((
                SELECT SUM(t.total_hours)
                FROM timelogs t
                WHERE t.user_id = i.user_id
                  AND t.total_hours IS NOT NULL
                  AND t.is_disputed = 0
            ), 0) AS rendered_hours
        FROM interns i
        LEFT JOIN departments d ON i.department_id = d.department_id
        $where_sql
        ORDER BY $order_by
    ");
    $stmt->execute($params);

    echo json_encode([
        "status"  => "success",
        "interns" => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
