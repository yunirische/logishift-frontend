---
title: Development Workflow
domain: workflows
related:
  - ../architecture/deployment.md
  - ../architecture/tech-stack.md
last_updated: 2026-01-27
context_priority: medium
---

# Development Workflow

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running Locally](#running-locally)
- [Git Workflow](#git-workflow)
  - [Branch Strategy](#branch-strategy)
  - [Commit Conventions](#commit-conventions)
  - [Pull Request Process](#pull-request-process)
- [Code Review Process](#code-review-process)
  - [Review Checklist](#review-checklist)
  - [Approval Requirements](#approval-requirements)
  - [Addressing Feedback](#addressing-feedback)
- [Testing Guidelines](#testing-guidelines)
  - [Unit Testing](#unit-testing)
  - [Integration Testing](#integration-testing)
  - [Manual Testing](#manual-testing)

## Development Environment Setup

### Prerequisites

**Required Software:**
- Node.js 20+ - [Download](https://nodejs.org/)
- npm 9+ or pnpm 8+ - Package manager
- Git 2+ - Version control
- Docker 20+ - Containerization (optional but recommended)
- PostgreSQL 14+ - Database (can use Docker)

**Recommended Tools:**
- VS Code - Code editor
- Postman or Insomnia - API testing
- DBeaver or pgAdmin - Database management
- n8n - Telegram bot gateway (for bot development)

**Environment Variables:**
Create `.env` file in project root:
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/logishift_dev

# JWT
JWT_SECRET=development-secret-key-change-in-production

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# File Storage
UPLOAD_DIR=./uploads
```

### Installation

**1. Clone Repository:**
```bash
git clone https://github.com/your-org/logishift-frontend.git
cd logishift-frontend
```

**2. Install Dependencies:**
```bash
npm install
# or
pnpm install
```

**3. Setup Database:**
```bash
# Option A: Using Docker (Recommended)
docker-compose up -d postgres

# Option B: Local PostgreSQL
# Create database
createdb logishift_dev

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

**4. Generate Prisma Client:**
```bash
npx prisma generate
```

**5. Build TypeScript:**
```bash
npm run build
```

### Configuration

**TypeScript Configuration:**
`tsconfig.json` is pre-configured with:
- Target: ES2020
- Module: commonjs
- Strict mode enabled
- Out directory: `./dist`

**ESLint Configuration:**
`.eslintrc.json` includes rules for:
- TypeScript best practices
- Node.js security
- Code consistency

**Prettier Configuration:**
`.prettierrc` defines code style:
- Single quotes
- 2 space indentation
- Semicolons required
- Trailing commas (ES5)

### Running Locally

**Development Mode:**
```bash
# Watch mode with auto-reload
npm run dev

# Or build and run
npm run build
npm start
```

**Database Management:**
```bash
# View database in Prisma Studio
npx prisma studio

# Open browser to http://localhost:5555
```

**Running Tests:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**API Testing:**
```bash
# Start server
npm start

# Test health endpoint
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"user@example.com","password":"password123"}'
```

---

## Git Workflow

### Branch Strategy

**Main Branches:**
- `main` - Production-ready code
- `develop` - Integration branch for features

**Supporting Branches:**
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `release/*` - Release preparation

**Branch Naming:**
```
feature/shift-photo-upload
feature/user-management
bugfix/truck-busy-flag
hotfix/security-patch
release/v1.2.0
```

**Workflow:**
```
1. Create feature branch from develop
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature

2. Make changes and commit
   git add .
   git commit -m "feat: add shift photo upload"

3. Push to remote
   git push origin feature/your-feature

4. Create pull request to develop
   # Via GitHub/GitLab interface

5. After review and merge, delete branch
   git branch -d feature/your-feature
```

### Commit Conventions

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `ci` - CI/CD changes

**Examples:**
```
feat(shifts): add odometer photo upload

- Implement photo upload endpoint
- Add validation for file size and type
- Update shift state machine

Closes #123

fix(trucks): prevent stuck busy flag

Add left join with active shifts to detect
inconsistent busy flags. Allow force reset
via PATCH endpoint.

Fixes #456

docs(api): update authentication section

Clarify JWT token expiration and refresh flow.
```

**Conventional Commits:**
We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Pull Request Process

**1. Before Creating PR:**
- Ensure your branch is up to date with `develop`
- Run tests: `npm test`
- Run linter: `npm run lint`
- Build successfully: `npm run build`
- Update documentation if needed

**2. PR Title:**
Follow commit conventions:
```
feat(shifts): add odometer photo upload
fix(auth): resolve JWT expiration issue
docs(readme): update setup instructions
```

**3. PR Description Template:**
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
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Comments added to complex code
- [ ] Changes generate no new warnings

## Related Issues
Closes #123, #456
```

**4. PR Review Process:**
- Automated checks must pass (CI/CD)
- At least one approval required
- All review comments addressed
- No merge conflicts

**5. After Merge:**
- Delete branch from local and remote
- Update local `develop` branch
- Notify team if breaking changes

---

## Code Review Process

### Review Checklist

**Code Quality:**
- [ ] Code is readable and maintainable
- [ ] Follows project coding standards
- [ ] Proper error handling
- [ ] No hardcoded values (use constants)
- [ ] No console.log() left in production code
- [ ] Variables/functions have descriptive names
- [ ] Functions are small and focused (< 50 lines)
- [ ] No code duplication

**Functionality:**
- [ ] Feature works as specified
- [ ] Edge cases handled
- [ ] User input validated
- [ ] Database operations in transactions
- [ ] Proper HTTP status codes used
- [ ] API responses consistent

**Security:**
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Proper authentication/authorization
- [ ] Sensitive data not exposed
- [ ] Input validation on all endpoints
- [ ] No secrets in code

**Performance:**
- [ ] No N+1 queries
- [ ] Efficient database queries
- [ ] Proper indexing used
- [ ] No unnecessary loops
- [ ] Pagination for large datasets

**Testing:**
- [ ] Unit tests for new functions
- [ ] Tests cover edge cases
- [ ] Tests are maintainable
- [ ] No hardcoded test data

**Documentation:**
- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Complex logic commented
- [ ] JSDoc for public functions

### Approval Requirements

**Required Approvers:**
- At least 1 maintainer approval
- No unresolved objections
- All automated checks pass

**For Sensitive Changes:**
- Authentication/authorization: 2 approvals
- Database schema changes: 2 approvals
- Security fixes: 2 approvals
- Breaking changes: 2 approvals

**Approval Categories:**
1. **Code Quality** - Structure, naming, style
2. **Functionality** - Features work correctly
3. **Security** - No vulnerabilities
4. **Performance** - Efficient implementation
5. **Testing** - Adequate test coverage
6. **Documentation** - Well documented

### Addressing Feedback

**When Receiving Feedback:**
1. Acknowledge receipt of review
2. Ask clarifying questions if needed
3. Make requested changes
4. Respond to each comment
5. Request re-review when ready

**Best Practices:**
- Be open to suggestions
- Explain your reasoning if you disagree
- Propose alternatives
- Keep discussions professional
- Focus on what's best for the project

**Example Responses:**
```
Good: "Great suggestion! I've updated the code to use
constants instead of magic numbers. PTAL?"

Good: "I see your point about security, but for this specific
case, we need this approach because [reason]. What do you think?"

Bad: "This is fine, no changes needed."
```

---

## Testing Guidelines

### Unit Testing

**Framework:** Jest

**Setup:**
```typescript
// tests/setup.ts
import { prisma } from '../src/core/prisma';

beforeEach(async () => {
  // Clear database before each test
  await prisma.shift.deleteMany();
  await prisma.users.deleteMany();
});

afterAll(async () => {
  // Cleanup after all tests
  await prisma.$disconnect();
});
```

**Writing Tests:**
```typescript
// tests/services/shift.service.test.ts
describe('ShiftService', () => {
  describe('startShiftPWA', () => {
    it('should start shift when truck is available', async () => {
      // Arrange
      const user = await createTestUser();
      const truck = await createTestTruck({ is_busy: false });
      const site = await createTestSite();

      // Act
      const result = await shiftService.startShiftPWA(user.id, {
        truck_id: truck.id,
        site_id: site.id
      });

      // Assert
      expect(result.status).toBe('awaiting_odo_start');
      expect(result.truck_id).toBe(truck.id);
    });

    it('should throw error when truck is busy', async () => {
      // Arrange
      const user = await createTestUser();
      const truck = await createTestTruck({ is_busy: true });
      const site = await createTestSite();

      // Act & Assert
      await expect(
        shiftService.startShiftPWA(user.id, {
          truck_id: truck.id,
          site_id: site.id
        })
      ).rejects.toThrow('Машина уже занята');
    });
  });
});
```

**Test Coverage Goals:**
- Services: 80%+ coverage
- Controllers: 70%+ coverage
- Utils: 90%+ coverage
- Overall: 75%+ coverage

### Integration Testing

**API Endpoint Testing:**
```typescript
// tests/api/shifts.test.ts
import request from 'supertest';
import app from '../src/app';

describe('POST /api/v1/shifts/start', () => {
  it('should start shift with valid token', async () => {
    // Arrange
    const token = await generateTestToken();
    const truck = await createTestTruck();
    const site = await createTestSite();

    // Act
    const response = await request(app)
      .post('/api/v1/shifts/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        truck_id: truck.id,
        site_id: site.id
      });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('awaiting_odo_start');
  });

  it('should return 401 without token', async () => {
    const response = await request(app)
      .post('/api/v1/shifts/start')
      .send({ truck_id: 1, site_id: 1 });

    expect(response.status).toBe(401);
  });
});
```

**Database Testing:**
```typescript
// tests/database/transactions.test.ts
describe('Shift Transactions', () => {
  it('should rollback on error', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.shifts.create({ /* ... */ });
      throw new Error('Intentional error');
    }).catch(() => {});

    const shifts = await prisma.shifts.findMany();
    expect(shifts).toHaveLength(0);
  });
});
```

### Manual Testing

**Pre-Deployment Checklist:**
- [ ] All core flows tested manually
- [ ] Telegram bot integration tested
- [ ] PWA tested on mobile devices
- [ ] Admin panel functionality verified
- [ ] File upload/download tested
- [ ] Reports generation verified
- [ ] Error scenarios tested

**Test Scenarios:**
1. **User Onboarding:**
   - New user registration
   - First login
   - Default credentials

2. **Shift Lifecycle:**
   - Start shift (with/without odometer)
   - Photo upload
   - End shift
   - Salary calculation

3. **Dictionary Management:**
   - Add/edit/delete trucks
   - Add/edit/delete sites
   - Force reset stuck flags

4. **Multi-Tenancy:**
   - Data isolation verified
   - Tenant-specific settings work
   - API key authentication

5. **Error Handling:**
   - Invalid credentials
   - Plan limits enforced
   - Stuck states recovered
   - Network errors handled

**Testing Environment:**
- Use staging environment before production
- Test with realistic data volumes
- Include edge cases in testing
- Document test results

---

## See Also

- [Architecture Overview](../architecture/overview.md) - System architecture
- [Deployment](../architecture/deployment.md) - Production deployment
- [API Reference](../backend/api-reference.md) - API documentation
- [Security](../architecture/security.md) - Security guidelines
