# GitHub MCP Server

**Deprecation Notice:** Development for this project has been moved to GitHub in the http://github.com/github/github-mcp-server repo.

---

This server provides tools for interacting with the GitHub API via the Model Context Protocol (MCP).

## Features

*   Repository management (search, create, fork)
*   Issue management (get, list, create, update, comment)
*   Pull Request management (get, list, create, update, review, merge, update branch)
*   Branch creation
*   File operations (get content, upsert)
*   GitHub Projects V2 integration (find project, list items, add items, get Node IDs)

## Tools

1. `create_or_update_file`
   - Create or update a single file in a repository
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `path` (string): Path where to create/update the file
     - `content` (string): Content of the file
     - `message` (string): Commit message
     - `branch` (string): Branch to create/update the file in
     - `sha` (optional string): SHA of file being replaced (for updates)
   - Returns: File content and commit details

2. `push_files`
   - Push multiple files in a single commit
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `branch` (string): Branch to push to
     - `files` (array): Files to push, each with `path` and `content`
     - `message` (string): Commit message
   - Returns: Updated branch reference

3. `search_repositories`
   - Search for GitHub repositories
   - Inputs:
     - `query` (string): Search query
     - `page` (optional number): Page number for pagination
     - `perPage` (optional number): Results per page (max 100)
   - Returns: Repository search results

4. `create_repository`
   - Create a new GitHub repository
   - Inputs:
     - `name` (string): Repository name
     - `description` (optional string): Repository description
     - `private` (optional boolean): Whether repo should be private
     - `autoInit` (optional boolean): Initialize with README
   - Returns: Created repository details

5. `get_file_contents`
   - Get contents of a file or directory
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `path` (string): Path to file/directory
     - `branch` (optional string): Branch to get contents from
   - Returns: File/directory contents

6. `create_issue`
   - Create a new issue
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `title` (string): Issue title
     - `body` (optional string): Issue description
     - `assignees` (optional string[]): Usernames to assign
     - `labels` (optional string[]): Labels to add
     - `milestone` (optional number): Milestone number
   - Returns: Created issue details

7. `create_pull_request`
   - Create a new pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `title` (string): PR title
     - `body` (optional string): PR description
     - `head` (string): Branch containing changes
     - `base` (string): Branch to merge into
     - `draft` (optional boolean): Create as draft PR
     - `maintainer_can_modify` (optional boolean): Allow maintainer edits
   - Returns: Created pull request details

8. `fork_repository`
   - Fork a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `organization` (optional string): Organization to fork to
   - Returns: Forked repository details

9. `create_branch`
   - Create a new branch
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `branch` (string): Name for new branch
     - `from_branch` (optional string): Source branch (defaults to repo default)
   - Returns: Created branch reference

10. `list_issues`
    - List and filter repository issues
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `state` (optional string): Filter by state ('open', 'closed', 'all')
      - `labels` (optional string[]): Filter by labels
      - `sort` (optional string): Sort by ('created', 'updated', 'comments')
      - `direction` (optional string): Sort direction ('asc', 'desc')
      - `since` (optional string): Filter by date (ISO 8601 timestamp)
      - `page` (optional number): Page number
      - `per_page` (optional number): Results per page
    - Returns: Array of issue details

11. `update_issue`
    - Update an existing issue
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `issue_number` (number): Issue number to update
      - `title` (optional string): New title
      - `body` (optional string): New description
      - `state` (optional string): New state ('open' or 'closed')
      - `labels` (optional string[]): New labels
      - `assignees` (optional string[]): New assignees
      - `milestone` (optional number): New milestone number
    - Returns: Updated issue details

12. `add_issue_comment`
    - Add a comment to an issue
    - Inputs:
      - `owner` (string): Repository owner
      - `repo` (string): Repository name
      - `issue_number` (number): Issue number to comment on
      - `body` (string): Comment text
    - Returns: Created comment details

