# AI PR Reviewer

AI PR Reviewer is a full-stack web application that allows users to fetch GitHub pull requests and receive AI-powered code reviews.

The application connects with the GitHub API to retrieve repository and pull request information. When a user selects a pull request, the changed code is sent to an AI model for analysis. The generated review identifies potential bugs, performance issues, security concerns, code quality problems, and best-practice improvements.

The project was built to demonstrate the integration of modern full-stack development with AI APIs and third-party services.

---

## Features

### Authentication

- User signup and login
- JWT-based authentication
- Protected routes for authenticated users
- User profile information
- Logout functionality

### GitHub Integration

- Fetch repository details
- Fetch open pull requests
- View pull request metadata
- Open the original pull request on GitHub
- Display repository statistics such as:
  - Stars
  - Forks
  - Watchers
  - Open issues
  - Primary language
  - License
  - Repository topics

### AI Code Review

The AI analyzes the changed code in a pull request and generates:

- Overall code quality score
- Bug detection results
- Performance analysis
- Security analysis
- Best-practice analysis
- Priority issues with severity levels
- AI-generated code summary
- Estimated fix time
- Detailed Markdown review

### Review Management

- Save generated reviews to MongoDB
- Track unique pull requests reviewed by a user
- Display total reviews in the user profile
- Prevent duplicate PR reviews from incorrectly increasing the review count

### Developer Experience

- Search pull requests
- Sort pull requests by newest or oldest
- Filter pull requests by status
- Copy AI review content
- Export reviews as Markdown files
- Syntax highlighting for code blocks
- Dark mode support
- Responsive design for mobile and desktop devices

---

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hot Toast
- React Markdown
- Remark GFM
- React Syntax Highlighter
- Lucide React

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Axios

### External Services

- GitHub REST API
- Groq AI API
- AI Model: Llama 3.3 70B
