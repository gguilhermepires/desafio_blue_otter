# Repositories API

Endpoints for synchronizing, listing, and searching GitHub repositories.

## Base Path

```
/api/repositories
```

## Endpoints

### Sync Repositories

Synchronizes all public repositories for a GitHub user to the local database.

**Endpoint:**
```
POST /sync/:username
```

**Parameters:**

| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| username | string | path | Yes | GitHub username |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/repositories/sync/octocat
```

**Success Response (201):**
```json
{
  "count": 8,
  "timestamp": "2025-01-11T10:00:00.000Z",
  "username": "octocat"
}
```

**Error Responses:**

- **404 Not Found:** User doesn't exist on GitHub
```json
{
  "statusCode": 404,
  "message": "GitHub user 'nonexistent' not found",
  "timestamp": "2025-01-11T10:00:00.000Z"
}
```

- **429 Too Many Requests:** GitHub API rate limit exceeded
```json
{
  "statusCode": 429,
  "message": "GitHub API rate limit exceeded",
  "retryAfter": 3600
}
```

---

### List Repositories

Lists all synchronized repositories for a user with pagination.

**Endpoint:**
```
GET /list/:username
```

**Parameters:**

| Name | Type | Location | Required | Default | Description |
|------|------|----------|----------|---------|-------------|
| username | string | path | Yes | - | GitHub username |
| page | number | query | No | 1 | Page number |
| limit | number | query | No | 20 | Items per page (max 100) |

**Example Request:**
```bash
curl "http://localhost:3000/api/repositories/list/octocat?page=1&limit=10"
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "githubId": 1296269,
      "name": "Hello-World",
      "fullName": "octocat/Hello-World",
      "owner": "octocat",
      "description": "My first repository on GitHub!",
      "url": "https://github.com/octocat/Hello-World",
      "language": "JavaScript",
      "stargazersCount": 1500,
      "forksCount": 800,
      "openIssuesCount": 5,
      "watchersCount": 1500,
      "createdAt": "2011-01-26T19:01:12.000Z",
      "updatedAt": "2025-01-10T15:30:00.000Z",
      "pushedAt": "2025-01-09T12:00:00.000Z",
      "size": 1024,
      "hasIssues": true,
      "hasProjects": true,
      "hasDownloads": true,
      "hasWiki": true,
      "hasPages": false,
      "archived": false,
      "disabled": false,
      "visibility": "public",
      "defaultBranch": "main",
      "syncedAt": "2025-01-11T09:00:00.000Z"
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Error Responses:**

- **404 Not Found:** No repositories found for user
```json
{
  "statusCode": 404,
  "message": "No repositories found for user 'octocat'",
  "timestamp": "2025-01-11T10:00:00.000Z"
}
```

- **400 Bad Request:** Invalid query parameters
```json
{
  "statusCode": 400,
  "message": [
    "page must be a positive number",
    "limit must not be greater than 100"
  ],
  "error": "Bad Request"
}
```

---

### Search Repositories

Search repositories by keywords across name, description, and programming language.

**Endpoint:**
```
GET /search
```

**Parameters:**

| Name | Type | Location | Required | Default | Description |
|------|------|----------|----------|---------|-------------|
| q | string | query | Yes | - | Search query (keywords) |
| page | number | query | No | 1 | Page number |
| limit | number | query | No | 20 | Items per page (max 100) |
| user | string | query | No | - | Filter by GitHub username |

**Search Behavior:**
- Full-text search across name, description, and language
- Case-insensitive
- Multiple keywords supported (space-separated)
- Results ranked by relevance

**Example Requests:**

Simple search:
```bash
curl "http://localhost:3000/api/repositories/search?q=typescript"
```

Multiple keywords:
```bash
curl "http://localhost:3000/api/repositories/search?q=typescript+react"
```

Filter by user:
```bash
curl "http://localhost:3000/api/repositories/search?q=api&user=octocat"
```

With pagination:
```bash
curl "http://localhost:3000/api/repositories/search?q=javascript&page=2&limit=10"
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "typescript-starter",
      "fullName": "octocat/typescript-starter",
      "owner": "octocat",
      "description": "A TypeScript starter template",
      "language": "TypeScript",
      "stargazersCount": 250,
      "forksCount": 50,
      "url": "https://github.com/octocat/typescript-starter"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "query": "typescript"
  }
}
```

**Error Responses:**

- **400 Bad Request:** Missing or invalid query
```json
{
  "statusCode": 400,
  "message": [
    "q should not be empty",
    "q must be a string"
  ],
  "error": "Bad Request"
}
```

---

## Repository Object

Full repository object structure:

```typescript
interface Repository {
  id: number;                  // Local database ID
  githubId: number;            // GitHub repository ID
  name: string;                // Repository name
  fullName: string;            // Owner/name format
  owner: string;               // GitHub username
  description: string | null;  // Repository description
  url: string;                 // GitHub URL
  language: string | null;     // Primary language
  stargazersCount: number;     // Stars count
  forksCount: number;          // Forks count
  openIssuesCount: number;     // Open issues count
  watchersCount: number;       // Watchers count
  createdAt: Date;             // Created timestamp
  updatedAt: Date;             // Last updated timestamp
  pushedAt: Date | null;       // Last push timestamp
  size: number;                // Repository size in KB
  hasIssues: boolean;          // Issues enabled
  hasProjects: boolean;        // Projects enabled
  hasDownloads: boolean;       // Downloads enabled
  hasWiki: boolean;            // Wiki enabled
  hasPages: boolean;           // GitHub Pages enabled
  archived: boolean;           // Is archived
  disabled: boolean;           // Is disabled
  visibility: string;          // public/private
  defaultBranch: string;       // Default branch name
  syncedAt: Date;              // Last sync timestamp
}
```

## Rate Limiting

All repository endpoints are subject to:
- **API Rate Limit:** 100 requests/minute per IP
- **GitHub Rate Limit:** 60 requests/hour (unauthenticated)

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641902400
```

## Common Use Cases

### Initial Sync
```bash
# Sync user's repositories
curl -X POST http://localhost:3000/api/repositories/sync/octocat

# List synced repositories
curl http://localhost:3000/api/repositories/list/octocat
```

### Search and Filter
```bash
# Find TypeScript projects
curl "http://localhost:3000/api/repositories/search?q=typescript"

# Find React + TypeScript projects
curl "http://localhost:3000/api/repositories/search?q=react+typescript"

# Search within specific user
curl "http://localhost:3000/api/repositories/search?q=api&user=octocat"
```

### Pagination
```bash
# Get page 2 with 50 items
curl "http://localhost:3000/api/repositories/list/octocat?page=2&limit=50"

# Search with custom page size
curl "http://localhost:3000/api/repositories/search?q=python&page=1&limit=100"
```

## Next Steps

- [Statistics API](/api/statistics)
- [Error Handling](/api/errors)
- [Getting Started](/getting-started)
