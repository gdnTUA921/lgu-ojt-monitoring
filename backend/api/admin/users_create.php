<?php
// backend/api/admin/users_create.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../../vendor/autoload.php';

try {
    if (empty($input['email']) || empty($input['user_type'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing required fields."]);
        exit;
    }

    // Validation: Intern's supervisor must belong to the selected department and map the correct foreign key
    if ($input['user_type'] === 'intern' && !empty($input['supervisor_id'])) {
        $supStmt = $pdo->prepare("SELECT supervisor_id, department_id FROM supervisors WHERE user_id = ?");
        $supStmt->execute([$input['supervisor_id']]);
        $supData = $supStmt->fetch(PDO::FETCH_ASSOC);

        if (!$supData) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid supervisor selected."]);
            exit;
        }

        if (!empty($input['department_id']) && $supData['department_id'] != $input['department_id']) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid assignment: The selected supervisor does not belong to the specified department."]);
            exit;
        }

        // Extremely important: Map the payload user_id into the physical table supervisor_id
        $input['supervisor_id'] = $supData['supervisor_id'];
    }

    $pdo->beginTransaction();

    // 1. Insert into users table
    $raw_password = empty($input['password']) ? 'ChangeMe@123!' : $input['password'];
    $hashed_password = password_hash($raw_password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)");
    $stmt->execute([$input['email'], $hashed_password, $input['user_type']]);
    $user_id = $pdo->lastInsertId();

    // 2. Insert into specific role table
    $role = $input['user_type'];
    if ($role === 'intern') {
        $stmt = $pdo->prepare("INSERT INTO interns (user_id, first_name, middle_name, last_name, contact_num, department_id, supervisor_id, school, required_hours, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $user_id,
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null,
            empty($input['department_id']) ? null : $input['department_id'],
            empty($input['supervisor_id']) ? null : $input['supervisor_id'],
            $input['school'] ?? null,
            empty($input['required_hours']) ? null : $input['required_hours'],
            empty($input['start_date']) ? null : $input['start_date']
        ]);
    } else if ($role === 'supervisor') {
        $stmt = $pdo->prepare("INSERT INTO supervisors (user_id, first_name, middle_name, last_name, contact_num, department_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $user_id,
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null,
            empty($input['department_id']) ? null : $input['department_id']
        ]);
    } else if ($role === 'admin') {
        $stmt = $pdo->prepare("INSERT INTO admins (user_id, first_name, middle_name, last_name, contact_num) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $user_id,
            $input['first_name'] ?? null,
            $input['middle_name'] ?? null,
            $input['last_name'] ?? null,
            $input['contact_num'] ?? null
        ]);
    }

    $pdo->commit();

    // Audit Log 
    $admin_id = $user['userId'] ?? null;
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, module, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $auditStmt->execute([$admin_id, 'REGISTER_USER', 'User Management', 'Registered a new ' . $input['user_type'] . ': ' . $input['email'], $ip, $ua]);

    // Add In-App Notification for the new user
    $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'SUCCESS')");
    $notifStmt->execute([
        $user_id,
        "Welcome to the Mandaluyong OJT Monitoring System!",
        "Your account has been successfully created. Please explore your dashboard and complete any pending profile details."
    ]);

    // 3. Send out Welcome Email using PHPMailer
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        // Load credentials from .env
        $mail->Username = getenv('MAIL_USER') ?: ($_ENV['MAIL_USER'] ?? '');
        $mail->Password = getenv('MAIL_PASS') ?: ($_ENV['MAIL_PASS'] ?? '');
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom(getenv('MAIL_FROM') ?: $_ENV['MAIL_FROM'] ?: 'noreply@mandaluyong.gov.ph', getenv('MAIL_NAME') ?: $_ENV['MAIL_NAME'] ?: 'Mandaluyong City Hall');

        $name_for_email = trim(($input['first_name'] ?? '') . ' ' . ($input['last_name'] ?? 'User'));
        $mail->addAddress($input['email'], $name_for_email);

        $mail->isHTML(true);
        $mail->Subject = 'Welcome to LGU OJT Monitoring System';
        $mail->Body = '
            <div style="font-family: \'Inter\', Arial, sans-serif; background-color: #F3F3F7; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 30px; border-radius: 8px; border-top: 6px solid #003B72; box-shadow: 0px 8px 24px rgba(25, 28, 30, 0.08);">
                    <h2 style="color: #003B72; margin-top: 0; font-size: 24px;">Welcome to the LGU OJT Monitoring System!</h2>
                    <p style="color: #191C1E; font-size: 16px; line-height: 1.5;">Hello ' . htmlspecialchars($name_for_email) . ',</p>
                    <p style="color: #424751; font-size: 16px; line-height: 1.5;">Your account has been successfully registered by an administrator. You can now log in using the credentials below:</p>
                    
                    <div style="background-color: #F9F9FD; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #E2E2E6;">
                        <p style="margin: 0 0 12px 0; font-size: 16px; color: #191C1E;"><strong>Email:</strong> <span style="color: #003B72;">' . htmlspecialchars($input['email']) . '</span></p>
                        <p style="margin: 0; font-size: 16px; color: #191C1E;"><strong>Password:</strong> <span style="font-family: monospace; background: #E7E8EB; padding: 4px 8px; border-radius: 4px; color: #191C1E; font-weight: 600; letter-spacing: 0.5px;">' . htmlspecialchars($raw_password) . '</span></p>
                    </div>
                    
                    <div style="background-color: #FFDAD6; padding: 15px; border-radius: 6px; border-left: 4px solid #BA1A1A; margin-bottom: 25px;">
                        <p style="margin: 0; color: #93000A; font-weight: bold; font-size: 15px; line-height: 1.4;">
                            IMPORTANT: Please log in and change your password immediately to secure your account!
                        </p>
                    </div>
                    
                    <p style="color: #424751; font-size: 15px; margin-bottom: 0;">Best regards,<br><strong style="color: #003B72;">Mandaluyong City Hall Admin Team</strong></p>
                </div>
            </div>
        ';
        // Non-HTML Fallback
        $mail->AltBody = "Hello {$name_for_email},\n\nYour account has been registered. Log in with Email: {$input['email']}, Password: {$raw_password}\n\nPlease change this password ASAP!\n\nBest, Mandaluyong City Hall Admin Team.";

        $mail->send();
    } catch (Exception $e) {
        // Mail failed, but we still consider creation successful. Could log it here.
    }

    echo json_encode([
        "status" => "success",
        "message" => "User created successfully. Welcome email sent.",
        "user_id" => $user_id
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>