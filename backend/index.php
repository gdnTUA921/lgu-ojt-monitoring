<?php
/* ============================================================
   LGU OJT Monitoring System — Central API Router
   ============================================================ */

// Set timezone to Philippine Standard Time (UTC+8)
date_default_timezone_set('Asia/Manila');

// Serve static files (uploads, etc.) directly
$static_patterns = ['/uploads/'];
foreach ($static_patterns as $pattern) {
    if (strpos(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), $pattern) === 0) {
        return false; // Let PHP dev server serve the file
    }
}

// 1. Initial Configurations
require_once __DIR__ . '/config/corsHeader.php';
require_once __DIR__ . '/config/connect_db.php';
require_once __DIR__ . '/config/jwt_helper.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

// 🚀 Helper: Decode JSON payload from the request body
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// 2. Parse the URL and Request Method
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($request_uri, PHP_URL_PATH);

// 3. Role-Based Route Definitions
$routes = [
    // --- Authentication ---
    '/api/auth/login' => 'auth/login.php',
    '/api/auth/logout' => 'auth/logout.php',
    '/api/auth/verify-2fa'      => 'auth/verify_2fa.php',
    '/api/auth/resend-2fa'      => 'auth/resend_2fa.php',
    '/api/auth/forgot-password' => 'auth/forgot_password.php',
    '/api/auth/reset-password'  => 'auth/reset_password.php',

    // --- ADMIN MODULES ---
    '/api/admin/dashboard'            => 'admin/dashboard_stats.php',
    '/api/admin/interns'              => 'admin/interns_list.php',
    '/api/admin/intern-requirements'  => 'admin/requirement_toggle.php',
    '/api/admin/audit-logs'           => 'admin/audit_logs.php',

    // --- SUPERVISOR MODULES ---
    '/api/supervisor/dashboard' => 'supervisor/dashboard_stats.php',
    '/api/supervisor/interns'   => 'supervisor/interns_list.php',

    // --- INTERN MODULES ---
    '/api/intern/dashboard'    => 'intern/dashboard_stats.php',
    '/api/intern/clock-in'     => 'intern/clock_in.php',
    '/api/intern/clock-out'    => 'intern/clock_out.php',
    '/api/intern/clock-status' => 'intern/clock_status.php',

    // --- SHARED / PROFILE ---
    '/api/profile' => 'shared/profile.php',
    '/api/profile/security' => 'shared/security.php',
    '/api/departments' => 'shared/departments.php',
    '/api/timelogs' => 'shared/timelogs_list.php',
    '/api/notifications' => 'shared/notifications.php',
    '/api/notifications/read-all' => 'shared/notifications.php'
];

// 4. Determine if the path matches a route or a dynamic route
$matched_route = null;
$route_id = null;

