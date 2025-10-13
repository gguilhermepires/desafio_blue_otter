# Contributing

Thank you for your interest in contributing to the GitHub Repository Management API!

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your feature or bugfix
4. **Make your changes** following our guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/desafio_blue_otter.git
cd desafio_blue_otter

# Add upstream remote
git remote add upstream https://github.com/gguilhermepires/desafio_blue_otter.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start database
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## Contribution Guidelines

### Code Style

We use **ESLint** and **Prettier** for code formatting:

```bash
# Run linter
npm run lint

# Format code
npm run format
```

**Style Rules:**
- Use TypeScript strict mode
- Follow NestJS conventions
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

### Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(repositories): add filtering by date range

Implemented date range filtering for repository list endpoint.
Users can now filter repositories by creation date.

Closes #123
```

```bash
fix(statistics): correct language percentage calculation

Fixed rounding error in language distribution percentages.
Percentages now sum to exactly 100%.
```

```bash
docs(api): update repository endpoint documentation

Added examples for all query parameters.
Clarified pagination behavior.
```

### Branch Naming

Use descriptive branch names:

```
<type>/<description>

Examples:
- feat/date-range-filter
- fix/percentage-calculation
- docs/api-examples
- refactor/service-layer
```

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if applicable)
5. **Create pull request** with description

**PR Template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

## What to Contribute

### Bug Fixes

Found a bug? Great!

1. **Check existing issues** first
2. **Create an issue** if none exists
3. **Fix the bug** in your branch
4. **Add a test** to prevent regression
5. **Submit PR** referencing the issue

### New Features

Want to add a feature?

1. **Open an issue** to discuss first
2. **Wait for approval** from maintainers
3. **Implement the feature**
4. **Add comprehensive tests**
5. **Update documentation**
6. **Submit PR**

### Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Improve API documentation
- Add guides or tutorials
- Translate documentation

### Tests

Help improve test coverage:

- Add missing unit tests
- Add E2E tests
- Add edge case tests
- Improve test quality

## Code Review Process

1. **Automated checks** run on PR
   - Linting
   - Tests
   - Build verification

2. **Manual review** by maintainers
   - Code quality
   - Design decisions
   - Test coverage
   - Documentation

3. **Feedback and iterations**
   - Address review comments
   - Make requested changes
   - Update PR

4. **Merge**
   - Squash and merge to main
   - Branch deleted automatically

## Testing Requirements

All contributions must include tests:

### For Bug Fixes

Add a test that:
1. Reproduces the bug
2. Fails before your fix
3. Passes after your fix

```typescript
it('should handle edge case correctly', () => {
  // Arrange - Setup that reproduces bug
  const input = edgeCaseValue;

  // Act - Call the fixed function
  const result = functionUnderTest(input);

  // Assert - Verify correct behavior
  expect(result).toBe(expectedValue);
});
```

### For New Features

Add tests that:
1. Test happy path
2. Test error cases
3. Test edge cases
4. Test validation

```typescript
describe('NewFeature', () => {
  it('should work with valid input', () => {});
  it('should reject invalid input', () => {});
  it('should handle edge cases', () => {});
  it('should validate all parameters', () => {});
});
```

## Documentation Requirements

### Code Documentation

Add JSDoc comments for:
- Public methods
- Complex algorithms
- Non-obvious code

```typescript
/**
 * Calculates repository statistics for a given user
 *
 * @param username - GitHub username
 * @param options - Calculation options
 * @returns Statistics object with counts and percentages
 * @throws NotFoundException if user has no repositories
 *
 * @example
 * ```typescript
 * const stats = await calculateStats('octocat', { topN: 10 });
 * console.log(stats.totalRepositories);
 * ```
 */
async calculateStats(username: string, options: StatsOptions): Promise<Stats> {
  // Implementation
}
```

### API Documentation

Use Swagger decorators:

```typescript
@ApiOperation({ summary: 'Calculate repository statistics' })
@ApiParam({
  name: 'username',
  description: 'GitHub username',
  example: 'octocat'
})
@ApiResponse({
  status: 200,
  description: 'Statistics calculated successfully',
  type: StatsDto
})
@ApiResponse({
  status: 404,
  description: 'User not found'
})
```

### User Documentation

Update docs in `docs/` for:
- New endpoints
- Changed behavior
- New configuration options
- Breaking changes

## Reporting Issues

### Bug Reports

Include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - Exact steps
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, Node version, etc.
6. **Logs** - Relevant error messages

**Template:**

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Ubuntu 22.04
- Node: 18.x
- Docker: 24.x

## Logs
```
Error message here
```
```

### Feature Requests

Include:

1. **Problem** - What problem does it solve?
2. **Solution** - Proposed solution
3. **Alternatives** - Alternative solutions considered
4. **Additional Context** - Any other relevant info

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Assume good intentions
- Focus on constructive feedback
- Help others learn

### Communication

**GitHub Issues:**
- Bug reports
- Feature requests
- Questions about usage

**Pull Requests:**
- Code contributions
- Documentation improvements

**Discussions:**
- General questions
- Ideas and suggestions
- Show and tell

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Mentioned in project README

## License

By contributing, you agree that your contributions will be licensed under the project's UNLICENSED license.

## Questions?

- Check [Documentation](/getting-started)
- Search [existing issues](https://github.com/gguilhermepires/desafio_blue_otter/issues)
- Ask in [Discussions](https://github.com/gguilhermepires/desafio_blue_otter/discussions)

## Resources

- [Development Guide](/development)
- [Testing Guide](/testing)
- [Architecture Overview](/architecture)
- [API Reference](/api/)

Thank you for contributing! 🎉
