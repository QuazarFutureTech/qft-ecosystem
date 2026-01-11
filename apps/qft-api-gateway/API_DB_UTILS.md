# QFT API Gateway: Database Utility Endpoints

These endpoints allow admin users to manage database tables and row-level (JSONB) data directly via the API. All routes require admin RBAC and authentication.

---

## Table Management

### Check Table Existence
- **GET** `/api/database/admin/db-table/:table`
- **Response:** `{ success: true, result }`

### Create Table
- **POST** `/api/database/admin/db-table/:table`
- **Body:** `{ createSQL: "CREATE TABLE ..." }`
- **Response:** `{ success: true, result }`

### Delete Table
- **DELETE** `/api/database/admin/db-table/:table`
- **Response:** `{ success: true, result }`

---

## Row/JSONB (Subtable) Management

### Get Row/Config (JSONB)
- **GET** `/api/database/admin/db-subtable/:table/:key`
- **Response:** `{ success: true, result }`

### Set Row/Config (JSONB)
- **PUT** `/api/database/admin/db-subtable/:table/:key`
- **Body:** `{ value: <object or string> }`
- **Response:** `{ success: true, result }`

### Delete Row/Config (JSONB)
- **DELETE** `/api/database/admin/db-subtable/:table/:key`
- **Response:** `{ success: true, result }`

---

## Notes
- All endpoints require admin authentication and RBAC.
- Use these endpoints for advanced DB management, migrations, or recovery.
- For safety, only use `createSQL` with trusted input.
- These endpoints are for internal/admin use only and should not be exposed to regular users.

---

For more details, see the implementation in `src/routes/database.js` and `src/services/databaseService.js`.
