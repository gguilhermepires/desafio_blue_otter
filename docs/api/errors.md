# Error Handling

Complete reference for API error responses and error codes.

## Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "path": "/api/repositories/list/nonexistent",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string \| string[] | Error message(s) |
| error | string | Error type/name |
| timestamp | string | ISO 8601 timestamp |
| path | string | Request path that caused the error |
| correlationId | string | UUID for log tracing |

## HTTP Status Codes

### 2xx Success

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |

### 4xx Client Errors

| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Name | Description |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | GitHub API error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Common Errors

### 400 Bad Request

**Cause:** Invalid or missing required parameters

**Example:**
```json
{
  "statusCode": 400,
  "message": [
    "page must be a positive number",
    "limit must be between 1 and 100",
    "q should not be empty"
  ],
  "error": "Bad Request"
}
```

**Solutions:**
- Validate input parameters
- Check parameter types and ranges
- Ensure required fields are provided

---

### 404 Not Found

**Cause:** Resource doesn't exist

**User Not Found:**
```json
{
  "statusCode": 404,
  "message": "GitHub user 'nonexistent' not found",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "path": "/api/repositories/sync/nonexistent"
}
```

**No Repositories:**
```json
{
  "statusCode": 404,
  "message": "No repositories found for user 'testuser'",
  "timestamp": "2025-01-11T10:00:00.000Z",
  "path": "/api/repositories/list/testuser"
}
```

**Solutions:**
- Verify username exists on GitHub
- Sync user's repositories first
- Check if user has public repositories

---

### 429 Too Many Requests

**Cause:** Rate limit exceeded

**API Rate Limit:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

**GitHub Rate Limit:**
```json
{
  "statusCode": 429,
  "message": "GitHub API rate limit exceeded. Resets at 2025-01-11T11:00:00Z",
  "retryAfter": 3600,
  "resetTime": "2025-01-11T11:00:00.000Z"
}
```

**Solutions:**
- Wait for rate limit reset
- Implement exponential backoff
- Use GitHub Personal Access Token for higher limits
- Cache responses client-side

**Rate Limits:**
- **API:** 100 requests/minute per IP
- **GitHub:** 60 requests/hour (unauthenticated), 5000/hour (authenticated)

---

### 500 Internal Server Error

**Cause:** Unexpected server error

**Example:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Solutions:**
- Check server logs with correlationId
- Report issue if problem persists
- Retry request after a delay

---

### 502 Bad Gateway

**Cause:** GitHub API is unavailable or returned an error

**Example:**
```json
{
  "statusCode": 502,
  "message": "Failed to fetch data from GitHub API",
  "error": "Bad Gateway"
}
```

**Solutions:**
- Check GitHub's status page
- Retry request after a delay
- Implement retry logic with exponential backoff

---

### 503 Service Unavailable

**Cause:** Service temporarily unavailable (maintenance, overload)

**Example:**
```json
{
  "statusCode": 503,
  "message": "Service temporarily unavailable",
  "error": "Service Unavailable",
  "retryAfter": 60
}
```

**Solutions:**
- Wait and retry after specified time
- Check service status
- Implement circuit breaker pattern

## Validation Errors

### Request Parameter Validation

**Missing Required Field:**
```json
{
  "statusCode": 400,
  "message": ["q should not be empty"],
  "error": "Bad Request"
}
```

**Invalid Type:**
```json
{
  "statusCode": 400,
  "message": [
    "page must be a number conforming to the specified constraints",
    "page must be a positive number"
  ],
  "error": "Bad Request"
}
```

**Out of Range:**
```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 100"],
  "error": "Bad Request"
}
```

### Validation Rules

**Pagination:**
- `page`: Must be ≥ 1
- `limit`: Must be 1-100

**Search:**
- `q`: Required, non-empty string
- `topN`: Must be 1-100

**Username:**
- Must be valid GitHub username format

## Error Handling Best Practices

### Client-Side

**1. Parse Error Response:**
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    // Handle based on statusCode
  }
  const data = await response.json();
} catch (error) {
  console.error('Network Error:', error);
}
```

**2. Handle Specific Status Codes:**
```typescript
async function handleApiRequest(url: string) {
  const response = await fetch(url);

  switch (response.status) {
    case 200:
    case 201:
      return response.json();

    case 400:
      const validation = await response.json();
      throw new ValidationError(validation.message);

    case 404:
      throw new NotFoundError('Resource not found');

    case 429:
      const retry = await response.json();
      throw new RateLimitError(retry.retryAfter);

    case 500:
    case 502:
    case 503:
      throw new ServerError('Server error, please retry');

    default:
      throw new Error(`Unexpected error: ${response.status}`);
  }
}
```

**3. Implement Retry Logic:**
```typescript
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  delayMs = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
}
```

**4. Rate Limit Handling:**
```typescript
class RateLimitedClient {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  async request(url: string) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const response = await fetch(url);
          if (response.status === 429) {
            const error = await response.json();
            const retryAfter = error.retryAfter || 60;
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            return this.request(url);
          }
          resolve(await response.json());
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task?.();
      await new Promise(r => setTimeout(r, 100)); // Rate limit spacing
    }
    this.processing = false;
  }
}
```

### Server-Side Logging

All errors are logged with correlation IDs for tracing:

```sql
-- Query logs by correlation ID
SELECT * FROM "Log"
WHERE "correlationId" = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY timestamp DESC;
```

## Debugging Tips

### Using Correlation IDs

1. **Copy correlation ID** from error response
2. **Search logs** using the correlation ID
3. **Trace full request** flow

### Common Issues

**"User not found"**
- Verify username on github.com
- Check for typos
- Ensure user has public profile

**"No repositories found"**
- User may have no public repositories
- Try syncing first with `/sync/:username`
- Check if repositories were deleted

**"Rate limit exceeded"**
- Wait for reset time (check response)
- Reduce request frequency
- Consider authentication for higher limits

**"GitHub API error"**
- Check https://www.githubstatus.com/
- Retry after a delay
- GitHub may be experiencing issues

## HTTP Headers

### Request Headers

```http
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```
Set custom correlation ID for request tracing

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641902400
```

Rate limit information

## Next Steps

- [API Reference](/api/)
- [Repositories API](/api/repositories)
- [Statistics API](/api/statistics)
- [Troubleshooting](/troubleshooting)
