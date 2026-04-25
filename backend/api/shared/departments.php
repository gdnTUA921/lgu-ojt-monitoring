<?php
// backend/api/shared/departments.php

// This endpoint is used by both Admin UI and Intern registration
// Supports GET (list/singular), POST (create), PUT (update), DELETE

try {
    switch ($method) {
        case 'GET':
            if ($route_id) {
                // Fetch single department
                $stmt = $pdo->prepare("SELECT * FROM departments WHERE department_id = :id");
                $stmt->execute([':id' => $route_id]);
                $dept = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($dept) {
                    echo json_encode(["status" => "success", "department" => $dept]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Department not found"]);
                }
            } else {
                // Fetch all departments
                $sort = $_GET['sort'] ?? 'name';
                $order_sql = "ORDER BY department_name ASC";
                
                if ($sort === 'newest') {
                    $order_sql = "ORDER BY created_at DESC";
                } elseif ($sort === 'oldest') {
                    $order_sql = "ORDER BY created_at ASC";
                }

                $stmt = $pdo->query("SELECT * FROM departments $order_sql");
                $depts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode(["status" => "success", "departments" => $depts]);
            }
            break;

        case 'POST':
            // Create new department
            $name = $input['department_name'] ?? null;
            if (!$name) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Department name is required"]);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO departments (department_name) VALUES (:name)");
            $stmt->execute([':name' => $name]);
            
            echo json_encode([
                "status" => "success", 
                "message" => "Department created", 
                "department_id" => $pdo->lastInsertId()
            ]);
            break;

        case 'PUT':
            // Update existing department
            if (!$route_id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Department ID is required in URL"]);
                exit;
            }

            $name = $input['department_name'] ?? null;
            if (!$name) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Department name is required"]);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE departments SET department_name = :name WHERE department_id = :id");
            $stmt->execute([':name' => $name, ':id' => $route_id]);
            
            echo json_encode(["status" => "success", "message" => "Department updated"]);
            break;

        case 'DELETE':
            // Delete department
            if (!$route_id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Department ID is required in URL"]);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM departments WHERE department_id = :id");
            $stmt->execute([':id' => $route_id]);
            
            echo json_encode(["status" => "success", "message" => "Department deleted"]);
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