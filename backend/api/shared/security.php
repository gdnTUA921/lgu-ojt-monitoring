<?php
// backend/api/shared/security.php

try {
    $current_user_id = $user['userId'];

    if ($method === 'POST' || $method === 'PATCH') {
        // Handle Password Change
        if (isset($input['new_password'])) {
            $current_pw = $input['current_password'] ?? '';
            $new_pw = $input['new_password'];

            // 1. Validate new password strength
            if (
                strlen($new_pw) < 8 ||
                !preg_match('/[a-z]/', $new_pw) ||
                !preg_match('/[A-Z]/', $new_pw) ||
                !preg_match('/[0-9]/', $new_pw) ||
                !preg_match('/[^a-zA-Z0-9]/', $new_pw)
            ) {
                http_response_code(422);
                echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol."]);
                exit;
            }

            // 2. Verify current password
            $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
            $stmt->execute([$current_user_id]);
            $user_data = $stmt->fetch();

            if (!password_verify($current_pw, $user_data['password'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Incorrect current password"]);
                exit;
            }

            // 3. Update to new password
            $hashed = password_hash($new_pw, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
            $stmt->execute([$hashed, $current_user_id]);

            // Notify user
            $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'WARNING')");
            $stmt->execute([
                $current_user_id,
                "Security Alert: Password Changed",
                "Your account password was recently updated. If you did not make this change, please contact support immediately."
            ]);

            echo json_encode(["status" => "success", "message" => "Password updated successfully"]);
        } 
        // Handle 2FA Toggle
        elseif (isset($input['is_2fa_enabled'])) {
            $is_2fa = $input['is_2fa_enabled'] ? 1 : 0;
            $stmt = $pdo->prepare("UPDATE users SET is_2fa_enabled = ? WHERE user_id = ?");
            $stmt->execute([$is_2fa, $current_user_id]);

            // Notify user
            $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INFO')");
            $stmt->execute([
                $current_user_id,
                "2FA Settings Changed",
                "Two-Factor Authentication has been " . ($is_2fa ? "enabled" : "disabled") . " for your account."
            ]);

            echo json_encode([
                "status" => "success", 
                "message" => "2FA settings updated",
                "is_2fa_enabled" => (bool)$is_2fa
            ]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid security request"]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
