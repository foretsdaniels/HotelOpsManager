# 🤝 Contributing to Hotel Operations Management System

Thank you for your interest in contributing to our hotel operations management platform! We welcome contributions from developers of all skill levels.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## 📜 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Please:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Git** for version control
- **PostgreSQL** database (or Neon account)
- **Code editor** with TypeScript support (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/hotel-ops-management.git
   cd hotel-ops-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:seed  # Optional: add sample data
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🛠️ Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug fixes**: Resolve existing issues
- **✨ New features**: Implement new functionality
- **📚 Documentation**: Improve or add documentation
- **🎨 UI/UX improvements**: Enhance user experience
- **⚡ Performance optimizations**: Make the system faster
- **🧪 Tests**: Add or improve test coverage
- **🔧 Configuration**: Improve development setup

### Before You Start

1. **Check existing issues**: Look for related issues or feature requests
2. **Create an issue**: If none exists, create one to discuss your proposed changes
3. **Get feedback**: Wait for maintainer feedback before starting large changes
4. **Assign yourself**: Comment on the issue to let others know you're working on it

### Branch Naming Convention

Use descriptive branch names:

- `feature/user-authentication`
- `fix/room-status-bug`
- `docs/api-documentation`
- `refactor/database-queries`
- `test/inspection-workflow`

## 🔄 Pull Request Process

### Creating a Pull Request

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add user authentication system"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with a detailed description

### Pull Request Requirements

Your PR should include:

- **Clear title and description** explaining the changes
- **Issue reference** (e.g., "Fixes #123")
- **Screenshots/GIFs** for UI changes
- **Testing instructions** for reviewers
- **Documentation updates** if applicable

### Pull Request Template

```markdown
## 📝 Description
Brief description of changes made.

## 🔗 Related Issue
Fixes #(issue_number)

## 🧪 Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## 📸 Screenshots
Include screenshots for UI changes.

## ✅ Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 💻 Coding Standards

### TypeScript Guidelines

- **Use strict typing**: Avoid `any` types
- **Prefer interfaces** over type aliases for object shapes
- **Use proper generics** for reusable components
- **Document complex types** with JSDoc comments

```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  role: UserRole;
}

// ❌ Avoid
const user: any = { ... };
```

### React Guidelines

- **Use functional components** with hooks
- **Prefer custom hooks** for reusable logic
- **Use proper prop types** and default props
- **Follow component file structure**:

```typescript
// Component imports
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

// Type definitions
interface ComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
}

// Main component
export function Component({ title, onSubmit }: ComponentProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false);
  
  // Event handlers
  const handleSubmit = () => {
    // Implementation
  };
  
  // Render
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
}
```

### CSS/Styling Guidelines

- **Use Tailwind CSS** utility classes
- **Follow mobile-first** responsive design
- **Use CSS variables** for theme consistency
- **Prefer semantic HTML** elements

```tsx
// ✅ Good - Mobile-first responsive design
<div className="flex flex-col md:flex-row gap-4 p-4 bg-card text-card-foreground">
  
// ❌ Avoid - Custom CSS when Tailwind suffices
<div style={{ display: 'flex', padding: '16px' }}>
```

### Database Guidelines

- **Use Drizzle ORM** for all database operations
- **Write type-safe queries** with proper error handling
- **Use transactions** for multi-step operations
- **Follow naming conventions**:
  - Tables: `snake_case` (e.g., `room_assignments`)
  - Columns: `camelCase` (e.g., `createdAt`)

### API Guidelines

- **Use RESTful conventions** for endpoints
- **Implement proper error handling**
- **Validate request data** with Zod schemas
- **Use appropriate HTTP status codes**
- **Document API endpoints** in code comments

```typescript
// ✅ Good - Proper validation and error handling
app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const task = createTaskSchema.parse(req.body);
    const result = await storage.createTask(task);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
```

## 🧪 Testing Guidelines

### Writing Tests

- **Write tests** for new features and bug fixes
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert
- **Mock external dependencies** appropriately

### Test Types

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📚 Documentation

### Code Documentation

- **Use JSDoc comments** for functions and classes
- **Document complex business logic**
- **Keep comments up-to-date** with code changes

```typescript
/**
 * Calculates the average cleaning time for a room attendant
 * @param tasks - Array of completed tasks
 * @param timeframe - Number of days to consider
 * @returns Average time in minutes
 */
export function calculateAverageTime(tasks: Task[], timeframe: number): number {
  // Implementation
}
```

### README Updates

- **Update README.md** for new features
- **Include screenshots** for UI changes
- **Update installation instructions** if needed
- **Add new environment variables** to documentation

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Clear bug description**
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Environment information**:
   - OS and version
   - Node.js version
   - Browser version (for frontend issues)
5. **Screenshots or error logs**

## 💡 Suggesting Features

For feature requests:

1. **Check existing feature requests** to avoid duplicates
2. **Provide clear use case** and business value
3. **Include mockups or wireframes** if applicable
4. **Consider implementation complexity**
5. **Be open to feedback** and alternative solutions

## 🏷️ Issue Labels

We use the following labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to docs
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested
- `wontfix`: This will not be worked on

## 👥 Getting Help

If you need help:

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Code Comments**: Add comments in PRs for specific questions

## 🎉 Recognition

Contributors will be recognized:

- **Contributors list** in README.md
- **Release notes** mention significant contributions
- **GitHub contributors** page displays all contributors

---

Thank you for contributing to the Hotel Operations Management System! Your efforts help make hotel operations more efficient and user-friendly. 🏨✨