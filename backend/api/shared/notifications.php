<?php
// backend/api/shared/notifications.php

try {
    // Current authenticated user
    $current_user_id = $user['userId'];

    switch ($method) {
        case 'GET':
            // Count unread notifications if requested
            if (isset($_GET['unread_count'])) {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
                $stmt->execute([$current_user_id]);
                echo json_encode(["status" => "success", "unread_count" => (int)$stmt->fetchColumn()]);
                exit;
            }

            // List notifications for current user
            $stmt = $pdo->prepare("
                SELECT * FROM notifications 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            ");
            $stmt->execute([$current_user_id]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(["status" => "success", "notifications" => $notifications]);
            break;

        case 'PATCH':
            // mark-all-read vs single mark-read
            if (str_ends_with($path, '/read-all')) {
                $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
                $stmt->execute([$current_user_id]);
                echo json_encode(["status" => "success", "message" => "All notifications marked as read"]);
            } elseif (preg_match('/\/notifications\/(\d+)\/read$/', $path, $matches)) {
                $noti_id = $matches[1];
                $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?");
                $stmt->execute([$noti_id, $current_user_id]);
                echo json_encode(["status" => "success", "message" => "Notification marked as read"]);
            } else {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Endpoint not found"]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
