# API Design Rules

## General Principles

1.  **Consistency**: All APIs should follow the same response structure and naming conventions.
2.  **Performance**: APIs returning lists must support pagination to avoid loading too much data.

## Rules

### 1. Pagination for "Get List" APIs

**Rule**: All APIs that fetch a list of entities (e.g., Users, Products, Orders) MUST implement pagination.

**Reason**:
- Prevents performance issues when the dataset grows.
- Reduces memory usage on both server and client.
- Improves response time.

**Implementation Details**:
- **Request Parameters**:
    - `page` (default: 1)
    - `limit` (default: 10 or 20)
    - `search` (optional keyword)
- **Response Structure**:
    The `data` field in the standard response should contain:
    ```json
    {
      "code": 200,
      "message": "Success",
      "data": {
        "items": [...], // Array of entities
        "total": 100,   // Total count of records matching the query
        "page": 1,      // Current page
        "totalPages": 10 // Total pages based on limit
      }
    }
    ```
    *(Note: Key names like `items` vs `employees` vs `customers` may vary, but the structure must include meta data)*.

### 2. Caching Strategy for Lists

**Rule**: Cached lists must include pagination parameters in the key.

**Example**:
- **Bad**: `redis.set('employees:list', data)`
- **Good**: `redis.set(employees:list:${page}:${limit}:${search}, data)`

**Invalidation**:
- When a record is added/updated/deleted, you must invalidate related cache keys.
- **Strategy**: Clear all keys matching the pattern (e.g., `employees:list:*`) or use a shorter TTL.
