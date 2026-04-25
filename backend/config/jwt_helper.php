<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHelper
{
    private static $secret;
    private static $expiry;

    private static function init()
    {
        if (!isset(self::$secret)) {
            self::$secret = $_ENV['JWT_SECRET'];
            self::$expiry = (int) ($_ENV['JWT_EXPIRE']);
        }
    }

    /**
     * Create a new JWT for a user
     */
    public static function createToken($userId, $userType, $email)
    {
        self::init();

        $issuedAt = time();
        $expireAt = $issuedAt + self::$expiry;

        $payload = [
            'iat' => $issuedAt, // Issued At
            'exp' => $expireAt, // Expiration
            'sub' => $userId,   // Subject
            'data' => [
                'userId' => $userId,
                'userType' => $userType,
                'email' => $email
            ]
        ];

        return JWT::encode($payload, self::$secret, 'HS256');
    }

    /**
     * Validate and decode a JWT
     */
    public static function validateToken($token)
    {
        self::init();
        try {
            $decoded = JWT::decode($token, new Key(self::$secret, 'HS256'));
            return (array) $decoded->data;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Extract token from Authorization header
     */
    public static function getBearerToken()
    {
        $headers = self::getAuthorizationHeader();
        if (!empty($headers)) {
            if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
                return $matches[1];
            }
        }
        return null;
    }

    private static function getAuthorizationHeader()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER['Authorization']);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        return $headers;
    }
}
