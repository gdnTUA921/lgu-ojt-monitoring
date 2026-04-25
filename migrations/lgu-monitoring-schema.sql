-- =========================================
-- LGU OJT MONITORING SYSTEM DATABASE
-- =========================================

DROP DATABASE IF EXISTS lgu_ojt_monitoring;

CREATE DATABASE IF NOT EXISTS lgu_ojt_monitoring;
USE lgu_ojt_monitoring;

-- =========================================
-- USERS (WITH 2FA SUPPORT)
-- =========================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('admin','intern','supervisor') NOT NULL,

    -- 2FA SETTINGS
    is_2fa_enabled BOOLEAN DEFAULT FALSE,

    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- DEPARTMENTS
-- =========================================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- ADMINS
-- =========================================
CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    contact_num VARCHAR(50),
    pfpic VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================
-- SUPERVISORS
-- =========================================
CREATE TABLE supervisors (
    supervisor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    department_id INT,
    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    contact_num VARCHAR(50),
    pfpic VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- =========================================
-- INTERNS
-- =========================================
CREATE TABLE interns (
    intern_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    supervisor_id INT,
    department_id INT,

    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    contact_num VARCHAR(50),
    school VARCHAR(255),

    required_hours INT NOT NULL,
    status ENUM('incomplete','complete','terminated') DEFAULT 'incomplete',

    start_date DATE,
    end_date DATE,

    pfpic VARCHAR(255),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- =========================================
-- TIMELOGS
-- =========================================
CREATE TABLE timelogs (
    timelog_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,

    -- GEOLOCATION
    time_in_latitude DECIMAL(9,6) NULL,
    time_in_longitude DECIMAL(9,6) NULL,
    time_out_latitude DECIMAL(9,6) NULL,
    time_out_longitude DECIMAL(9,6) NULL,

    is_disputed   BOOLEAN DEFAULT FALSE,
    disputed_by   INT NULL,
    disputed_at   DATETIME NULL,
    dispute_reason VARCHAR(255) NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (disputed_by) REFERENCES users(user_id),

    UNIQUE(user_id, date)
);

-- =========================================
-- OTP (USED FOR LOGIN, 2FA, VERIFICATION)
-- =========================================
CREATE TABLE otp (
    otp_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    email VARCHAR(255),

    otp_code VARCHAR(10),
    purpose ENUM('login','2fa','email_verification','password_reset') DEFAULT '2fa',

    expires_at DATETIME,
    is_used BOOLEAN DEFAULT FALSE,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================
-- DOCUMENT TYPES (DYNAMIC REQUIREMENTS)
-- =========================================
CREATE TABLE document_types (
    document_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE, -- Allows "retiring" requirements
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- DOCUMENTS (ADMIN-VERIFIED REQUIREMENTS)
-- =========================================
CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    intern_id INT NOT NULL,
    document_type_id INT NOT NULL,

    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    verified_at DATETIME NULL,

    FOREIGN KEY (intern_id) REFERENCES interns(intern_id),
    FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id),

    UNIQUE(intern_id, document_type_id)
);

-- =========================================
-- REPORTS (WORKSHEET / ACTIVITY SUBMISSIONS)
-- =========================================
CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    intern_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,

    submitted_by INT NOT NULL,

    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    remarks TEXT,

    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (intern_id) REFERENCES interns(intern_id),
    FOREIGN KEY (submitted_by) REFERENCES users(user_id)
);

-- =========================================
-- ACTIVITIES (SUPERVISOR-ASSIGNED WORK)
-- =========================================
CREATE TABLE activities (
    activity_id   INT AUTO_INCREMENT PRIMARY KEY,
    supervisor_id INT NOT NULL,

    title       VARCHAR(255) NOT NULL,
    description TEXT,
    due_date    DATETIME NULL,

    is_graded    BOOLEAN DEFAULT TRUE,
    is_active    BOOLEAN DEFAULT TRUE,
    accept_late  BOOLEAN DEFAULT FALSE,
    target_type  ENUM('all', 'specific') DEFAULT 'all',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supervisor_id) REFERENCES supervisors(supervisor_id)
);

CREATE TABLE activity_targets (
    activity_id INT NOT NULL,
    intern_id   INT NOT NULL,
    PRIMARY KEY (activity_id, intern_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE,
    FOREIGN KEY (intern_id)   REFERENCES interns(intern_id)   ON DELETE CASCADE
);

-- =========================================
-- ACTIVITY SUBMISSIONS (INTERN UPLOADS)
-- =========================================
CREATE TABLE activity_submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id   INT NOT NULL,
    intern_id     INT NOT NULL,

    comments  TEXT NULL,

    status   ENUM('submitted','graded') DEFAULT 'submitted',
    grade    VARCHAR(50) NULL,
    feedback TEXT NULL,

    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graded_at    DATETIME NULL,

    UNIQUE (activity_id, intern_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (intern_id)   REFERENCES interns(intern_id)
);

CREATE TABLE activity_submission_files (
    file_id       INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    file_size     INT NOT NULL,
    mime_type     VARCHAR(100),
    FOREIGN KEY (submission_id) REFERENCES activity_submissions(submission_id) ON DELETE CASCADE
);

-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================
-- AUDIT LOGS (SYSTEM ACTIVITY TRACKING)
-- =========================================
CREATE TABLE audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, 
    action VARCHAR(255) NOT NULL, 
    module VARCHAR(100) NOT NULL, 
    details TEXT, 
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);