# API Reference

The GitHub Repository Management API provides RESTful endpoints for synchronizing, listing, searching, and analyzing GitHub repositories.

## Base URL

```
http://138.197.49.129/api
```

## Interactive Documentation

For interactive API documentation with the ability to try out endpoints, visit:

**[Swagger UI](http://138.197.49.129/api/docs)** (Production) | **[Local](http://138.197.49.129/api/docs)**

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible, subject to rate limiting.

::: tip Future Enhancement
GitHub Personal Access Token support is planned for future releases to increase rate limits and access private repositories.
:::

## Rate Limiting

To prevent abuse, the API implements rate limiting:

- **Limit:** 100 requests per minute per IP address
- **Response Header:** `X-RateLimit-Remaining` shows requests remaining
- **Error:** `429 Too Many Requests` when limit exceeded

## Endpoints Overview

### Repositories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | [`/repositories/sync/:username`](/api/repositories#sync) | Sync GitHub repos for a user |
| `GET` | [`/repositories/list/:username`](/api/repositories#list) | List user repositories |
| `GET` | [`/repositories/search`](/api/repositories#search) | Search repositories by keywords |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | [`/statistics`](/api/statistics) | Get repository statistics |

## Common Response Format

All API responses follow a consistent structure:

### Success Response

```json
{
  "data": [...], // Or direct object for single resources
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "path": "/api/repositories/list/nonexistent",
  "correlationId": "uuid-here"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid parameters |
| `404` | Not Found - Resource doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `502` | Bad Gateway - GitHub API error |

## Pagination

List and search endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```bash
GET /api/repositories/list/octocat?page=2&limit=10
```

**Response includes metadata:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 2,
    "limit": 10,
    "totalPages": 10
  }
}
```

## Error Handling

The API uses standard HTTP status codes and provides detailed error messages:

### Validation Errors (400)

```json
{
  "statusCode": 400,
  "message": [
    "page must be a positive number",
    "limit must be between 1 and 100"
  ],
  "error": "Bad Request"
}
```

### Not Found (404)

```json
{
  "statusCode": 404,
  "message": "User testuser not found",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "path": "/api/repositories/list/testuser"
}
```

### Rate Limit (429)

```json
{
  "statusCode": 429,
  "message": "GitHub API rate limit exceeded",
  "retryAfter": 3600
}
```

## Request IDs

Every request is assigned a unique correlation ID for tracking:

- **Request Header:** Include `x-correlation-id` to set your own ID
- **Response:** Check logs for the correlation ID
- **Logging:** All log entries include the correlation ID

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:

- `http://138.197.49.129`
- `http://localhost:5173`
- `http://localhost:8080`

Additional origins can be configured via the `CORS_ORIGINS` environment variable.

## Examples

### Sync Repositories

```bash
curl -X POST http://138.197.49.129/api/repositories/sync/octocat
```

### List with Pagination

```bash
curl "http://138.197.49.129/api/repositories/list/octocat?page=1&limit=10"
```

### Search

```bash
curl "http://138.197.49.129/api/repositories/search?q=typescript+react&page=1"
```

### Get Statistics

```bash
curl "http://138.197.49.129/api/statistics?user=octocat&topN=10"
```

## Next Steps

- [Repositories API](/api/repositories) - Detailed endpoint documentation
- [Statistics API](/api/statistics) - Statistics endpoint documentation
- [Error Handling](/api/errors) - Complete error reference