13. `search_code`
    - Search for code across GitHub repositories
    - Inputs:
      - `q` (string): Search query using GitHub code search syntax
      - `sort` (optional string): Sort field ('indexed' only)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: Code search results with repository context

14. `search_issues`
    - Search for issues and pull requests
    - Inputs:
      - `q` (string): Search query using GitHub issues search syntax
      - `sort` (optional string): Sort field (comments, reactions, created, etc.)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: Issue and pull request search results

15. `search_users`
    - Search for GitHub users
    - Inputs:
      - `q` (string): Search query using GitHub users search syntax
      - `sort` (optional string): Sort field (followers, repositories, joined)
      - `order` (optional string): Sort order ('asc' or 'desc')
      - `per_page` (optional number): Results per page (max 100)
      - `page` (optional number): Page number
    - Returns: User search results

16. `list_commits`
   - Gets commits of a branch in a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `page` (optional string): page number
     - `per_page` (optional string): number of record per page
     - `sha` (optional string): branch name
   - Returns: List of commits

17. `get_issue`
   - Gets the contents of an issue within a repository
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `issue_number` (number): Issue number to retrieve
   - Returns: Github Issue object & details

18. `get_pull_request`
   - Get details of a specific pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Pull request details including diff and review status

19. `list_pull_requests`
   - List and filter repository pull requests
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `state` (optional string): Filter by state ('open', 'closed', 'all')
     - `head` (optional string): Filter by head user/org and branch
     - `base` (optional string): Filter by base branch
     - `sort` (optional string): Sort by ('created', 'updated', 'popularity', 'long-running')
     - `direction` (optional string): Sort direction ('asc', 'desc')
     - `per_page` (optional number): Results per page (max 100)
     - `page` (optional number): Page number
   - Returns: Array of pull request details

20. `create_pull_request_review`
   - Create a review on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `body` (string): Review comment text
     - `event` (string): Review action ('APPROVE', 'REQUEST_CHANGES', 'COMMENT')
     - `commit_id` (optional string): SHA of commit to review
     - `comments` (optional array): Line-specific comments, each with:
       - `path` (string): File path
       - `position` (number): Line position in diff
       - `body` (string): Comment text
   - Returns: Created review details

21. `merge_pull_request`
   - Merge a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `commit_title` (optional string): Title for merge commit
     - `commit_message` (optional string): Extra detail for merge commit
     - `merge_method` (optional string): Merge method ('merge', 'squash', 'rebase')
   - Returns: Merge result details

22. `get_pull_request_files`
   - Get the list of files changed in a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of changed files with patch and status details

23. `get_pull_request_status`
   - Get the combined status of all status checks for a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Combined status check results and individual check details

