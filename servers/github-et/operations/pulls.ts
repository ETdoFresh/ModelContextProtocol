import { z } from "zod";
import { githubRequest } from "../common/utils.js";
import {
  GitHubPullRequestSchema,
  GitHubIssueAssigneeSchema,
  GitHubRepositorySchema,
  PullRequestFileSchema,
  PullRequestCommentSchema,
  PullRequestReviewSchema,
  CombinedStatusSchema
} from "../common/types.js";
import * as projects from './projects.js'; // Import project operations

// Schema definitions
export const StatusCheckSchema = z.object({
  url: z.string(),
  state: z.enum(['error', 'failure', 'pending', 'success']),
  description: z.string().nullable(),
  target_url: z.string().nullable(),
  context: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// Input schemas
export const CreatePullRequestOptionsSchema = z.object({
    title: z.string(),
    head: z.string().describe("The name of the branch where your changes are implemented."),
    base: z.string().describe("The name of the branch you want the changes pulled into."),
    body: z.string().optional(),
    maintainer_can_modify: z.boolean().optional(),
    draft: z.boolean().optional(),
    projectId: z.string().optional().describe("Optional: Node ID of the GitHub Project V2 to add this pull request to."),
});

export const CreatePullRequestSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  ...CreatePullRequestOptionsSchema.shape,
});

export const GetPullRequestSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number")
});

export const ListPullRequestsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  state: z.enum(['open', 'closed', 'all']).optional().describe("State of the pull requests to return"),
  head: z.string().optional().describe("Filter by head user or head organization and branch name"),
  base: z.string().optional().describe("Filter by base branch name"),
  sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().describe("What to sort results by"),
  direction: z.enum(['asc', 'desc']).optional().describe("The direction of the sort"),
  per_page: z.number().optional().describe("Results per page (max 100)"),
  page: z.number().optional().describe("Page number of the results")
});

export const CreatePullRequestReviewSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
  commit_id: z.string().optional().describe("The SHA of the commit that needs a review"),
  body: z.string().describe("The body text of the review"),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe("The review action to perform"),
  comments: z.array(z.object({
    path: z.string().describe("The relative path to the file being commented on"),
    position: z.number().describe("The position in the diff where you want to add a review comment"),
    body: z.string().describe("Text of the review comment")
  })).optional().describe("Comments to post as part of the review")
});

export const MergePullRequestSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
  commit_title: z.string().optional().describe("Title for the automatic commit message"),
  commit_message: z.string().optional().describe("Extra detail to append to automatic commit message"),
  merge_method: z.enum(['merge', 'squash', 'rebase']).optional().describe("Merge method to use")
});

export const GetPullRequestFilesSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"), 
  pull_number: z.number().describe("Pull request number")
});

export const GetPullRequestStatusSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number")
});

export const UpdatePullRequestBranchSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
  expected_head_sha: z.string().optional().describe("The expected SHA of the pull request's HEAD ref")
});

export const GetPullRequestCommentsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number")
});

export const GetPullRequestReviewsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number")
});

// Schema for options when *updating* a PR (excluding path parameters)
export const UpdatePullRequestOptionsSchema = z.object({
    title: z.string().optional(),
    body: z.string().optional().nullable(), // Allow null to clear body
    state: z.enum(['open', 'closed']).optional(),
    base: z.string().optional().describe("The name of the branch you want the changes pulled into."),
    maintainer_can_modify: z.boolean().optional(),
});

export const UpdatePullRequestSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pull_number: z.number(),
  ...UpdatePullRequestOptionsSchema.shape,
});

// Function implementations
export async function createPullRequest(
  owner: string,
  repo: string,
  options: z.infer<typeof CreatePullRequestOptionsSchema>
): Promise<z.infer<typeof GitHubPullRequestSchema> & { projectWarning?: string }> {
  const { projectId, ...restOptions } = options; // Separate projectId

  // 1. Create the pull request using REST API
  const pullRequestResponse = await githubRequest(
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      // Explicitly stringify the body before passing
      body: JSON.stringify(restOptions),
    }
  );

  // Ensure parsing gives you node_id. Use passthrough to keep extra fields.
  const createdPR = GitHubPullRequestSchema.passthrough().parse(pullRequestResponse);

  let projectWarning: string | undefined = undefined;

  // 2. If projectId is provided, add the PR to the project using GraphQL
  if (projectId && createdPR.node_id) {
    try {
      console.log(`Attempting to add PR ${createdPR.number} (Node ID: ${createdPR.node_id}) to project ${projectId}`);
      await projects.addProjectItem(projectId, createdPR.node_id);
      console.log(`Successfully added PR ${createdPR.number} to project ${projectId}`);
    } catch (projectError) {
      // Log warning, don't throw, as the PR *was* created.
      const message = `[WARNING] PR ${createdPR.number} created successfully, but failed to add to project ${projectId}: ${projectError instanceof Error ? projectError.message : projectError}`;
      console.warn(message);
      projectWarning = message; // Capture warning to return in response
    }
  }

  // Return the created PR data, potentially with the warning
  return { ...createdPR, projectWarning };
}

