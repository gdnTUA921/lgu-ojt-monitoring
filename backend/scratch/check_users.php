<?php
require_once __DIR__ . '/../config/connect_db.php';

try {
    $stmt = $pdo->query("SELECT user_id, email, user_type FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    header('Content-Type: application/json');
    echo json_encode($users, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
