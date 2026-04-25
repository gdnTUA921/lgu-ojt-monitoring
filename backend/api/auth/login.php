<?php
// backend/api/auth/login.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

function sendOtpEmail(string $toEmail, string $toName, string $otp_code): void {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = getenv('MAIL_USER') ?: ($_ENV['MAIL_USER'] ?? '');
    $mail->Password   = getenv('MAIL_PASS') ?: ($_ENV['MAIL_PASS'] ?? '');
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;
    $mail->setFrom(
        getenv('MAIL_FROM') ?: ($_ENV['MAIL_FROM'] ?? 'noreply@mandaluyong.gov.ph'),
        getenv('MAIL_NAME') ?: ($_ENV['MAIL_NAME'] ?? 'Mandaluyong City Hall')
    );
    $mail->addAddress($toEmail, $toName);
    $mail->isHTML(true);
    $mail->Subject = 'Your Login Verification Code';

    $digits = str_split($otp_code);
    $digitBoxes = '';
    foreach ($digits as $d) {
        $digitBoxes .= '<span style="display:inline-block;width:42px;height:52px;line-height:52px;text-align:center;font-size:28px;font-weight:700;background:#F3F3F7;border-radius:8px;border:1px solid #C6C6CA;color:#003B72;margin:0 4px;">' . $d . '</span>';
    }

    $mail->Body = '
        <div style="font-family:\'Inter\',Arial,sans-serif;background:#F3F3F7;padding:40px 20px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border-top:6px solid #003B72;box-shadow:0 8px 24px rgba(25,28,30,.08);">
            <h2 style="color:#003B72;margin-top:0;font-size:22px;">Two-Factor Verification</h2>
            <p style="color:#424751;font-size:15px;line-height:1.6;">Hello ' . htmlspecialchars($toName) . ',</p>
            <p style="color:#424751;font-size:15px;line-height:1.6;">Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
            <div style="text-align:center;margin:28px 0;">' . $digitBoxes . '</div>
            <div style="background:#FFF8E1;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
              <p style="margin:0;color:#78350F;font-size:13px;">If you did not attempt to log in, please ignore this email and consider changing your password.</p>
            </div>
            <p style="color:#424751;font-size:13px;margin:0;">Best regards,<br><strong style="color:#003B72;">Mandaluyong City Hall Admin Team</strong></p>
          </div>
        </div>
    ';
    $mail->AltBody = "Your verification code is: $otp_code. It expires in 10 minutes. If you did not attempt to log in, ignore this email.";
    $mail->send();
}

try {
    $email    = $input['email']    ?? null;
    $password = $input['password'] ?? null;

    // 1. Fetch user by email (include is_active)
    $stmt = $pdo->prepare("SELECT user_id, email, password, user_type, is_active, is_2fa_enabled FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $db_user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$db_user || !password_verify($password, $db_user['password'])) {
        http_response_code(401);
        echo json_encode(["status" => "failed", "message" => "Invalid email or password"]);
        exit;
    }

    if (!$db_user['is_active']) {
        http_response_code(403);
        echo json_encode(["status" => "failed", "message" => "Your account has been deactivated. Contact an administrator."]);
        exit;
    }

    // 2. Fetch full profile (role-specific id included via r.*)
    $role  = $db_user['user_type'];
    $table = ($role === 'admin') ? 'admins' : (($role === 'supervisor') ? 'supervisors' : 'interns');
    $stmt  = $pdo->prepare("
        SELECT u.user_id, u.email, u.user_type, u.is_2fa_enabled, r.*
        FROM users u
        LEFT JOIN $table r ON u.user_id = r.user_id
        WHERE u.user_id = ?
    ");
    $stmt->execute([$db_user['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 3. Audit + last_login update
    $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES (?, 'LOGIN', 'AUTH', 'Logged in successfully', ?)")
        ->execute([$user['user_id'], $_SERVER['REMOTE_ADDR'] ?? null]);
    $pdo->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?")
        ->execute([$user['user_id']]);

    // 4. 2FA branch
    if ($user['is_2fa_enabled']) {
        $otp_code   = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        // Invalidate any prior unused OTPs for this user
        $pdo->prepare("UPDATE otp SET is_used = 1 WHERE user_id = ? AND purpose = '2fa' AND is_used = 0")
            ->execute([$user['user_id']]);

        $pdo->prepare("INSERT INTO otp (user_id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, '2fa', ?)")
            ->execute([$user['user_id'], $user['email'], $otp_code, $expires_at]);

        $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
        try {
            sendOtpEmail($user['email'], $name ?: $user['email'], $otp_code);
        } catch (Exception $e) {
            // Email failure is non-fatal; OTP is stored in DB
        }

        echo json_encode([
            "status"       => "success",
            "requires_2fa" => true,
            "user_id"      => (int)$user['user_id'],
            "message"      => "Verification code sent to your email."
        ]);
        exit;
    }

    // 5. No 2FA — issue token directly
    $token = JWTHelper::createToken($user['user_id'], $user['user_type'], $user['email']);
    echo json_encode([
        "status"  => "success",
        "message" => "Login successful",
        "token"   => $token,
        "user"    => $user
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error"]);
}
