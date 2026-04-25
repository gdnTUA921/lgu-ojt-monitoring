<?php
require_once __DIR__ . '/../config/connect_db.php';

try {
    $results = [];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $results['users_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM departments");
    $results['departments_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM interns");
    $results['interns_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    header('Content-Type: application/json');
    echo json_encode($results, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
