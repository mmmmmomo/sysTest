# File Management System

A complete file management system with user authentication, role-based access control, and a premium UI.

## Features

-   **User Authentication**: Register and Login with JWT.
-   **Role-Based Access**:
    -   **User**: Can upload, list, download, and delete their own files.
    -   **Admin**: Can view all files, download/delete any file, and manage users.
-   **File Management**: Upload, List, Download, Delete.
-   **Premium UI**: Modern dark mode design with glassmorphism effects.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    cd server && npm install
    cd ../client && npm install
    ```

2.  **Start Project (Both Client & Server)**:
    ```bash
    npm run dev
    ```
    - Server: `http://localhost:3000`
    - Client: `http://localhost:5173`

## Default Admin Credentials

-   **Username**: `admin`
-   **Password**: `admin123`

## Tech Stack

-   **Frontend**: React, Vite, Vanilla CSS (Premium Design).
-   **Backend**: Node.js, Express.
-   **Database**: SQLite.
-   **Auth**: JWT, Bcrypt.