24. `update_pull_request_branch`
   - Update a pull request branch with the latest changes from the base branch (equivalent to GitHub's "Update branch" button)
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
     - `expected_head_sha` (optional string): The expected SHA of the pull request's HEAD ref
   - Returns: Success message when branch is updated

25. `get_pull_request_comments`
   - Get the review comments on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of pull request review comments with details like the comment text, author, and location in the diff

26. `get_pull_request_reviews`
   - Get the reviews on a pull request
   - Inputs:
     - `owner` (string): Repository owner
     - `repo` (string): Repository name
     - `pull_number` (number): Pull request number
   - Returns: Array of pull request reviews with details like the review state (APPROVED, CHANGES_REQUESTED, etc.), reviewer, and review body

## Search Query Syntax

### Code Search
- `language:javascript`: Search by programming language
- `repo:owner/name`: Search in specific repository
- `path:app/src`: Search in specific path
- `extension:js`: Search by file extension
- Example: `q: "import express" language:typescript path:src/`

### Issues Search
- `is:issue` or `is:pr`: Filter by type
- `is:open` or `is:closed`: Filter by state
- `label:bug`: Search by label
- `author:username`: Search by author
- Example: `q: "memory leak" is:issue is:open label:bug`

### Users Search
- `type:user` or `type:org`: Filter by account type
- `followers:>1000`: Filter by followers
- `location:London`: Search by location
- Example: `q: "fullstack developer" location:London followers:>100`

For detailed search syntax, see [GitHub's searching documentation](https://docs.github.com/en/search-github/searching-on-github).

## Setup

### Personal Access Token (PAT)

The server requires a GitHub Personal Access Token (PAT) with the necessary scopes to be set as the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable.

**Required Scopes:**

*   `repo`: Full control of private repositories (needed for most operations like creating issues, PRs, files, branches).
*   `project`: Full control of projects (required for interacting with GitHub Projects V2).
*   (Optional) `delete_repo`: Needed if you intend to use a (currently unimplemented) delete repository tool.

Create a PAT [here](https://github.com/settings/tokens). Choose either a "Classic" token with the scopes above or a "Fine-grained" token with appropriate Repository (`Contents: Read & write`, `Issues: Read & write`, `Pull requests: Read & write`, `Metadata: Read-only`) and Organization/User (`Projects: Read & write`) permissions.

### Usage with Claude Desktop
To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

#### Docker
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "mcp/github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

## Build

Docker build:

```bash
docker build -t mcp/github -f src/github/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Available Tools

Below is a list of the available tools provided by this server:

### Repositories

*   **`create_repo`**: Create a new repository.
    *   Input: `CreateRepositoryOptionsSchema` (name, description?, private?, autoInit?)
*   **`fork_repository`**: Fork a GitHub repository.
    *   Input: `ForkRepositorySchema` (owner, repo, organization?)
*   **`search_repositories`**: Search for GitHub repositories.
    *   Input: `SearchRepositoriesSchema` (query, page?, perPage?)
*   **`get_repository_node_id`**: Get the Node ID for a given repository.
    *   Input: `GetRepositoryNodeIdSchema` (owner, repo)
    *   Output: `{ nodeId: string }`
    *   Note: Useful for getting the `repositoryId` required by `create_project`.

### Issues

*   **`get_issue`**: Get details about a specific issue.
    *   Input: `GetIssueSchema` (owner, repo, issue_number)
*   **`list_issues`**: List issues for a repository.
    *   Input: `ListIssuesOptionsSchema` (owner, repo, direction?, labels?, page?, per_page?, since?, sort?, state?)
*   **`create_issue`**: Create a new issue. Can optionally add it to a Project V2.
    *   Input: `CreateIssueSchema` (owner, repo, title, body?, assignees?, milestone?, labels?, projectId?)
    *   Note: `projectId` should be the Node ID of the target Project V2.
*   **`update_issue`**: Update an existing issue.
    *   Input: `UpdateIssueOptionsSchema` (owner, repo, issue_number, title?, body?, assignees?, milestone?, labels?, state?)
*   **`add_issue_comment`**: Add a comment to an existing issue.
    *   Input: `IssueCommentSchema` (owner, repo, issue_number, body)

### Pull Requests

*   **`get_pull_request`**: Get details about a specific pull request.
    *   Input: `GetPullRequestSchema` (owner, repo, pull_number)
*   **`list_pull_requests`**: List pull requests for a repository.
    *   Input: `ListPullRequestsSchema` (owner, repo, state?, head?, base?, sort?, direction?, per_page?, page?)
*   **`create_pull_request`**: Create a new pull request. Can optionally add it to a Project V2.
    *   Input: `CreatePullRequestSchema` (owner, repo, title, head, base, body?, maintainer_can_modify?, draft?, projectId?)
    *   Note: `projectId` should be the Node ID of the target Project V2.
*   **`update_pull_request`**: Update an existing pull request.
    *   Input: `UpdatePullRequestSchema` (owner, repo, pull_number, title?, body?, state?, base?, maintainer_can_modify?)
*   **`create_pull_request_review`**: Create a review for a pull request.
    *   Input: `CreatePullRequestReviewSchema` (owner, repo, pull_number, body, event, comments?, commit_id?)
*   **`merge_pull_request`**: Merge a pull request.
    *   Input: `MergePullRequestSchema` (owner, repo, pull_number, commit_title?, commit_message?, merge_method?)
*   **`update_pull_request_branch`**: Update a pull request branch with changes from the base branch.
    *   Input: `UpdatePullRequestBranchSchema` (owner, repo, pull_number, expected_head_sha?)

### Branches

*   **`create_branch`**: Create a new branch.
    *   Input: `CreateBranchSchema` (owner, repo, branch, from_branch?)

### Files

*   **`get_file_content`**: Get the content of a file or directory.
    *   Input: `GetFileContentsSchema` (owner, repo, path, branch?)
*   **`upsert_file`**: Create or update a file in a repository.
    *   Input: `CreateOrUpdateFileSchema` (owner, repo, path, content, message, branch, sha?)

### Projects V2

*   **`create_project`**: Create a new GitHub Project V2.
    *   Input: `CreateProjectSchema` (ownerId, title, repositoryId?)
    *   Note: `ownerId` must be the Node ID of the user or organization that will own the project.
    *   Output: `{ id: string; title: string; url: string }`
*   **`update_project`**: Update a GitHub Project V2 (title, description, readme, close/reopen).
    *   Input: `UpdateProjectSchema` (projectId, title?, shortDescription?, readme?, closed?)
    *   Note: `projectId` must be the Node ID of the project. Provide at least one field to update.
    *   Output: `{ id: string; title: string | null; shortDescription: string | null; readme: string | null; closed: boolean; url: string }`
*   **`delete_project`**: Delete a GitHub Project V2.
    *   Input: `DeleteProjectSchema` (projectId)
    *   Note: `projectId` must be the Node ID of the project.
    *   Output: `{ id: string }` (Confirms the ID of the deleted project).
*   **`find_project_id`**: Find the Node ID of a GitHub Project V2 by owner login and project number.
    *   Input: `FindProjectIDSchema` (ownerLogin, projectNumber)
    *   Output: `{ id: string; title: string } | null`
    *   Note: The Node ID (e.g., `PVT_kwDOA...`) is required for most other project operations.
*   **`list_project_items`**: List items (Issues, PRs, Drafts) in a GitHub Project V2.
    *   Input: `ListProjectItemsSchema` (projectId, first?, after?)
    *   Output: GraphQL items connection object (includes nodes, pageInfo, totalCount).
*   **`add_item_to_project`**: Add an existing Issue or Pull Request to a GitHub Project V2 using their Node IDs.
    *   Input: `AddProjectItemSchema` (projectId, contentId)
    *   Output: `{ id: string }` (ID of the item within the project).
    *   Note: `projectId` and `contentId` must be Node IDs. Use `get_item_node_id` to find the Node ID for an issue or PR.
*   **`get_item_node_id`**: Get the Node ID for a given Issue or Pull Request number in a repository.
    *   Input: `GetItemNodeIdSchema` (owner, repo, itemNumber, type: 'issue' | 'pr')
    *   Output: `{ nodeId: string }`
    *   Note: This is useful for getting the `contentId` needed for `add_item_to_project`.
*   **`create_project_status_update`**: Add a status update to a GitHub Project V2.
    *   Input: `CreateProjectStatusUpdateSchema` (projectId, body)
    *   Note: `projectId` must be the Node ID of the project.
    *   Output: The created status update object, including `id`, `body`, `createdAt`, `author`, etc.
*   **`get_node_id_by_login`**: Get the Node ID for a user or organization login name.
    *   Input: `GetNodeIdByLoginSchema` (login)
    *   Output: `{ nodeId: string }`
    *   Note: Useful for getting the `ownerId` required by `create_project`.
