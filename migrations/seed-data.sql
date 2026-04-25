-- =========================================
-- LGU OJT MONITORING SYSTEM SEED DATA
-- =========================================

USE lgu_ojt_monitoring;

-- Clear existing data safely to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM timelogs;
DELETE FROM documents;
DELETE FROM document_types;
DELETE FROM interns;
DELETE FROM supervisors;
DELETE FROM admins;
DELETE FROM users;
DELETE FROM departments;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. SEED DEPARTMENTS
INSERT INTO departments (department_id, department_name) VALUES 
(1, 'Information Technology Division'),
(2, 'Human Resource Management'),
(3, 'Mayor\'s office');

-- 2. SEED USERS (Password: 'password' - Hashed)
-- Admin
INSERT INTO users (user_id, email, password, user_type) VALUES 
(1, 'admin@mandaluyong.gov.ph', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Supervisor
INSERT INTO users (user_id, email, password, user_type) VALUES 
(2, 'supervisor@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'supervisor');

-- Intern
INSERT INTO users (user_id, email, password, user_type) VALUES 
(3, 'intern@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'intern');

-- 3. SEED ADMIN PROFILE
-- Explicitly setting admin_id to 1
INSERT INTO admins (admin_id, user_id, first_name, middle_name, last_name, contact_num) VALUES 
(1, 1, 'Super', 'System', 'Admin', '0917-000-0000');

-- 4. SEED SUPERVISOR PROFILE
-- Explicitly setting supervisor_id to 1
INSERT INTO supervisors (supervisor_id, user_id, department_id, first_name, middle_name, last_name, contact_num) VALUES 
(1, 2, 1, 'Mark', 'Tan', 'Reyes', '0918-111-2222');

-- 5. SEED INTERN PROFILE
-- Now correctly linking to supervisor_id = 1
INSERT INTO interns (user_id, supervisor_id, department_id, first_name, middle_name, last_name, contact_num, school, required_hours, status, start_date) VALUES 
(3, 1, 1, 'Maria', 'Dela Cruz', 'Santos', '0919-333-4444', 'Polytechnic University of the Philippines', 480, 'incomplete', '2026-04-01');

-- 6. SEED DOCUMENT REQUIREMENTS
INSERT INTO document_types (document_type_id, name, description, is_required, is_active) VALUES 
(1, 'Resume / CV', 'Latest professional curriculum vitae.', 1, 1),
(2, 'Memorandum of Agreement', 'Standard MOA signed by the university and LGU.', 1, 1),
(3, 'Endorsement Letter', 'Official endorsement from the Dean of Studies.', 1, 1),
(4, 'Medical Certificate', 'Clearance for work from a licensed physician.', 0, 1),
(5, 'Vaccination Card', 'Proof of COVID-19 vaccination.', 0, 0);
