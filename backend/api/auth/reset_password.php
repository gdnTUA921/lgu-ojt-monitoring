<?php
// backend/api/auth/reset_password.php
// POST /api/auth/reset-password — { email, otp_code, new_password }

try {
    $email        = trim($input['email'] ?? '');
    $otp_code     = trim($input['otp_code'] ?? '');
    $new_password = $input['new_password'] ?? '';

    if (!$email || !$otp_code || !$new_password) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email, OTP code, and new password are required."]);
        exit;
    }

    // Password strength
    if (
        strlen($new_password) < 8 ||
        !preg_match('/[a-z]/', $new_password) ||
        !preg_match('/[A-Z]/', $new_password) ||
        !preg_match('/[0-9]/', $new_password) ||
        !preg_match('/[^a-zA-Z0-9]/', $new_password)
    ) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol."]);
        exit;
    }

    // Look up user
    $user_stmt = $pdo->prepare("SELECT user_id, is_active FROM users WHERE email = ?");
    $user_stmt->execute([$email]);
    $account = $user_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$account || !$account['is_active']) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid request."]);
        exit;
    }

    // Validate OTP
    $otp_stmt = $pdo->prepare("
        SELECT otp_id FROM otp
        WHERE user_id = ? AND otp_code = ? AND purpose = 'password_reset'
          AND is_used = 0 AND expires_at > NOW()
        LIMIT 1
    ");
    $otp_stmt->execute([$account['user_id'], $otp_code]);
    $otp = $otp_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otp) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid or expired reset code."]);
        exit;
    }

    $pdo->beginTransaction();

    // Mark OTP as used
    $pdo->prepare("UPDATE otp SET is_used = 1 WHERE otp_id = ?")
        ->execute([$otp['otp_id']]);

    // Update password
    $hashed = password_hash($new_password, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?")
        ->execute([$hashed, $account['user_id']]);

    // Notify user
    $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'WARNING')")
        ->execute([
            $account['user_id'],
            "Password Reset Successful",
            "Your password was reset successfully. If you did not do this, contact support immediately."
        ]);

    $pdo->commit();

    echo json_encode(["status" => "success", "message" => "Password reset successfully. You can now log in."]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
