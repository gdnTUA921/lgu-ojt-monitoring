# 🏛️ LGU OJT Monitoring System

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![PHP](https://img.shields.io/badge/php-%23777BB4.svg?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)

A comprehensive web-based OJT (On-the-Job Training) Monitoring System designed for Local Government Units. It streamlines internship workflows with role-based dashboards, geolocation-aware attendance tracking, multi-file activity submissions, and document compliance management. Features secure JWT authentication and 2FA for robust data protection.

---

## ✨ Key Features

### 🛡️ General Security & Architecture
- **JWT Authentication:** Secure API communication using JSON Web Tokens.
- **Two-Factor Authentication (2FA):** Email-based OTP verification for enhanced security via PHPMailer.
- **Dynamic File Handling:** Automatic directory generation for multi-part file uploads (activity submissions & avatars) up to 50MB.

### 👑 Admin Features
- **Centralized Dashboard:** View real-time statistics on active interns, supervisors, and document compliance.
- **Account Management:** Create, update, and toggle account statuses for Supervisors and Interns.
- **Audit Logs:** Comprehensive tracking of critical system actions (e.g., grading, clock-ins, file uploads).
- **Document Management:** Define and toggle required compliance documents (MOA, Resume, etc.).

### 👔 Supervisor Features
- **Intern Management:** View assigned interns, their contact details, and current progress status.
- **Activity Hub:** Assign tasks to interns, toggle late submission acceptance, and grade submitted files.
- **Attendance Oversight:** Review intern timelogs and resolve attendance disputes.

### 🎓 Intern Features
- **Geolocation Time-Tracking:** Clock-in and Clock-out functionality using `react-leaflet` to verify the intern's location.
- **Activity Submissions:** Upload up to 10 files per activity assignment with progress tracking.
- **Compliance Portal:** Upload and track the status (Pending, Approved, Rejected) of required onboarding documents.
- **Profile Customization:** Update personal details and upload profile avatars.

---

## 🛠️ Technology Stack

**Frontend:**
- **[React 19](https://react.dev/)** - UI Library
- **[Vite 6](https://vitejs.dev/)** - Build Tool & Development Server
- **[React Router DOM](https://reactrouter.com/)** - Client-side routing
- **[Leaflet](https://leafletjs.com/)** - Interactive maps for attendance geolocation

**Backend:**
- **[PHP 8+](https://www.php.net/)** - Core REST API logic using PDO
- **[Firebase JWT](https://github.com/firebase/php-jwt)** - Token generation and validation
- **[PHPMailer](https://github.com/PHPMailer/PHPMailer)** - SMTP email delivery for 2FA and notifications
- **[vlucas/phpdotenv](https://github.com/vlucas/phpdotenv)** - Environment variable management

**Database:**
- **MySQL / MariaDB** - Relational data storage

---

## 📂 Project Structure

```text
lgu-ojt-monitoring/
├── backend/                  # PHP REST API Server
│   ├── api/                  # Route handlers categorized by role
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── intern/
│   │   ├── shared/
│   │   └── supervisor/
│   ├── config/               # Database and CORS configurations
│   ├── middleware/           # Role checks and JWT validation
│   ├── uploads/              # Dynamic storage for avatars and submissions (Git-ignored)
│   ├── index.php             # Central API Router
│   └── composer.json         # PHP dependencies
├── frontend/                 # React Vite Application
│   ├── src/
│   │   ├── components/       # Reusable UI elements (Sidebar, Maps, etc.)
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── layouts/          # Dashboard wrappers
│   │   ├── pages/            # Role-specific dashboard views
│   │   └── services/         # Axios/Fetch API configurations
│   └── vite.config.js
├── migrations/               # Database schemas and seed data
└── SETUP.md                  # Detailed installation guide
```

---

## 🚀 Installation & Setup

For a complete step-by-step guide on how to install dependencies, set up the database, and run the development servers, please refer to the **[Project Setup Guide (SETUP.md)](./SETUP.md)**.

**Quick Start TL;DR:**
1. Import `migrations/lgu-monitoring-schema.sql` and `migrations/seed-data.sql` into MySQL.
2. In `/backend`, copy `.env.example` to `.env` and run `composer install`.
3. In `/backend`, run: `php -S localhost:8000 -d upload_max_filesize=50M -d post_max_size=60M index.php`
4. In `/frontend`, run `npm install` and `npm run dev`.

---

## 🔑 Test Accounts

Default password for all seed accounts is: `password`

| Role | Email |
| :--- | :--- |
| **Admin** | `admin@mandaluyong.gov.ph` |
| **Supervisor** | `supervisor@demo.com` |
| **Intern** | `intern@demo.com` |

---

*Built with ❤️ for Local Government Units to modernize internship management.*
