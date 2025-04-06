import { z } from "zod";
import { githubRequest, buildUrl } from "../common/utils.js";
import { GitHubIssueSchema } from "../common/types.js";
import * as projects from './projects.js';

export const GetIssueSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
});

export const IssueCommentSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
  body: z.string(),
});

export const CreateIssueOptionsSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().int().positive().optional(),
  labels: z.array(z.string()).optional(),
  projectId: z.string().optional().describe("Optional: Node ID of the GitHub Project V2 to add this issue to."),
});

export const CreateIssueSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  ...CreateIssueOptionsSchema.shape,
});

export const ListIssuesOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  direction: z.enum(["asc", "desc"]).optional(),
  labels: z.array(z.string()).optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
  since: z.string().optional(),
  sort: z.enum(["created", "updated", "comments"]).optional(),
  state: z.enum(["open", "closed", "all"]).optional(),
});

export const UpdateIssueOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
  title: z.string().optional(),
  body: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().optional(),
  labels: z.array(z.string()).optional(),
  state: z.enum(["open", "closed"]).optional(),
});

export async function getIssue(owner: string, repo: string, issue_number: number) {
  return githubRequest(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`);
}

export async function addIssueComment(
  owner: string,
  repo: string,
  issue_number: number,
  body: string
) {
  return githubRequest(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function createIssue(
  owner: string,
  repo: string,
  options: z.infer<typeof CreateIssueOptionsSchema>
): Promise<z.infer<typeof GitHubIssueSchema> & { projectWarning?: string }> {
  const { projectId, ...restOptions } = options;

  if (restOptions.milestone && typeof restOptions.milestone !== 'number') {
      console.warn('Milestone should be a number (ID), converting if possible...');
      const milestoneNum = parseInt(String(restOptions.milestone), 10);
      if (isNaN(milestoneNum)) {
          throw new Error('Invalid milestone number provided.');
      }
      restOptions.milestone = milestoneNum;
  }

  const issueResponse = await githubRequest(
    `/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      body: JSON.stringify(restOptions),
    }
  );

  const createdIssue = GitHubIssueSchema.passthrough().parse(issueResponse);

  let projectWarning: string | undefined = undefined;

  if (projectId && createdIssue.node_id) {
    try {
      console.log(`Attempting to add issue ${createdIssue.number} (Node ID: ${createdIssue.node_id}) to project ${projectId}`);
      await projects.addProjectItem(projectId, createdIssue.node_id);
      console.log(`Successfully added issue ${createdIssue.number} to project ${projectId}`);
    } catch (projectError) {
      const message = `[WARNING] Issue ${createdIssue.number} created successfully, but failed to add to project ${projectId}: ${projectError instanceof Error ? projectError.message : projectError}`;
      console.warn(message);
      projectWarning = message;
    }
  }

  return { ...createdIssue, projectWarning };
}

export async function listIssues(
  owner: string,
  repo: string,
  options: Omit<z.infer<typeof ListIssuesOptionsSchema>, "owner" | "repo">
) {
  const urlParams: Record<string, string | undefined> = {
    direction: options.direction,
    labels: options.labels?.join(","),
    page: options.page?.toString(),
    per_page: options.per_page?.toString(),
    since: options.since,
    sort: options.sort,
    state: options.state
  };

  return githubRequest(
    buildUrl(`https://api.github.com/repos/${owner}/${repo}/issues`, urlParams)
  );
}

export async function updateIssue(
  owner: string,
  repo: string,
  issue_number: number,
  options: z.infer<typeof UpdateIssueOptionsSchema>
) {
  const { ...updateOptions } = options;

  if (updateOptions.milestone && typeof updateOptions.milestone !== 'number') {
      console.warn('Milestone should be a number (ID), converting if possible...');
      const milestoneNum = parseInt(String(updateOptions.milestone), 10);
      if (isNaN(milestoneNum)) {
          throw new Error('Invalid milestone number provided for update.');
      }
      updateOptions.milestone = milestoneNum;
  }

  return githubRequest(
    `/repos/${owner}/${repo}/issues/${issue_number}`,
    {
      method: "PATCH",
      body: JSON.stringify(updateOptions),
    }
  );
}