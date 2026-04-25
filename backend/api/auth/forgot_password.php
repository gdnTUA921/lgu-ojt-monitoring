<?php
// backend/api/auth/forgot_password.php
// POST /api/auth/forgot-password — { email }
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../../vendor/autoload.php';

function sendPasswordResetEmail(string $toEmail, string $toName, string $otp_code): void {
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
    $mail->Subject = 'Password Reset Code — LGU OJT Monitor';

    $digits = str_split($otp_code);
    $digitBoxes = '';
    foreach ($digits as $d) {
        $digitBoxes .= '<span style="display:inline-block;width:42px;height:52px;line-height:52px;text-align:center;font-size:28px;font-weight:700;background:#F3F3F7;border-radius:8px;border:1px solid #C6C6CA;color:#003B72;margin:0 4px;">' . $d . '</span>';
    }

    $mail->Body = '
        <div style="font-family:\'Inter\',Arial,sans-serif;background:#F3F3F7;padding:40px 20px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border-top:6px solid #003B72;box-shadow:0 8px 24px rgba(25,28,30,.08);">
            <h2 style="color:#003B72;margin-top:0;font-size:22px;">Password Reset Request</h2>
            <p style="color:#424751;font-size:15px;line-height:1.6;">Hello ' . htmlspecialchars($toName) . ',</p>
            <p style="color:#424751;font-size:15px;line-height:1.6;">We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.</p>
            <div style="text-align:center;margin:28px 0;">' . $digitBoxes . '</div>
            <div style="background:#FFF8E1;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
              <p style="margin:0;color:#78350F;font-size:13px;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
            </div>
            <p style="color:#6E7481;font-size:12px;margin-bottom:0;">LGU OJT Monitoring System &mdash; City of Mandaluyong</p>
          </div>
        </div>';
    $mail->AltBody = "Your password reset code is: $otp_code. It expires in 10 minutes. If you did not request this, ignore this email.";

    $mail->send();
}

try {
    $email = trim($input['email'] ?? '');

    if (!$email) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email is required."]);
        exit;
    }

    // Look up user — always return success to avoid email enumeration
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.email, u.is_active,
               COALESCE(a.first_name, s.first_name, i.first_name) AS first_name,
               COALESCE(a.last_name, s.last_name, i.last_name) AS last_name
        FROM users u
        LEFT JOIN admins a ON u.user_id = a.user_id
        LEFT JOIN supervisors s ON u.user_id = s.user_id
        LEFT JOIN interns i ON u.user_id = i.user_id
        WHERE u.email = ?
    ");
    $stmt->execute([$email]);
    $account = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($account && $account['is_active']) {
        // Rate limit: block if a reset OTP was sent in the last 60 seconds
        $rate_stmt = $pdo->prepare("
            SELECT created_at FROM otp
            WHERE user_id = ? AND purpose = 'password_reset' AND is_used = 0
            ORDER BY created_at DESC LIMIT 1
        ");
        $rate_stmt->execute([$account['user_id']]);
        $last = $rate_stmt->fetchColumn();

        if ($last && (time() - strtotime($last)) < 60) {
            http_response_code(429);
            echo json_encode(["status" => "error", "message" => "Please wait before requesting another reset code."]);
            exit;
        }

        $otp_code   = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        $name       = trim(($account['first_name'] ?? '') . ' ' . ($account['last_name'] ?? ''));

        // Invalidate old reset OTPs for this user
        $pdo->prepare("UPDATE otp SET is_used = 1 WHERE user_id = ? AND purpose = 'password_reset' AND is_used = 0")
            ->execute([$account['user_id']]);

        // Insert new OTP
        $pdo->prepare("INSERT INTO otp (user_id, email, otp_code, purpose, expires_at) VALUES (?, ?, ?, 'password_reset', ?)")
            ->execute([$account['user_id'], $email, $otp_code, $expires_at]);

        sendPasswordResetEmail($email, $name ?: $email, $otp_code);
    }

    // Always return success — don't reveal whether the email exists
    echo json_encode(["status" => "success", "message" => "If that email is registered, a reset code has been sent."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to send reset email. Please try again."]);
}
