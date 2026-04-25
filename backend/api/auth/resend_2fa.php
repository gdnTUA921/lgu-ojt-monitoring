<?php
// backend/api/auth/resend_2fa.php
// POST /api/auth/resend-2fa  — { user_id }
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../../vendor/autoload.php';

function sendOtpEmailResend(string $toEmail, string $toName, string $otp_code): void {
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
    $mail->Subject = 'Your New Verification Code';

    $digits = str_split($otp_code);
    $digitBoxes = '';
    foreach ($digits as $d) {
        $digitBoxes .= '<span style="display:inline-block;width:42px;height:52px;line-height:52px;text-align:center;font-size:28px;font-weight:700;background:#F3F3F7;border-radius:8px;border:1px solid #C6C6CA;color:#003B72;margin:0 4px;">' . $d . '</span>';
    }

    $mail->Body = '
        <div style="font-family:\'Inter\',Arial,sans-serif;background:#F3F3F7;padding:40px 20px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border-top:6px solid #003B72;box-shadow:0 8px 24px rgba(25,28,30,.08);">
            <h2 style="color:#003B72;margin-top:0;font-size:22px;">New Verification Code</h2>
            <p style="color:#424751;font-size:15px;line-height:1.6;">Hello ' . htmlspecialchars($toName) . ',</p>
            <p style="color:#424751;font-size:15px;line-height:1.6;">Here is your new verification code. It expires in <strong>10 minutes</strong>.</p>
            <div style="text-align:center;margin:28px 0;">' . $digitBoxes . '</div>
            <div style="background:#FFF8E1;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
              <p style="margin:0;color:#78350F;font-size:13px;">If you did not request this, please ignore this email and consider changing your password.</p>
            </div>
            <p style="color:#424751;font-size:13px;margin:0;">Best regards,<br><strong style="color:#003B72;">Mandaluyong City Hall Admin Team</strong></p>
          </div>
        </div>
    ';
    $mail->AltBody = "Your new verification code is: $otp_code. It expires in 10 minutes.";
    $mail->send();
}

try {
    $user_id = $input['user_id'] ?? null;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing user_id."]);
        exit;
    }

    // Fetch user — must have 2FA enabled and be active
    $stmt = $pdo->prepare("SELECT user_id, email, is_2fa_enabled, is_active FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$u || !$u['is_active'] || !$u['is_2fa_enabled']) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Cannot resend code."]);
        exit;
    }

    // Rate-limit: block if a valid OTP was sent within the last 60 seconds
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM otp
        WHERE user_id = ? AND purpose = '2fa' AND is_used = 0
          AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
    ");
    $stmt->execute([$user_id]);
    if ((int)$stmt->fetchColumn() > 0) {
        http_response_code(429);
        echo json_encode(["status" => "error", "message" => "Please wait before requesting another code."]);
        exit;
    }

    // Fetch name from role-specific table
    $role_stmt = $pdo->prepare("SELECT user_type FROM users WHERE user_id = ?");
    $role_stmt->execute([$user_id]);
    $role  = $role_stmt->fetchColumn();
    $table = ($role === 'admin') ? 'admins' : (($role === 'supervisor') ? 'supervisors' : 'interns');

    $name_stmt = $pdo->prepare("SELECT first_name, last_name FROM $table WHERE user_id = ?");
    $name_stmt->execute([$user_id]);
    $profile = $name_stmt->fetch(PDO::FETCH_ASSOC);
    $name = trim(($profile['first_name'] ?? '') . ' ' . ($profile['last_name'] ?? ''));

    // Invalidate old OTPs and generate a new one
    $pdo->prepare("UPDATE otp SET is_used = 1 WHERE user_id = ? AND purpose = '2fa' AND is_used = 0")
        ->execute([$user_id]);

    $otp_code   = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    $pdo->prepare("INSERT INTO otp (user_id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, '2fa', ?)")
        ->execute([$user_id, $u['email'], $otp_code, $expires_at]);

    try {
        sendOtpEmailResend($u['email'], $name ?: $u['email'], $otp_code);
    } catch (Exception $e) {
        // Non-fatal — OTP is stored in DB
    }

    echo json_encode(["status" => "success", "message" => "A new code has been sent to your email."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error"]);
}
