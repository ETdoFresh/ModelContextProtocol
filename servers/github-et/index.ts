#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fetch from 'node-fetch';

import * as repository from './operations/repository.js';
import * as issues from './operations/issues.js';
import * as pulls from './operations/pulls.js';
import * as branches from './operations/branches.js';
import * as files from './operations/files.js';
import * as projects from './operations/projects.js';
import {
  GitHubError,
  isGitHubError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

if (!globalThis.fetch) {
  globalThis.fetch = fetch as unknown as typeof global.fetch;
}

const server = new Server(
  {
    name: "@mcp/github-server",
    version: VERSION,
    description: "GitHub MCP Server with Projects V2"
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      { name: "create_repo", description: "Create a new repository.", inputSchema: zodToJsonSchema(repository.CreateRepositoryOptionsSchema) },
      { name: "fork_repository", description: "Fork a GitHub repository.", inputSchema: zodToJsonSchema(repository.ForkRepositorySchema) },
      { name: "search_repositories", description: "Search for GitHub repositories.", inputSchema: zodToJsonSchema(repository.SearchRepositoriesSchema) },
      { name: "get_repository_node_id", description: "Get the Node ID for a given repository.", inputSchema: zodToJsonSchema(repository.GetRepositoryNodeIdSchema) },
      { name: "get_issue", description: "Get details about a specific issue.", inputSchema: zodToJsonSchema(issues.GetIssueSchema) },
      { name: "list_issues", description: "List issues for a repository.", inputSchema: zodToJsonSchema(issues.ListIssuesOptionsSchema) },
      { name: "create_issue", description: "Create a new issue. Can optionally add it to a Project V2.", inputSchema: zodToJsonSchema(issues.CreateIssueSchema) },
      { name: "update_issue", description: "Update an existing issue.", inputSchema: zodToJsonSchema(issues.UpdateIssueOptionsSchema) },
      { name: "add_issue_comment", description: "Add a comment to an existing issue.", inputSchema: zodToJsonSchema(issues.IssueCommentSchema) },
      { name: "get_pull_request", description: "Get details about a specific pull request.", inputSchema: zodToJsonSchema(pulls.GetPullRequestSchema) },
      { name: "list_pull_requests", description: "List pull requests for a repository.", inputSchema: zodToJsonSchema(pulls.ListPullRequestsSchema) },
      { name: "create_pull_request", description: "Create a new pull request. Can optionally add it to a Project V2.", inputSchema: zodToJsonSchema(pulls.CreatePullRequestSchema) },
      { name: "update_pull_request", description: "Update an existing pull request.", inputSchema: zodToJsonSchema(pulls.UpdatePullRequestSchema) },
      { name: "create_pull_request_review", description: "Create a review for a pull request.", inputSchema: zodToJsonSchema(pulls.CreatePullRequestReviewSchema) },
      { name: "merge_pull_request", description: "Merge a pull request.", inputSchema: zodToJsonSchema(pulls.MergePullRequestSchema) },
      { name: "update_pull_request_branch", description: "Update a pull request branch with changes from the base branch.", inputSchema: zodToJsonSchema(pulls.UpdatePullRequestBranchSchema) },
      { name: "create_branch", description: "Create a new branch.", inputSchema: zodToJsonSchema(branches.CreateBranchSchema) },
      { name: "get_file_content", description: "Get the content of a file or directory.", inputSchema: zodToJsonSchema(files.GetFileContentsSchema) },
      { name: "upsert_file", description: "Create or update a file in a repository.", inputSchema: zodToJsonSchema(files.CreateOrUpdateFileSchema) },
      { name: "create_project", description: "Create a new GitHub Project V2.", inputSchema: zodToJsonSchema(projects.CreateProjectSchema) },
      { name: "update_project", description: "Update a GitHub Project V2 (title, description, readme, close/reopen).", inputSchema: zodToJsonSchema(projects.UpdateProjectSchema) },
      { name: "delete_project", description: "Delete a GitHub Project V2.", inputSchema: zodToJsonSchema(projects.DeleteProjectSchema) },
      { name: "find_project_id", description: "Find the Node ID of a GitHub Project V2 by owner login and project number.", inputSchema: zodToJsonSchema(projects.FindProjectIDSchema) },
      { name: "list_project_items", description: "List items (Issues, PRs, Drafts) in a GitHub Project V2.", inputSchema: zodToJsonSchema(projects.ListProjectItemsSchema) },
      { name: "add_item_to_project", description: "Add an existing Issue or Pull Request to a GitHub Project V2 using their Node IDs.", inputSchema: zodToJsonSchema(projects.AddProjectItemSchema) },
      { name: "get_item_node_id", description: "Get the Node ID for a given Issue or Pull Request number in a repository.", inputSchema: zodToJsonSchema(projects.GetItemNodeIdSchema) },
      { name: "create_project_status_update", description: "Add a status update to a GitHub Project V2.", inputSchema: zodToJsonSchema(projects.CreateProjectStatusUpdateSchema) },
      { name: "get_node_id_by_login", description: "Get the Node ID for a user or organization login name.", inputSchema: zodToJsonSchema(projects.GetNodeIdByLoginSchema) },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    if (!request?.params?.name || !request.params.arguments) {
      throw new Error("Invalid request: Missing tool name or arguments.");
    }

    const toolName = request.params.name;
    const args = request.params.arguments;

    console.log(`Executing tool: ${toolName}`);
    console.log(`Arguments: ${JSON.stringify(args, null, 2)}`);

    let result: any;

    switch (toolName) {
      case "create_repo": {
        const parsedArgs = repository.CreateRepositoryOptionsSchema.parse(args);
        result = await repository.createRepository(parsedArgs);
        break;
      }
      case "fork_repository": {
        const parsedArgs = repository.ForkRepositorySchema.parse(args);
        result = await repository.forkRepository(parsedArgs.owner, parsedArgs.repo, parsedArgs.organization);
        break;
      }
      case "search_repositories": {
        const parsedArgs = repository.SearchRepositoriesSchema.parse(args);
        result = await repository.searchRepositories(parsedArgs.query, parsedArgs.page, parsedArgs.perPage);
        break;
      }
      case "get_repository_node_id": {
        const parsedArgs = repository.GetRepositoryNodeIdSchema.parse(args);
        result = await repository.getRepositoryNodeId(parsedArgs.owner, parsedArgs.repo);
        break;
      }
      case "get_issue": {
        const parsedArgs = issues.GetIssueSchema.parse(args);
        result = await issues.getIssue(parsedArgs.owner, parsedArgs.repo, parsedArgs.issue_number);
        break;
      }
      case "list_issues": {
        const parsedArgs = issues.ListIssuesOptionsSchema.parse(args);
        const { owner, repo, ...options } = parsedArgs;
        result = await issues.listIssues(owner, repo, options);
        break;
      }
      case "create_issue": {
        const parsedArgs = issues.CreateIssueSchema.parse(args);
        const { owner, repo, ...options } = parsedArgs;
        result = await issues.createIssue(owner, repo, options);
        break;
      }
      case "update_issue": {
        const parsedArgs = issues.UpdateIssueOptionsSchema.parse(args);
        result = await issues.updateIssue(parsedArgs.owner, parsedArgs.repo, parsedArgs.issue_number, parsedArgs);
        break;
      }
      case "add_issue_comment": {
        const parsedArgs = issues.IssueCommentSchema.parse(args);
        result = await issues.addIssueComment(parsedArgs.owner, parsedArgs.repo, parsedArgs.issue_number, parsedArgs.body);
        break;
      }
      case "get_pull_request": {
        const parsedArgs = pulls.GetPullRequestSchema.parse(args);
        result = await pulls.getPullRequest(parsedArgs.owner, parsedArgs.repo, parsedArgs.pull_number);
        break;
      }
      case "list_pull_requests": {
        const parsedArgs = pulls.ListPullRequestsSchema.parse(args);
        const { owner, repo, ...options } = parsedArgs;
        result = await pulls.listPullRequests(owner, repo, options);
        break;
      }
      case "create_pull_request": {
        const parsedArgs = pulls.CreatePullRequestSchema.parse(args);
        const { owner, repo, ...options } = parsedArgs;
        result = await pulls.createPullRequest(owner, repo, options);
        break;
      }
      case "update_pull_request": {
        const parsedArgs = pulls.UpdatePullRequestSchema.parse(args);
        const { owner, repo, pull_number, ...options } = parsedArgs;
        result = await pulls.updatePullRequest(owner, repo, pull_number, options);
        break;
      }
      case "create_pull_request_review": {
        const parsedArgs = pulls.CreatePullRequestReviewSchema.parse(args);
        result = await pulls.createPullRequestReview(parsedArgs.owner, parsedArgs.repo, parsedArgs.pull_number, parsedArgs);
        break;
      }
      case "merge_pull_request": {
        const parsedArgs = pulls.MergePullRequestSchema.parse(args);
        result = await pulls.mergePullRequest(parsedArgs.owner, parsedArgs.repo, parsedArgs.pull_number, parsedArgs);
        break;
      }
      case "update_pull_request_branch": {
        const parsedArgs = pulls.UpdatePullRequestBranchSchema.parse(args);
        result = await pulls.updatePullRequestBranch(parsedArgs.owner, parsedArgs.repo, parsedArgs.pull_number, parsedArgs.expected_head_sha);
        break;
      }
      case "create_branch": {
        const parsedArgs = branches.CreateBranchSchema.parse(args);
        result = await branches.createBranchFromRef(parsedArgs.owner, parsedArgs.repo, parsedArgs.branch, parsedArgs.from_branch);
        break;
      }
      case "get_file_content": {
        const parsedArgs = files.GetFileContentsSchema.parse(args);
        result = await files.getFileContents(parsedArgs.owner, parsedArgs.repo, parsedArgs.path, parsedArgs.branch);
        break;
      }
      case "upsert_file": {
        const parsedArgs = files.CreateOrUpdateFileSchema.parse(args);
        result = await files.createOrUpdateFile(parsedArgs.owner, parsedArgs.repo, parsedArgs.path, parsedArgs.content, parsedArgs.message, parsedArgs.branch, parsedArgs.sha);
        break;
      }
      case "create_project": {
        const parsedArgs = projects.CreateProjectSchema.parse(args);
        result = await projects.createProject(parsedArgs.ownerId, parsedArgs.title, parsedArgs.repositoryId);
        break;
      }
      case "update_project": {
        const parsedArgs = projects.UpdateProjectSchema.parse(args);
        result = await projects.updateProject(parsedArgs);
        break;
      }
      case "delete_project": {
        const parsedArgs = projects.DeleteProjectSchema.parse(args);
        result = await projects.deleteProject(parsedArgs.projectId);
        break;
      }
      case "find_project_id": {
        const parsedArgs = projects.FindProjectIDSchema.parse(args);
        result = await projects.findProjectID(parsedArgs.ownerLogin, parsedArgs.projectNumber);
        break;
      }
      case "list_project_items": {
        const parsedArgs = projects.ListProjectItemsSchema.parse(args);
        result = await projects.listProjectItems(parsedArgs.projectId, parsedArgs.first, parsedArgs.after);
        break;
      }
      case "add_item_to_project": {
        const parsedArgs = projects.AddProjectItemSchema.parse(args);
        result = await projects.addProjectItem(parsedArgs.projectId, parsedArgs.contentId);
        break;
      }
      case "get_item_node_id": {
        const parsedArgs = projects.GetItemNodeIdSchema.parse(args);
        const nodeId = await projects.getItemNodeId(parsedArgs.owner, parsedArgs.repo, parsedArgs.itemNumber, parsedArgs.type);
        result = { nodeId };
        break;
      }
      case "create_project_status_update": {
        const parsedArgs = projects.CreateProjectStatusUpdateSchema.parse(args);
        result = await projects.createProjectStatusUpdate(parsedArgs.projectId, parsedArgs.body);
        break;
      }
      case "get_node_id_by_login": {
        const parsedArgs = projects.GetNodeIdByLoginSchema.parse(args);
        result = await projects.getNodeIdByLogin(parsedArgs.login);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    console.error(`Error executing tool ${request?.params?.name}:`, error);

    let errorMessage = `Tool execution failed: ${error.message || String(error)}`;
    let errorType = "ToolExecutionError";

    if (error instanceof z.ZodError) {
      errorType = "InputValidationError";
      const validationErrors = error.errors.map(e => `${e.path.join('.') || 'input'}: ${e.message}`).join('; ');
      errorMessage = `Invalid arguments for tool ${request?.params?.name}: ${validationErrors}`;
    } else if (error instanceof Error && error.message.startsWith('GitHub GraphQL Error:')) {
        errorType = "GitHubGraphQLError";
        errorMessage = error.message;
    } else if (isGitHubError && isGitHubError(error)) {
        errorType = error.constructor.name || "GitHubAPIError";
        const status = (error as any).status ? `(Status ${(error as any).status})` : '';
        errorMessage = `GitHub API Error ${status}: ${error.message}`;
    } else if (error instanceof Error && error.message.startsWith('GitHub API request failed:')) {
        errorType = "GitHubAPIRequestError";
        const statusMatch = error.message.match(/failed: (\d+)/);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : 'Unknown';
        const bodyMatch = error.message.match(/Body: (.*)/s);
        const errorDetails = bodyMatch ? bodyMatch[1].trim() : error.message;
        errorMessage = `GitHub API Error (Status ${status}): ${errorDetails}`;
    }

    const processedError = new Error(errorMessage);
    processedError.name = errorType;
    throw processedError;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP Server (with Projects V2) running on stdio");
}

runServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});