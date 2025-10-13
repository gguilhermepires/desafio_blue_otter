# Requirements Document: GitHub Repository Management API

## Introduction

This document outlines the requirements for a back-end API that enables interaction and manipulation of GitHub user data. The system provides RESTful endpoints to synchronize GitHub repository data to a local database, list and search repositories, and generate statistical insights from the synchronized data. The API serves as an intermediary layer between GitHub's public API and client applications, offering enhanced search capabilities and analytical features not directly available through GitHub's native API.

The system targets developers and organizations that need to track, analyze, and manage GitHub repository data across multiple users. It addresses the need for persistent storage, advanced search functionality, and aggregated statistics about repository distributions, language usage, and temporal trends.

## Requirements

### 1. Repository Synchronization

**User Story:** As an API user, I want to synchronize all public repositories from a GitHub user to a local database, so that I can access and analyze repository data without repeatedly querying GitHub's API.

#### Acceptance Criteria

1. WHEN the API receives a request to the synchronization endpoint with a valid GitHub username THEN the system SHALL retrieve all public repositories for that user from GitHub's API (https://api.github.com/users/{user}/repos).

2. WHEN the system successfully retrieves repository data from GitHub THEN the system SHALL store the following fields for each repository in the local database:
   - Repository ID (GitHub's unique identifier)
   - Repository name
   - Repository description
   - Repository URL
   - Primary programming language
   - Creation date
   - User ID (GitHub user's unique identifier)
   - User login (GitHub username)
   - User avatar URL

3. WHEN the API receives a request to the synchronization endpoint with a GitHub username THEN the system SHALL also retrieve user information from GitHub's User API (https://api.github.com/users/{user}).

4. IF a repository with the same GitHub repository ID already exists in the local database THEN the system SHALL update the existing record with the latest data from GitHub.

5. IF a user with the same GitHub user ID already exists in the local database THEN the system SHALL update the existing user record with the latest data from GitHub.

6. WHEN the synchronization process completes successfully THEN the system SHALL return a response indicating the number of repositories synchronized and the timestamp of the operation.

7. IF the GitHub username does not exist or GitHub's API returns an error THEN the system SHALL return an appropriate error response with HTTP status code 404 or 502 respectively.

8. WHEN multiple synchronization requests are made for the same user concurrently THEN the system SHALL handle these requests without data corruption or duplication.

9. IF GitHub's API rate limit is exceeded during synchronization THEN the system SHALL return an error response indicating rate limit exhaustion with HTTP status code 429.

10. WHEN the system stores repository data THEN the system SHALL validate that all required fields are present before persisting to the database.

### 2. Repository Listing

**User Story:** As an API user, I want to list all repositories for a specific user stored in the local database, so that I can view the synchronized repository data without making external API calls.

#### Acceptance Criteria

1. WHEN the API receives a request to the listing endpoint with a valid username parameter THEN the system SHALL retrieve all repositories associated with that user from the local database.

2. WHEN the system returns repository data THEN the system SHALL include the following fields for each repository:
   - Repository ID
   - Repository name
   - Repository description
   - Repository URL
   - Primary programming language
   - Creation date

3. IF no repositories exist in the local database for the specified username THEN the system SHALL return an empty array with HTTP status code 200.

4. IF the username parameter is missing or invalid THEN the system SHALL return an error response with HTTP status code 400.

5. WHEN the API returns the list of repositories THEN the system SHALL order the results by creation date in descending order (newest first).

6. WHEN the listing endpoint is called THEN the system SHALL support pagination with query parameters for page number and page size.

7. IF pagination parameters are provided THEN the system SHALL return metadata indicating the total count of repositories, current page, total pages, and page size.

8. WHEN retrieving repository data from the database THEN the system SHALL complete the operation within 2 seconds for datasets containing up to 1000 repositories.

### 3. Repository Search

**User Story:** As an API user, I want to search repositories stored in the local database using keywords, so that I can find specific repositories based on their attributes without querying GitHub directly.

#### Acceptance Criteria

1. WHEN the API receives a request to the search endpoint with search keywords THEN the system SHALL search through the following repository fields:
   - Repository name
   - Repository description
   - Primary programming language

2. WHEN performing a search THEN the system SHALL support case-insensitive matching.

3. WHEN performing a search THEN the system SHALL support partial matching (substring search) in repository name and description fields.

4. IF multiple keywords are provided separated by spaces THEN the system SHALL treat them as an OR operation (matching repositories containing any of the keywords).

5. WHEN search results are returned THEN the system SHALL include the same fields as the repository listing endpoint:
   - Repository ID
   - Repository name
   - Repository description
   - Repository URL
   - Primary programming language
   - Creation date

6. IF no repositories match the search criteria THEN the system SHALL return an empty array with HTTP status code 200.

7. IF the search keywords parameter is missing or empty THEN the system SHALL return an error response with HTTP status code 400.

8. WHEN search results are returned THEN the system SHALL order results by relevance (exact matches first, then partial matches) and secondarily by creation date.

9. WHEN the search endpoint is called THEN the system SHALL support pagination with query parameters for page number and page size.

10. IF pagination parameters are provided THEN the system SHALL return metadata indicating the total count of matching repositories, current page, total pages, and page size.

11. WHEN performing a search THEN the system SHALL complete the operation within 3 seconds for datasets containing up to 10,000 repositories.

12. WHEN search keywords contain special characters THEN the system SHALL properly escape and sanitize inputs to prevent SQL injection or NoSQL injection attacks.

### 4. Statistics Generation

**User Story:** As an API user, I want to retrieve statistical insights calculated from locally synchronized repository data, so that I can analyze trends, language distributions, and user rankings without performing complex queries myself.

#### Acceptance Criteria

1. WHEN the API receives a request to the statistics endpoint without a user parameter THEN the system SHALL calculate and return global statistics across all synchronized users.

2. WHEN the API receives a request to the statistics endpoint with a user parameter THEN the system SHALL calculate and return statistics only for the specified user's repositories.

3. WHEN global statistics are requested THEN the system SHALL include a summary object containing:
   - total_repos: Total number of repositories across all users
   - total_users: Total number of unique users in the database

4. WHEN user-specific statistics are requested THEN the system SHALL include a summary object containing:
   - total_repos: Total number of repositories for the specified user

5. WHEN statistics are calculated THEN the system SHALL include a languages object containing programming languages ranked by repository count in descending order.

6. WHEN global statistics are requested THEN the system SHALL include a top_users_by_repos array containing the top N users with the most repositories, where N is determined by the topN parameter.

7. WHEN the topN parameter is not provided THEN the system SHALL default to 5 for the size of rankings.

8. IF the topN parameter is provided and exceeds 20 THEN the system SHALL cap the value at 20.

9. IF the topN parameter is provided and is less than 1 THEN the system SHALL return an error response with HTTP status code 400.

10. WHEN statistics are calculated THEN the system SHALL include a timeline_created_monthly object containing a histogram of repositories created by month and year.

11. WHEN the timeline_created_monthly histogram is generated THEN the system SHALL format month keys as "YYYY-MM" and include a count of repositories created in that month.

12. IF the user parameter is provided but no data exists for that user THEN the system SHALL return statistics with zero counts and empty arrays.

13. IF the user parameter is invalid or malformed THEN the system SHALL return an error response with HTTP status code 400.

14. WHEN global statistics are requested THEN the system SHALL NOT include user-specific information in individual repository details.

15. WHEN calculating language statistics THEN the system SHALL treat repositories without a primary language as a separate category labeled "None" or exclude them based on a query parameter.

16. WHEN calculating the timeline histogram THEN the system SHALL include all months within the range from the earliest repository creation date to the most recent, showing zero counts for months with no repository creations.

17. WHEN the statistics endpoint is called THEN the system SHALL compute and return results within 5 seconds for datasets containing up to 100,000 repositories.

18. WHEN statistics calculations are performed THEN the system SHALL only use data that has been synchronized via the synchronization endpoint (Endpoint 1).

### 5. API Architecture and Technology

**User Story:** As a developer, I want the API to be built using modern, maintainable technologies with clear architectural patterns, so that the codebase is scalable, testable, and easy to understand.

#### Acceptance Criteria

1. WHEN the API is implemented THEN the system SHALL use Node.js as the runtime environment.

2. WHEN the API is implemented THEN the system SHALL use TypeScript for type safety and improved developer experience.

3. WHEN the API is implemented THEN the system SHALL use NestJS framework (https://nestjs.com/) with its dependency injection, modular architecture, and decorator-based routing capabilities.

4. WHEN the application architecture is designed THEN the system SHALL follow a layered architecture with clear separation between controllers, services, and data access layers.

5. WHEN external APIs are called THEN the system SHALL implement proper error handling and timeout mechanisms.

6. WHEN database operations are performed THEN the system SHALL use Prisma ORM (https://www.prisma.io/) for type-safe database interactions, schema management, and migrations.

7. WHEN the API handles requests THEN the system SHALL validate input data using DTO (Data Transfer Object) classes with validation decorators.

8. WHEN the API returns responses THEN the system SHALL follow consistent response formats with appropriate HTTP status codes.

9. WHEN errors occur THEN the system SHALL return structured error responses with meaningful error messages and appropriate HTTP status codes.

10. WHEN the application is configured THEN the system SHALL use environment variables for configuration management (database connection, API keys, port numbers).

### 6. Deployment and Infrastructure

**User Story:** As a DevOps engineer, I want the API to be containerized with Docker, so that I can deploy it consistently across different environments.

#### Acceptance Criteria

1. WHEN the project is delivered THEN the system SHALL include a Dockerfile for building the application container image.

2. WHEN the project is delivered THEN the system SHALL include a docker-compose.yml file for orchestrating multiple services: the NestJS API application and the PostgreSQL database.

3. WHEN the Docker Compose configuration is executed THEN the system SHALL automatically set up two separate containers:
   - PostgreSQL database container using the official PostgreSQL Docker image
   - NestJS API application container built from the project Dockerfile

4. WHEN the application container is built THEN the system SHALL use a multi-stage build process to minimize the final image size.

5. WHEN the Docker Compose environment is started THEN the system SHALL ensure proper networking between containers.

6. WHEN the Docker Compose environment is started THEN the system SHALL persist database data using Docker volumes.

7. WHEN the application starts within a container THEN the system SHALL perform database migrations automatically if needed.

8. WHEN the Docker configuration is provided THEN the system SHALL include appropriate health check configurations for service availability monitoring.

### 7. Data Persistence

**User Story:** As a system administrator, I want repository and user data to be stored reliably in a local database, so that the data remains available even when GitHub's API is unavailable.

#### Acceptance Criteria

1. WHEN the system stores data THEN the system SHALL use PostgreSQL as the relational database for data persistence.

2. WHEN the database schema is designed THEN the system SHALL create separate entities/tables for users and repositories with a one-to-many relationship.

3. WHEN repository records are stored THEN the system SHALL enforce a unique constraint on the GitHub repository ID.

4. WHEN user records are stored THEN the system SHALL enforce a unique constraint on the GitHub user ID.

5. WHEN database operations are performed THEN the system SHALL use transactions where appropriate to maintain data consistency.

6. WHEN the application starts THEN the system SHALL automatically apply Prisma migrations to create or update database schemas as needed.

7. WHEN data is retrieved from the database THEN the system SHALL use indexes on frequently queried fields (user ID, repository name, creation date) for optimal performance.

8. WHEN repository data is stored THEN the system SHALL handle NULL or missing values appropriately (especially for optional fields like description).

### 8. API Documentation and Project Documentation

**User Story:** As an API consumer and developer, I want comprehensive API documentation and clear project documentation, so that I can understand how to use the endpoints, set up the project, and understand the system architecture without reading the source code.

#### Acceptance Criteria

**API Documentation (OpenAPI/Swagger):**

1. WHEN the API is implemented THEN the system SHALL provide OpenAPI/Swagger documentation accessible via a web interface (e.g., /api/docs).

2. WHEN API documentation is generated THEN the system SHALL include for each endpoint:
   - Endpoint URL and HTTP method
   - Request parameters (path, query, body)
   - Request examples
   - Response schemas
   - Response examples
   - Possible HTTP status codes and their meanings

3. WHEN the Swagger UI is accessed THEN the system SHALL allow users to test API endpoints directly from the documentation interface.

4. WHEN DTOs and response models are defined THEN the system SHALL include validation rules and field descriptions that automatically populate the API documentation.

**Project Documentation (README.md):**

5. WHEN the project is delivered THEN the system SHALL include a comprehensive README.md file in the root directory containing:
   - Project overview and description
   - Technology stack and dependencies
   - Prerequisites (Node.js version, Docker, etc.)
   - Setup and installation instructions
   - Docker/Docker Compose commands to run the application
   - Environment variables configuration
   - API endpoints overview with brief descriptions
   - Testing commands
   - Project structure overview

6. WHEN setup instructions are documented THEN the README.md SHALL provide clear step-by-step instructions for running the application locally with Docker Compose.

**Extended Documentation (VitePress):**

7. WHEN the project is delivered THEN the system SHALL include a /docs folder with VitePress-based documentation containing:
   - Architecture diagrams and design decisions
   - Development workflow and contribution guidelines
   - Deployment guide
   - API overview with embedded or linked OpenAPI/Swagger documentation

8. WHEN VitePress documentation is implemented THEN the system SHALL provide a script in package.json to run the documentation site locally for development purposes (e.g., npm run docs:dev).

9. WHEN VitePress documentation is built THEN the system SHALL provide a script in package.json to build the static documentation site (e.g., npm run docs:build).

### 9. Security and Rate Limiting

**User Story:** As a security-conscious developer, I want the API to implement security best practices, so that the system is protected against common vulnerabilities and abuse.

#### Acceptance Criteria

1. WHEN the API receives requests THEN the system SHALL implement rate limiting to prevent abuse.

2. WHEN the API handles user inputs THEN the system SHALL validate and sanitize all inputs to prevent injection attacks.

3. WHEN the API makes external requests to GitHub THEN the system SHALL securely store and manage GitHub API tokens if authentication is required.

4. WHEN the API is deployed THEN the system SHALL use HTTPS for all external communications in production environments.

5. WHEN errors occur THEN the system SHALL log errors without exposing sensitive information in API responses.

6. WHEN the API handles CORS (Cross-Origin Resource Sharing) THEN the system SHALL configure appropriate CORS policies including:
   - Allow localhost origins for local development and testing (http://localhost:3000, http://localhost:5173, etc.)
   - Support configurable allowed origins via environment variables for different deployment environments
   - Proper handling of credentials and headers

### 10. Testing and Quality Assurance

**User Story:** As a quality assurance engineer, I want the codebase to include automated tests, so that I can verify functionality and prevent regressions.

#### Acceptance Criteria

1. WHEN the project is delivered THEN the system SHALL include unit tests for service layer logic with at least 70% code coverage.

2. WHEN the project is delivered THEN the system SHALL include integration tests for API endpoints.

3. WHEN tests are executed THEN the system SHALL use a test database or in-memory database to avoid affecting production data.

4. WHEN the project is delivered THEN the system SHALL include a test script in package.json that runs all tests.

5. WHEN external API calls are tested THEN the system SHALL mock GitHub API responses to ensure tests can run without network dependencies.

### 11. Performance and Scalability

**User Story:** As a system architect, I want the API to handle concurrent requests efficiently, so that the system remains responsive under load.

#### Acceptance Criteria

1. WHEN multiple concurrent requests are received THEN the system SHALL handle at least 100 concurrent requests without degradation in response time beyond 2x the baseline.

2. WHEN synchronizing repositories from GitHub THEN the system SHALL implement efficient batch processing for large datasets (users with more than 100 repositories).

3. WHEN the system makes multiple requests to GitHub's API THEN the system SHALL respect GitHub's rate limits and implement exponential backoff retry logic.

4. WHEN database queries are executed THEN the system SHALL use connection pooling for efficient resource utilization.

5. WHEN processing large result sets THEN the system SHALL implement pagination rather than returning all results at once.

### 12. Logging and Monitoring

**User Story:** As a system operator, I want comprehensive logging and monitoring capabilities, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. WHEN the application runs THEN the system SHALL log all incoming API requests with timestamp, endpoint, method, and response status.

2. WHEN errors occur THEN the system SHALL log detailed error information including stack traces (without exposing them in API responses).

3. WHEN external API calls are made to GitHub THEN the system SHALL log request attempts, successes, and failures.

4. WHEN database operations fail THEN the system SHALL log the operation type and error details.

5. WHEN logging is implemented THEN the system SHALL support different log levels (debug, info, warn, error) configurable via environment variables.

6. WHEN logs are generated THEN the system SHALL format logs in a structured format (JSON) for easier parsing and analysis.

7. WHEN logs are generated THEN the system SHALL persist logs to the PostgreSQL database in a dedicated logs table for centralized storage and querying.

8. WHEN logs are written to the database THEN the system SHALL do so asynchronously to avoid blocking API request processing.

9. WHEN the application starts THEN the system SHALL log startup information including Node.js version, environment (dev/prod), and loaded configuration (without sensitive values).

10. WHEN logs are stored in the database THEN the system SHALL include the following fields:
   - Unique log ID
   - Timestamp
   - Log level (debug, info, warn, error)
   - Message
   - Context (endpoint, method, request ID, etc.)
   - Stack trace (for errors)
   - Additional metadata (JSON)

11. WHEN log retention is implemented THEN the system SHALL automatically delete logs older than 30 days to prevent excessive database growth (configurable via environment variable).
