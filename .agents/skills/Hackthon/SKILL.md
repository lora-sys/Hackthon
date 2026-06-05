```markdown
# Hackthon Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and conventions used in the Hackthon TypeScript codebase. It covers file organization, code style, commit message standards, and testing patterns. By following these guidelines, contributors can ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.test.ts`

### Imports
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Exports
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In dataFetcher.ts
    export function fetchData() { /* ... */ }
    ```

### Commit Messages
- Follow the **conventional commit** format.
- Use the `chore` prefix for routine changes.
  - Example: `chore: update dependencies`

## Workflows

### Code Contribution
**Trigger:** When adding new features or making changes to the codebase  
**Command:** `/contribute`

1. Create a new branch for your feature or fix.
2. Write code following the coding conventions above.
3. Add or update tests as appropriate.
4. Commit changes using the conventional commit format (e.g., `chore: add new feature`).
5. Push your branch and open a pull request for review.

### Running Tests
**Trigger:** Before pushing changes or merging pull requests  
**Command:** `/test`

1. Locate test files matching the `*.test.*` pattern.
2. Run the test suite using your preferred test runner (framework is unspecified; ensure compatibility).
3. Review test output and fix any failing tests before proceeding.

## Testing Patterns

- Test files are named with the `*.test.*` pattern, such as `userProfile.test.ts`.
- The specific testing framework is not specified; ensure your tests are compatible with the project's setup.
- Example test file:
  ```typescript
  // userProfile.test.ts
  import { getUserProfile } from './userProfile';

  describe('getUserProfile', () => {
    it('returns user data for valid ID', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command      | Purpose                                         |
|--------------|-------------------------------------------------|
| /contribute  | Start a new code contribution workflow          |
| /test        | Run all tests in the codebase                   |
```
