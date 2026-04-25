<?php
// backend/api/shared/profile.php

try {
    $current_user_id = $user['userId'];
    $role = $user['userType'];

    if ($method === 'GET') {
        // 1. Fetch from users and role-specific table
        $table = '';
        if ($role === 'admin')
            $table = 'admins';
        elseif ($role === 'supervisor')
            $table = 'supervisors';
        elseif ($role === 'intern')
            $table = 'interns';
        
        if (!$table) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid user role for profile access."]);
            exit;
        }

        $query = "
            SELECT u.email, u.user_type, u.is_2fa_enabled, r.*
            FROM users u
            LEFT JOIN $table r ON u.user_id = r.user_id
            WHERE u.user_id = ?
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$current_user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(["status" => "success", "profile" => $profile]);
    } elseif ($method === 'POST' || $method === 'PUT') {
        // 2. Update profile details or Photo
        $table = '';
        if ($role === 'admin') $table = 'admins';
        elseif ($role === 'supervisor') $table = 'supervisors';
        elseif ($role === 'intern') $table = 'interns';

        if (!$table) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid user role for profile update."]);
            exit;
        }
        $upload_dir = __DIR__ . '/../../uploads/avatars/';

        // Ensure directory exists
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        // --- Handle File Upload (Profile Picture) ---
        if (isset($_FILES['pfpic'])) {
            $file = $_FILES['pfpic'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png'];

            if (!in_array($ext, $allowed)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Only JPG and PNG files are allowed."]);
                exit;
            }

            $filename = "user_" . $current_user_id . "_" . time() . "." . $ext;
            $target = $upload_dir . $filename;

            if (move_uploaded_file($file['tmp_name'], $target)) {
                $stmt = $pdo->prepare("UPDATE $table SET pfpic = ? WHERE user_id = ?");
                $stmt->execute(["uploads/avatars/" . $filename, $current_user_id]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to save profile photo. Check directory permissions."]);
                exit;
            }
        }

        // --- Handle Text Fields (via $_POST if multi-part, or $input if JSON) ---
        $data = !empty($_POST) ? $_POST : $input;

        if (isset($data['first_name'])) {
            $first_name = $data['first_name'] ?? '';
            $last_name = $data['last_name'] ?? '';
            $middle_name = $data['middle_name'] ?? '';
            $contact_num = $data['contact_num'] ?? '';

            // Update role-specific table
            $stmt = $pdo->prepare("
                UPDATE $table 
                SET first_name = ?, last_name = ?, middle_name = ?, contact_num = ? 
                WHERE user_id = ?
            ");
            $stmt->execute([$first_name, $last_name, $middle_name, $contact_num, $current_user_id]);
        }

        // Create notification
        $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INFO')");
        $stmt->execute([
            $current_user_id,
            "Profile Updated",
            "Your profile details have been successfully updated."
        ]);

        // Fetch updated user to return
        $stmt = $pdo->prepare("
            SELECT u.user_id, u.email, u.user_type, r.first_name, r.last_name, r.middle_name, r.contact_num, r.pfpic
            FROM users u
            LEFT JOIN $table r ON u.user_id = r.user_id
            WHERE u.user_id = ?
        ");
        $stmt->execute([$current_user_id]);
        $updated_user = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success",
            "message" => "Profile updated successfully",
            "user" => $updated_user
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