// Rewriting this section cleanly to allow method checks:
if (preg_match('/^\/api\/admin\/interns\/(\d+)\/status$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'admin/intern_status_update.php';
    $route_id = $matches[1];
} elseif ($path === '/api/admin/users' && $method === 'POST') {
    $matched_route = 'admin/users_create.php';
} elseif ($path === '/api/admin/users' && $method === 'GET') {
    $matched_route = 'admin/users_list.php';
} elseif (preg_match('/^\/api\/admin\/users\/(\d+)$/', $path, $matches) && $method === 'PUT') {
    $matched_route = 'admin/users_update.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/admin\/users\/(\d+)\/toggle-status$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'admin/users_toggle_status.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/notifications\/(\d+)\/read$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'shared/notifications.php';
    $route_id = $matches[1];
} elseif (array_key_exists($path, $routes)) {
    $matched_route = $routes[$path];
} elseif (preg_match('/^\/api\/departments\/(\d+)$/', $path, $matches)) {
    $matched_route = 'shared/departments.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/timelogs\/(\d+)$/', $path, $matches) && $method === 'GET') {
    $matched_route = 'shared/timelog_detail.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/supervisor\/timelogs\/(\d+)\/dispute$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'supervisor/timelog_dispute.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/interns\/(\d+)\/requirements$/', $path, $matches)) {
    $matched_route = 'shared/intern_requirements.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/documents\/(\d+)\/status$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'shared/document_status.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/interns\/(\d+)\/terminate$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'shared/intern_terminate.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/interns\/(\d+)\/complete$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'shared/intern_complete.php';
    $route_id = $matches[1];
} elseif ($path === '/api/document-types' && in_array($method, ['GET', 'POST'])) {
    $matched_route = 'admin/document_types.php';
} elseif (preg_match('/^\/api\/document-types\/(\d+)$/', $path, $matches) && $method === 'PUT') {
    $matched_route = 'admin/document_types.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/document-types\/(\d+)\/toggle-active$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'admin/document_types.php';
    $route_id = $matches[1];

// --- Activities (Supervisor) ---
} elseif ($path === '/api/supervisor/activities' && in_array($method, ['GET', 'POST'])) {
    $matched_route = 'supervisor/activities.php';
} elseif (preg_match('/^\/api\/supervisor\/activities\/(\d+)$/', $path, $matches) && $method === 'PUT') {
    $matched_route = 'supervisor/activities.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/supervisor\/activities\/(\d+)\/toggle$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'supervisor/activities.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/supervisor\/activities\/(\d+)\/submissions$/', $path, $matches) && $method === 'GET') {
    $matched_route = 'supervisor/activity_submissions.php';
    $route_id = $matches[1];
} elseif (preg_match('/^\/api\/supervisor\/submissions\/(\d+)$/', $path, $matches) && $method === 'PATCH') {
    $matched_route = 'supervisor/activity_submissions.php';
    $route_id = $matches[1];

// --- Activities (Intern) ---
} elseif ($path === '/api/intern/activities' && $method === 'GET') {
    $matched_route = 'intern/activities.php';
} elseif (preg_match('/^\/api\/intern\/activities\/(\d+)\/submit$/', $path, $matches) && $method === 'POST') {
    $matched_route = 'intern/activities.php';
    $route_id = $matches[1];

// --- File download (role-agnostic, authenticated) ---
} elseif (preg_match('/^\/api\/files\/(\d+)\/download$/', $path, $matches) && $method === 'GET') {
    $matched_route = 'shared/submission_download.php';
    $route_id = $matches[1];
}

// 4. Middleware: Permission & Role Checks
$is_auth_route = str_starts_with($path, '/api/auth/');
$is_admin_route = str_starts_with($path, '/api/admin/');
$is_supervisor_route = str_starts_with($path, '/api/supervisor/');
$is_intern_route = str_starts_with($path, '/api/intern/');
$is_profile_route = str_starts_with($path, '/api/profile');

// Default user state is null
$user = null;

// Only enforce middleware if the endpoint exists and isn't a login/auth path
if ($matched_route && !$is_auth_route) {
    // 🔒 Authenticate (returns user data or exits with 401)
    $user = AuthMiddleware::authenticate();

    // 🛡️ Automatic Role Protection (e.g. Only interns can access intern routes)
    if ($is_admin_route) {
        AuthMiddleware::checkRole($user, 'admin');
    } elseif ($is_supervisor_route) {
        AuthMiddleware::checkRole($user, 'supervisor');
    } elseif ($is_intern_route) {
        AuthMiddleware::checkRole($user, 'intern');
    }
    // Shared profile routes just need the user to be authenticated
}

// 5. Router Execution
if ($matched_route) {
    $file = __DIR__ . '/api/' . $matched_route;

    if (file_exists($file)) {
        require_once $file;
    } else {
        http_response_code(501);
        echo json_encode(["status" => "error", "message" => "Endpoint Logic Missing: " . $matched_route]);
    }
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Invalid Route: " . $path]);
}