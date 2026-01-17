# API Contract Documentation

This document outlines the current API endpoints and their expected request/response structures.

---

## Endpoints

### 1. GET `/shifts`

**Description:** Retrieves a list of the 10 most recent shifts for the authenticated tenant.

**Authentication:** Required (JWT)

**Request:**
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <token>`

**Response:**
*   **Status:** `200 OK`
*   **Body:** `application/json`
    ```json
    [
      {
        "id": 1,
        "driver_name": "John Doe",
        "truck_name": "Truck A",
        "status": "finished",
        "created_at": "2023-10-27T10:00:00.000Z",
        "photo_start_url": "https://example.com/photos/shift_start_1.jpg",
        "photo_end_url": "https://example.com/photos/shift_end_1.jpg",
        "photo_invoice_url": null
      },
      {
        "id": 2,
        "driver_name": "Jane Smith",
        "truck_name": "Truck B",
        "status": "active",
        "created_at": "2023-10-27T11:30:00.000Z",
        "photo_start_url": "https://example.com/photos/shift_start_2.jpg",
        "photo_end_url": null,
        "photo_invoice_url": null
      }
    ]
    ```
*   **Error Statuses:**
    *   `401 Unauthorized`: If no valid JWT token is provided.
    *   `500 Internal Server Error`: For unexpected server errors.

---

### 2. GET `/tenant/settings`

**Description:** Retrieves the settings for the authenticated tenant, including company name, timezone, and invoice requirement.

**Authentication:** Required (JWT)

**Request:**
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <token>`

**Response:**
*   **Status:** `200 OK`
*   **Body:** `application/json`
    ```json
    {
      "name": "My Company Inc.",
      "timezone": "Europe/Moscow",
      "invoice_required": true
    }
    ```
*   **Error Statuses:**
    *   `401 Unauthorized`: If no valid JWT token is provided.
    *   `404 Not Found`: If the tenant settings cannot be found (should not happen with valid authentication).
    *   `500 Internal Server Error`: For unexpected server errors.

---

### 3. GET `/dashboard/stats`

**Description:** Retrieves dashboard statistics for the authenticated tenant, including active shifts, active drivers, and resource usage against plan limits.

**Authentication:** Required (JWT)

**Request:**
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <token>`

**Response:**
*   **Status:** `200 OK`
*   **Body:** `application/json`
    ```json
    {
      "activeShifts": 5,
      "activeDrivers": 3,
      "usage": {
        "trucks": { "current": 10, "limit": 20 },
        "drivers": { "current": 8, "limit": 15 },
        "sites": { "current": 4, "limit": 10 }
      }
    }
    ```
*   **Error Statuses:**
    *   `401 Unauthorized`: If no valid JWT token is provided.
    *   `404 Not Found`: If the tenant is not found.
    *   `500 Internal Server Error`: For unexpected server errors.

---

### Other Endpoints (Summarized)

*   **GET `/health`**: Public health check.
*   **GET `/shifts/current`**: Current active shift for a driver.
*   **GET `/trucks`**: List of available trucks.
*   **GET `/sites`**: List of available sites.
*   **POST `/shifts/start`**: Start a new shift via PWA.
*   **POST `/shifts/end`**: End an active shift via PWA.
*   **POST `/auth/login`**: User login, returns JWT token.
*   **POST `/users`**: Create a new user (admin only).
*   **GET `/reports/excel`**: Generate and download an Excel report of finished shifts.
*   **GET `/reports/photos`**: Get shifts with photo URLs.
*   **POST `/users/set-menu-id`**: Update last menu message ID for a user.
*   **GET `/users`**: List all users for the tenant.
*   **GET `/audit`**: List audit logs for the tenant.
*   **POST `/auth/onboard`**: Onboard a new tenant and admin user.
*   **GET `/admin/stats`**: Admin panel statistics.
*   **PATCH `/sites/:id`**: Update site settings (e.g., photo requirements).
*   **POST `/trucks`**: Add a new truck.
*   **PATCH `/tenant/settings`**: Update tenant-level settings (e.g., timezone, invoice requirement).
*   **GET `/reports/export`**: Export shift data as JSON.
