# Statistics API

Endpoint for generating statistical insights and analytics from repository data.

## Base Path

```
/api/statistics
```

## Endpoint

### Get Repository Statistics

Generates comprehensive statistics from all synchronized repositories.

**Endpoint:**
```
GET /
```

**Parameters:**

| Name | Type | Location | Required | Default | Description |
|------|------|----------|----------|---------|-------------|
| user | string | query | No | - | Filter by GitHub username |
| topN | number | query | No | 10 | Number of top results (max 100) |

**Example Requests:**

All repositories:
```bash
curl "http://localhost:3000/api/statistics?topN=10"
```

Specific user:
```bash
curl "http://localhost:3000/api/statistics?user=octocat&topN=5"
```

**Success Response (200):**
```json
{
  "totalRepositories": 150,
  "totalStars": 5420,
  "totalForks": 1230,
  "totalIssues": 85,
  "languageDistribution": [
    {
      "language": "TypeScript",
      "count": 45,
      "percentage": 30.0
    },
    {
      "language": "JavaScript",
      "count": 38,
      "percentage": 25.3
    },
    {
      "language": "Python",
      "count": 25,
      "percentage": 16.7
    },
    {
      "language": "Go",
      "count": 15,
      "percentage": 10.0
    },
    {
      "language": null,
      "count": 27,
      "percentage": 18.0
    }
  ],
  "topRepositoriesByStars": [
    {
      "name": "awesome-project",
      "owner": "octocat",
      "stars": 1500,
      "language": "TypeScript",
      "url": "https://github.com/octocat/awesome-project"
    },
    {
      "name": "popular-lib",
      "owner": "johndoe",
      "stars": 850,
      "language": "JavaScript",
      "url": "https://github.com/johndoe/popular-lib"
    }
  ],
  "topUsers": [
    {
      "username": "octocat",
      "repositoryCount": 35,
      "totalStars": 2500,
      "totalForks": 600
    },
    {
      "username": "johndoe",
      "repositoryCount": 28,
      "totalStars": 1800,
      "totalForks": 400
    }
  ],
  "repositoriesOverTime": [
    {
      "month": "2024-01",
      "count": 12
    },
    {
      "month": "2024-02",
      "count": 15
    },
    {
      "month": "2024-03",
      "count": 18
    }
  ],
  "averageStarsPerRepository": 36.13,
  "averageForksPerRepository": 8.20,
  "timestamp": "2025-01-11T10:00:00.000Z"
}
```

## Response Fields

### Overall Statistics

| Field | Type | Description |
|-------|------|-------------|
| totalRepositories | number | Total number of repositories |
| totalStars | number | Sum of all stars |
| totalForks | number | Sum of all forks |
| totalIssues | number | Sum of all open issues |
| averageStarsPerRepository | number | Average stars across all repos |
| averageForksPerRepository | number | Average forks across all repos |
| timestamp | string | When statistics were generated |

### Language Distribution

Array of programming language statistics:

```typescript
interface LanguageStats {
  language: string | null;  // Programming language (null for no language)
  count: number;            // Number of repositories
  percentage: number;       // Percentage of total repositories
}
```

**Sorted by:** Count (descending)

### Top Repositories

Array of most starred repositories:

```typescript
interface TopRepository {
  name: string;      // Repository name
  owner: string;     // Owner username
  stars: number;     // Star count
  language: string;  // Primary language
  url: string;       // GitHub URL
}
```

**Sorted by:** Stars (descending)
**Limited by:** `topN` parameter (default: 10)

### Top Users

Array of most active/popular users:

```typescript
interface TopUser {
  username: string;       // GitHub username
  repositoryCount: number; // Number of repositories
  totalStars: number;     // Total stars across all repos
  totalForks: number;     // Total forks across all repos
}
```

**Sorted by:** Total stars (descending)
**Limited by:** `topN` parameter (default: 10)

### Repositories Over Time

Monthly repository creation timeline:

```typescript
interface TimelineEntry {
  month: string;  // YYYY-MM format
  count: number;  // Repositories created in that month
}
```

**Sorted by:** Month (ascending)
**Period:** Last 12 months

## Error Responses

### 400 Bad Request

Invalid query parameters:

```json
{
  "statusCode": 400,
  "message": [
    "topN must be a positive number",
    "topN must not be greater than 100"
  ],
  "error": "Bad Request"
}
```

### 404 Not Found

User not found or no repositories:

```json
{
  "statusCode": 404,
  "message": "No repositories found for user 'nonexistent'",
  "timestamp": "2025-01-11T10:00:00.000Z"
}
```

## Use Cases

### Overall Platform Analytics

Get comprehensive statistics across all synchronized repositories:

```bash
curl "http://localhost:3000/api/statistics"
```

**Use for:**
- Dashboard overview
- Platform-wide trends
- Technology adoption analysis

### User-Specific Analytics

Analyze a specific user's repository portfolio:

```bash
curl "http://localhost:3000/api/statistics?user=octocat"
```

**Use for:**
- User profile insights
- Individual developer analytics
- Portfolio assessment

### Custom Top Lists

Get different sized rankings:

```bash
# Top 5
curl "http://localhost:3000/api/statistics?topN=5"

# Top 50
curl "http://localhost:3000/api/statistics?topN=50"
```

**Use for:**
- Leaderboards
- Featured repositories
- Trending analysis

## Example Visualizations

### Language Distribution Chart

```javascript
// Use languageDistribution for pie/bar charts
const languages = data.languageDistribution.map(l => ({
  label: l.language || 'None',
  value: l.count
}));
```

### Timeline Chart

```javascript
// Use repositoriesOverTime for line/area charts
const timeline = data.repositoriesOverTime.map(t => ({
  date: new Date(t.month),
  count: t.count
}));
```

### Leaderboard

```javascript
// Use topUsers for rankings
const leaderboard = data.topUsers.map((user, index) => ({
  rank: index + 1,
  ...user
}));
```

## Performance

Statistics are computed in real-time from the database:

- **Query Optimization:** Indexed fields for fast aggregation
- **Response Time:** Typically < 200ms for 1000s of repositories
- **Caching:** Consider client-side caching for frequently accessed stats

## Rate Limiting

Statistics endpoint is subject to:
- **Rate Limit:** 100 requests/minute per IP
- **Recommendation:** Cache results client-side

## Integration Examples

### JavaScript/TypeScript

```typescript
async function getStatistics(user?: string, topN: number = 10) {
  const params = new URLSearchParams();
  if (user) params.append('user', user);
  params.append('topN', String(topN));

  const response = await fetch(
    `http://localhost:3000/api/statistics?${params}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.status}`);
  }

  return response.json();
}

// Usage
const stats = await getStatistics('octocat', 10);
console.log(`Total repositories: ${stats.totalRepositories}`);
```

### Python

```python
import requests

def get_statistics(user=None, top_n=10):
    params = {'topN': top_n}
    if user:
        params['user'] = user

    response = requests.get(
        'http://localhost:3000/api/statistics',
        params=params
    )
    response.raise_for_status()
    return response.json()

# Usage
stats = get_statistics(user='octocat', top_n=10)
print(f"Total repositories: {stats['totalRepositories']}")
```

### cURL

```bash
# Save to file
curl "http://localhost:3000/api/statistics" > stats.json

# Pretty print
curl "http://localhost:3000/api/statistics" | jq .

# Extract specific fields
curl -s "http://localhost:3000/api/statistics" | \
  jq '.languageDistribution[] | select(.language == "TypeScript")'
```

## Next Steps

- [Repositories API](/api/repositories)
- [Error Handling](/api/errors)
- [Getting Started](/getting-started)