export async function getPullRequest(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<z.infer<typeof GitHubPullRequestSchema>> {
  const response = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`
  );
  return GitHubPullRequestSchema.parse(response);
}

export async function listPullRequests(
  owner: string,
  repo: string,
  options: Omit<z.infer<typeof ListPullRequestsSchema>, 'owner' | 'repo'>
): Promise<z.infer<typeof GitHubPullRequestSchema>[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
  
  if (options.state) url.searchParams.append('state', options.state);
  if (options.head) url.searchParams.append('head', options.head);
  if (options.base) url.searchParams.append('base', options.base);
  if (options.sort) url.searchParams.append('sort', options.sort);
  if (options.direction) url.searchParams.append('direction', options.direction);
  if (options.per_page) url.searchParams.append('per_page', options.per_page.toString());
  if (options.page) url.searchParams.append('page', options.page.toString());

  const response = await githubRequest(url.toString());
  return z.array(GitHubPullRequestSchema).parse(response);
}

export async function updatePullRequest(
  owner: string,
  repo: string,
  pull_number: number,
  // Use the specific options schema, not the full one
  options: z.infer<typeof UpdatePullRequestOptionsSchema>
): Promise<z.infer<typeof GitHubPullRequestSchema>> {

  const response = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${pull_number}`,
    {
      method: "PATCH",
      body: JSON.stringify(options), // Pass only the update options, stringified
    }
  );
  return GitHubPullRequestSchema.parse(response);
}

export async function createPullRequestReview(
  owner: string,
  repo: string,
  pullNumber: number,
  // Use the specific options schema, excluding path params
  options: z.infer<Omit<typeof CreatePullRequestReviewSchema, 'owner' | 'repo' | 'pull_number'>>
): Promise<z.infer<typeof PullRequestReviewSchema>> {
  const response = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    {
      method: 'POST',
      body: JSON.stringify(options), // Stringify the body
    }
  );
  return PullRequestReviewSchema.parse(response);
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  // Use the specific options schema, excluding path params
  options?: z.infer<Omit<typeof MergePullRequestSchema, 'owner' | 'repo' | 'pull_number'>>
): Promise<{ merged: boolean; message: string; sha: string | null }> { // Provide a more specific return type
  const response = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    {
      method: 'PUT',
      body: options ? JSON.stringify(options) : undefined, // Stringify if options exist
    },
    'response' // Get the full response object to check status
  );

  if (response.status === 200) {
     const data = await response.json();
     return {
        merged: true,
        message: data.message || "Pull request successfully merged.",
        sha: data.sha || null
     };
  } else if (response.status === 405 || response.status === 409) {
      // Not mergeable or merge conflict
      const errorData = await response.json();
      return {
          merged: false,
          message: errorData.message || "Pull request is not mergeable.",
          sha: null
      };
  } else {
      // Other error
       const errorText = await response.text();
       throw new Error(`Failed to merge pull request: ${response.status} ${response.statusText}. Body: ${errorText}`);
  }
}

export async function getPullRequestFiles(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<z.infer<typeof PullRequestFileSchema>[]> {
  const response = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/files`
  );
  return z.array(PullRequestFileSchema).parse(response);
}

export async function updatePullRequestBranch(
  owner: string,
  repo: string,
  pullNumber: number,
  // Accept expected_head_sha directly as optional string
  expectedHeadSha?: string
): Promise<{ message: string; url: string } | { message: string; error?: string }> { // Provide specific return types
  const updateData = expectedHeadSha ? { expected_head_sha: expectedHeadSha } : undefined;

  const response = await githubRequest(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/update-branch`,
    {
      method: "PUT",
      body: updateData ? JSON.stringify(updateData) : undefined, // Stringify body if it exists
    },
     'response' // Get full response to check status
  );

  const responseBody = await response.json();

   if (response.status === 202) { // Accepted
        return responseBody; // Should match { message: string; url: string }
    } else {
        // Handle errors (e.g., 422 Unprocessable Entity, 403 Forbidden)
        return {
            message: responseBody.message || "Failed to update branch.",
            error: JSON.stringify(responseBody)
        };
    }
}

export async function getPullRequestComments(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<z.infer<typeof PullRequestCommentSchema>[]> {
  const response = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
  );
  return z.array(PullRequestCommentSchema).parse(response);
}

export async function getPullRequestReviews(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<z.infer<typeof PullRequestReviewSchema>[]> {
  const response = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`
  );
  return z.array(PullRequestReviewSchema).parse(response);
}

export async function getPullRequestStatus(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<z.infer<typeof CombinedStatusSchema>> {
  // First get the PR to get the head SHA
  const pr = await getPullRequest(owner, repo, pullNumber);
  const sha = pr.head.sha;

  // Then get the combined status for that SHA
  const response = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`
  );
  return CombinedStatusSchema.parse(response);
}