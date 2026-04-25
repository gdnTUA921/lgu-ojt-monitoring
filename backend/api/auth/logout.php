<?php
// backend/api/auth/logout.php

// 1. Extract user_id from the incoming JSON (passed from your frontend)
$user_id = $input['user_id'] ?? null;

if ($user_id) {
    try {
        // 2. Record the activity in Audit Logs
        $query = "INSERT INTO audit_logs (user_id, action, module, details, ip_address) 
                  VALUES (:user_id, 'LOGOUT', 'AUTH', 'User logged out manually', :ip_address)";

        $stmt = $pdo->prepare($query);
        $result = $stmt->execute([
            ":user_id" => $user_id,
            ":ip_address" => $_SERVER['REMOTE_ADDR']
        ]);

        if ($result) {
            echo json_encode([
                "status" => "success",
                "message" => "Logged out successfully"
            ]);
        } else {
            throw new Exception("Failed to record audit log");
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Server error during logout",
            "debug" => $e->getMessage()
        ]);
    }
} else {
    // Even if no user_id is sent, we should tell the frontend it's "okay" to log out
    echo json_encode([
        "status" => "success",
        "message" => "Logged out (no activity recorded)"
    ]);
}
