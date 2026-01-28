# Codebase Concerns

**Analysis Date:** 2024-01-28

## Tech Debt

**Large Dashboard Component:**
- Issue: `src/components/Dashboard.tsx` (718 lines) violates single responsibility principle
- Files: [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx)
- Impact: Difficult to maintain, test, and understand
- Fix approach: Split into smaller components - separate admin stats, driver UI, usage cards, and manual shift modal logic

**Mixed API Service Patterns:**
- Issue: `src/services/api.ts` mixes authentication, HTTP utilities, and business logic
- Files: [`src/services/api.ts`](src/services/api.ts)
- Impact: Tight coupling, hard to extend or test individual features
- Fix approach: Separate concerns - auth service, HTTP client, and endpoint-specific services

**Hardcoded Environmental Dependencies:**
- Issue: API endpoints and base URLs are hardcoded in constants
- Files: [`src/constants.ts`](src/constants.ts), [`src/services/api.ts`](src/services/api.ts)
- Impact: Difficult to manage different environments, potential deployment issues
- Fix approach: Use environment variables and configuration management

**Manual Reliance Pattern:**
- Issue: Heavy use of `window.location.reload()` for state synchronization
- Files: [`src/services/api.ts`](src/services/api.ts:70), [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx)
- Impact: Poor user experience, potential data loss on state changes
- Fix approach: Implement proper state synchronization without full page reloads

## Known Bugs

**Gemini API Key Security Issue:**
- Symptoms: API key hardcoded as empty string, allowing injection
- Files: [`src/services/geminiService.ts`](src/services/geminiService.ts:14)
- Trigger: When AI service is called, uses insecure configuration
- Workaround: Currently disabled functionality

**Inconsistent State Management:**
- Symptoms: Driver state can get out of sync with backend
- Files: [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx)
- Trigger: After network issues or partial updates
- Workaround: Manual refresh implemented but not robust

**Photo URL Handling Complexity:**
- Symptoms: Windows backslashes in paths cause URL issues
- Files: [`src/services/api.ts`](src/services/api.ts:142-154)
- Trigger: When photo paths contain backslashes
- Workaround: Custom normalization function

## Security Considerations

**Sensitive Data Storage:**
- Risk: JWT tokens and user data stored in localStorage
- Files: [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx), [`src/services/api.ts`](src/services/api.ts)
- Current mitigation: Basic validation and cleanup on errors
- Recommendations: Consider secure HTTP-only cookies or dedicated auth services

**Missing Input Validation:**
- Risk: Direct API calls without payload validation
- Files: [`src/services/api.ts`](src/services/api.ts:48-140)
- Current mitigation: Basic HTTP error handling
- Recommendations: Implement request/response schemas and runtime validation

**CORS and XSS Protection:**
- Risk: Relies entirely on backend security
- Files: No visible XSS protection measures
- Current mitigation: React's built-in protections
- Recommendations: Add Content Security Policy headers and input sanitization

## Performance Bottlenecks

**Component Loading Patterns:**
- Problem: Heavy initial bundle size with many synchronous imports
- Files: [`src/App.tsx`](src/App.tsx:8-14)
- Cause: All components imported upfront
- Improvement path: Implement code splitting and lazy loading for all routes

**State Management Complexity:**
- Problem: Multiple useState hooks creating unnecessary re-renders
- Files: [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx)
- Cause: High component with 10+ state variables
- Improvement path: Use reducer or context for complex state management

**Network Request Optimization:**
- Problem: Multiple concurrent API calls without deduplication
- Files: [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx)
- Cause: No request caching or deduplication
- Improvement path: Implement query caching and deduplication

## Fragile Areas

**Error Boundary Implementation:**
- Files: [`src/components/ErrorBoundary.tsx`](src/components/ErrorBoundary.tsx)
- Why fragile: Basic implementation with TODO for error tracking
- Safe modification: Add proper error classification and user feedback
- Test coverage: Limited to basic error catching

**Dynamic Import Dependencies:**
- Files: [`src/App.tsx`](src/App.tsx:8-14), [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx:21)
- Why fragile: Relies on import map configuration
- Safe modification: Add error boundaries for failed imports
- Test coverage: Not tested for import failures

**Type System Inconsistencies:**
- Files: [`src/types.ts`](src/types.ts:34-35)
- Why fragile: Union type with string enum creates ambiguity
- Safe modification: Use strict typing throughout
- Test coverage: Runtime type safety not enforced

## Scaling Limits

**Component Size Limits:**
- Current capacity: Dashboard component maxed at 718 lines
- Limit: Performance degradation as components grow
- Scaling path: Implement proper component architecture patterns

**Network Request Limits:**
- Current capacity: 30-second timeout per request
- Limit: User experience for slow connections
- Scaling path: Implement retry mechanisms and progressive loading

## Dependencies at Risk

**Google Gemini API:**
- Risk: @google/genai has @tsignore comment
- Impact: Type safety compromised
- Migration plan: Official types or wrapper service

**Axios Dependency:**
- Risk: Axios included but not used in main code
- Impact: Dead weight in bundle
- Migration plan: Remove unused dependency or migrate to fetch-only

## Missing Critical Features

**Offline Support:**
- Problem: PWA installed but no offline capabilities
- Blocks: Poor user experience in low-connectivity areas
- Priority: High

**Proper Testing Infrastructure:**
- Problem: No visible test files or configuration
- Blocks: Refactoring confidence and code quality
- Priority: Medium

**Error Logging and Monitoring:**
- Problem: TODO comments for Sentry integration
- Blocks: Production debugging and issue tracking
- Priority: High

## Test Coverage Gaps

**State Management Testing:**
- What's not tested: Auth context and state transitions
- Files: [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx)
- Risk: Authentication failures not caught early
- Priority: High

**API Integration Testing:**
- What's not tested: API error handling and edge cases
- Files: [`src/services/api.ts`](src/services/api.ts)
- Risk: Network issues cause app crashes
- Priority: Medium

---

*Concerns audit: 2024-01-28*