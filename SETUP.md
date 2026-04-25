# Project Setup Guide

This guide will walk you through the process of setting up and running the **LGU OJT Monitoring System** on your local machine.

---

## 1. Prerequisites (Software Installation)

### A. Node.js (for React Frontend)
The frontend is built with React and Vite, which require Node.js.
1. Go to the [Node.js Official Website](https://nodejs.org/).
2. Download the **LTS (Long Term Support)** version for your operating system.
3. Run the installer and follow the instructions.
4. Verify the installation by running these commands in your terminal:
   ```bash
   node -v
   npm -v
   ```

### B. Standalone PHP (for Server & Commands)
While XAMPP includes PHP, we recommend downloading a **standalone PHP binary** to run the development server and manage packages more easily from the terminal.

1. **Download:**
   - **Windows:** Go to [PHP for Windows](https://windows.php.net/download/) and download the **VS16 x64 Thread Safe** Zip. Extract it to a folder (e.g., `C:\php`).
   - **Mac:** Install via [Homebrew](https://brew.sh/): `brew install php`.
2. **Environment Path (Windows):** Add your PHP folder (e.g., `C:\php`) to your system's "Environment Variables" (PATH) so you can run `php` from any terminal.
3. **Verify:** Open a terminal and type:
   ```bash
   php -v
   ```

### C. Composer (Dependency Manager)
Composer is the tool that downloads the necessary backend packages (like **PHPMailer**, **Dotenv**, and **JWT**).
1. Download and run the **[Composer-Setup.exe](https://getcomposer.org/Composer-Setup.exe)**.
2. During installation, it will ask for the path to your `php.exe`. Point it to your **standalone PHP** folder.
3. **Verify:** Open a terminal and type:
   ```bash
   composer -v
   ```

### D. XAMPP (for MySQL Database)
We use XAMPP primarily for its **MySQL/MariaDB** database and the **phpMyAdmin** dashboard.
1. Download and install [XAMPP](https://www.apachefriends.org/).
2. You only need to start the **MySQL** module in the XAMPP Control Panel.

---

## 2. Database Configuration

1. Open your MySQL management tool (like phpMyAdmin or MySQL Workbench).
2. Create a new database named `lgu_ojt_monitoring`.
3. Import the SQL files located in the migrations folder:
   - First, import `migrations/lgu-monitoring-schema.sql`.
   - Then, import `migrations/seed-data.sql` (optional, for initial data).

---

## 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. **Configure Environment Variables:**
   - Create a file named `.env` in the `backend/` folder.
   - Ensure your database credentials match:
     ```env
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_NAME=lgu_ojt_monitoring
     DB_USER=your_username
     DB_PASSWORD=your_password
     ```
3. **Install Dependencies (Mandatory):**
   The backend relies on external libraries (PHPMailer, JWT, etc.) stored in the `vendor/` folder. If this folder is missing or you just cloned the project, you **must** run:
   ```bash
   composer install
   ```
4. **Run the Backend Server:**
    ```bash
    php -S localhost:8000 -d upload_max_filesize=50M -d post_max_size=60M index.php
    ```
    *Note: The `-d` flags are used to increase the file upload limit to 50MB and the POST body size to 60MB, allowing interns to upload larger documents and activities.*

---

## 4. Frontend Setup

1. Open a new terminal window/tab.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Run the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   The frontend will now be running (usually at `http://localhost:5173`).

## 5. Running the Application

After installation, follow these steps to start the application:

### Start Frontend
Open a terminal and run:
```bash
cd frontend
npm run dev
```

### Start Backend
Open a second terminal and run:
```bash
cd backend
php -S localhost:8000 -d upload_max_filesize=50M -d post_max_size=60M index.php
```

### Explanation of the Backend Command
When starting the backend, we use specific flags to ensure the server behaves correctly:
- **`-S localhost:8000`**: Starts the built-in PHP development server on port 8000.
- **`-d upload_max_filesize=50M`**: Overrides your local PHP configuration to allow files up to 50MB to be uploaded (essential for activity submissions).
- **`-d post_max_size=60M`**: Increases the total allowed size of a form submission. This should always be slightly larger than the `upload_max_filesize`.
- **`index.php`**: Points the server to our central router file, which handles all incoming API requests.

---

## 6. Sample Accounts for Testing

Use these credentials to test the different roles in the system. The default password for all seed accounts is `password`.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@mandaluyong.gov.ph` | `password` |
| **Supervisor** | `supervisor@demo.com` | `password` |
| **Intern** | `intern@demo.com` | `password` |

---

## Troubleshooting
- **CORS Issues:** Ensure the `backend/config/corsHeader.php` is correctly configured to allow requests from your frontend URL (default is `http://localhost:5173`).
- **Port Conflict:** If a port is already in use, you can change the port in the command (e.g., `php -S localhost:8001 -d upload_max_filesize=50M -d post_max_size=60M index.php`).
