<?php
// backend/middleware/AuthMiddleware.php

class AuthMiddleware
{
    /**
     * 🔒 Protects a route. Returns user data or exits with 401.
     */
    public static function authenticate()
    {
        $token = JWTHelper::getBearerToken();

        if (!$token) {
            self::errorResponse("Authentication required", 401);
        }

        $decodedData = JWTHelper::validateToken($token);
        if (!$decodedData) {
            self::errorResponse("Invalid or expired token", 401);
        }

        return (array) $decodedData;
    }

    /**
     * 🛡️ Role-based check (Extra protection!)
     */
    public static function checkRole($user, $requiredRole)
    {
        if ($user['userType'] !== $requiredRole) {
            self::errorResponse("Access denied: " . $requiredRole . " only", 403);
        }
    }

    private static function errorResponse($message, $code)
    {
        http_response_code($code);
        echo json_encode(["status" => "error", "message" => $message]);
        exit;
    }
}
