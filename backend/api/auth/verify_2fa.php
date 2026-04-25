<?php
// backend/api/auth/verify_2fa.php
// POST /api/auth/verify-2fa  — { user_id, otp_code }

try {
    $user_id  = $input['user_id']  ?? null;
    $otp_code = $input['otp_code'] ?? null;

    if (!$user_id || !$otp_code) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing user_id or otp_code."]);
        exit;
    }

    // 1. Validate OTP — not used, not expired, correct code
    $stmt = $pdo->prepare("
        SELECT otp_id FROM otp
        WHERE user_id = ? AND otp_code = ? AND purpose = '2fa'
          AND is_used = 0 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$user_id, $otp_code]);
    $otp = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otp) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid or expired verification code."]);
        exit;
    }

    // 2. Mark OTP as used
    $pdo->prepare("UPDATE otp SET is_used = 1 WHERE otp_id = ?")
        ->execute([$otp['otp_id']]);

    // 3. Fetch user + role profile
    $stmt = $pdo->prepare("SELECT user_type, email, is_active FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$u || !$u['is_active']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Account not found or deactivated."]);
        exit;
    }

    $role  = $u['user_type'];
    $table = ($role === 'admin') ? 'admins' : (($role === 'supervisor') ? 'supervisors' : 'interns');

    $stmt = $pdo->prepare("
        SELECT u.user_id, u.email, u.user_type, u.is_2fa_enabled, r.*
        FROM users u
        LEFT JOIN $table r ON u.user_id = r.user_id
        WHERE u.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 4. Audit log
    $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES (?, '2FA_VERIFIED', 'AUTH', '2FA verification successful', ?)")
        ->execute([$user_id, $_SERVER['REMOTE_ADDR'] ?? null]);

    // 5. Issue token
    $token = JWTHelper::createToken($user['user_id'], $user['user_type'], $user['email']);

    echo json_encode([
        "status"  => "success",
        "message" => "Verification successful.",
        "token"   => $token,
        "user"    => $user
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error"]);
}
