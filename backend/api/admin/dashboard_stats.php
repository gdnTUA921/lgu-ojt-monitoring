<?php

try {
    $query1 = "SELECT COUNT(i.intern_id) as total_interns
               FROM interns i
               JOIN users u ON i.user_id = u.user_id
               WHERE i.status = 'incomplete' AND u.is_active = 1";
    $stmt1 = $pdo->prepare($query1);
    $stmt1->execute();
    $total_interns = $stmt1->fetch(PDO::FETCH_ASSOC);

    $query2 = "SELECT COUNT(user_id) as total_supervisors FROM users WHERE user_type='supervisor' AND is_active = 1";
    $stmt2 = $pdo->prepare($query2);
    $stmt2->execute();
    $total_supervisors = $stmt2->fetch(PDO::FETCH_ASSOC);

    $query3 = "SELECT COUNT(department_id) as total_departments FROM departments";
    $stmt3 = $pdo->prepare($query3);
    $stmt3->execute();
    $total_departments = $stmt3->fetch(PDO::FETCH_ASSOC);

    $query4 = "SELECT COUNT(*) as pending_documents
               FROM interns i
               JOIN users u ON i.user_id = u.user_id
               CROSS JOIN document_types dt
               LEFT JOIN documents d ON d.intern_id = i.intern_id AND d.document_type_id = dt.document_type_id
               WHERE i.status = 'incomplete' AND u.is_active = 1
                 AND dt.is_required = 1 AND dt.is_active = 1
                 AND (d.document_id IS NULL OR d.status != 'approved')";
    $stmt4 = $pdo->prepare($query4);
    $stmt4->execute();
    $total_pending_documents = $stmt4->fetch(PDO::FETCH_ASSOC);

    $query5 = "SELECT 
                l.created_at as date, 
                l.action as event, 
                l.user_id, 
                l.details, 
                l.ip_address,
                u.email as performer_email,
                COALESCE(a.first_name, s.first_name, i.first_name) as first_name,
                COALESCE(a.last_name, s.last_name, i.last_name) as last_name
            FROM audit_logs l
            LEFT JOIN users u ON l.user_id = u.user_id
            LEFT JOIN admins a ON u.user_id = a.user_id
            LEFT JOIN supervisors s ON u.user_id = s.user_id
            LEFT JOIN interns i ON u.user_id = i.user_id
            ORDER BY l.created_at DESC 
            LIMIT 5";
    $stmt5 = $pdo->prepare($query5);
    $stmt5->execute();
    $recent_activity = $stmt5->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "total_interns" => (int)$total_interns['total_interns'],
        "total_supervisors" => (int)$total_supervisors['total_supervisors'],
        "total_departments" => (int)$total_departments['total_departments'],
        "pending_documents" => (int)$total_pending_documents['pending_documents'],
        "recent_activity" => $recent_activity,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Server error during logout",
        "debug" => $e->getMessage()
    ]);
}

?>