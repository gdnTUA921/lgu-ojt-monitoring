<?php

require_once __DIR__ . '/config/corsHeader.php';
require_once __DIR__ . '/config/connect_db.php';

try {

    $stmt = $pdo->query("SELECT NOW()");
    $result = $stmt->fetch();

    $password = password_hash("password", PASSWORD_BCRYPT);

    echo json_encode([
        "status" => "success",
        "password" => $password,
        "server_time" => $result
    ]);

} catch (Exception $e) {

    echo json_encode([
        "status" => "error"
    ]);
}