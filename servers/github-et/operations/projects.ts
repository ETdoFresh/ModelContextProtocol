import { z } from "zod";
import { githubGraphQLRequest, githubRequest } from "../common/utils.js"; // Corrected import path
import { GitHubIssueSchema, GitHubPullRequestSchema } from "../common/types.js"; // Assuming types.ts exists in common

// --- Schemas ---

// Example: Schema to find a project ID by owner login and project number
export const FindProjectIDSchema = z.object({
  ownerLogin: z.string().describe("Login of the user or organization owning the project"),
  projectNumber: z.number().int().positive().describe("The number of the project (visible in the URL)"),
});

// Example: Schema to list items in a project
export const ListProjectItemsSchema = z.object({
  projectId: z.string().describe("The Node ID of the project (e.g., 'PVT_kwDOA...')"),
  first: z.number().int().positive().optional().default(30).describe("Number of items to fetch"),
  after: z.string().optional().describe("Cursor for pagination"),
});

// Example: Schema to add an existing issue/PR to a project
export const AddProjectItemSchema = z.object({
    projectId: z.string().describe("The Node ID of the project"),
    contentId: z.string().describe("The Node ID of the Issue or Pull Request to add"),
});

// Schema for getting item node ID
export const GetItemNodeIdSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    itemNumber: z.number().int().positive(),
    type: z.enum(['issue', 'pr']),
});

export const CreateProjectSchema = z.object({
    ownerId: z.string().describe("The Node ID of the owner (User or Organization) for the new project."),
    title: z.string().describe("The title of the new project."),
    repositoryId: z.string().optional().describe("Optional: The Node ID of a repository to link to the project.")
});

export const UpdateProjectSchema = z.object({
    projectId: z.string().describe("The Node ID of the project to update."),
    title: z.string().optional().describe("The new title for the project."),
    shortDescription: z.string().optional().nullable().describe("The new short description for the project. Use null to clear."),
    readme: z.string().optional().nullable().describe("The new README content for the project. Use null to clear."),
    closed: z.boolean().optional().describe("Set to true to close the project, false to reopen.")
});

export const DeleteProjectSchema = z.object({
    projectId: z.string().describe("The Node ID of the project to delete.")
});

// Schema for creating a status update
export const CreateProjectStatusUpdateSchema = z.object({
    projectId: z.string().describe("The Node ID of the project to add the status update to."),
    body: z.string().describe("The content of the status update."),
});

// Schema for getting Node ID by login
export const GetNodeIdByLoginSchema = z.object({
    login: z.string().describe("The username or organization name.")
});


// --- GraphQL Queries/Mutations (as strings) ---

const GET_PROJECT_ID_QUERY = `
  query GetProject($ownerLogin: String!, $projectNumber: Int!) {
    user(login: $ownerLogin) {
      projectV2(number: $projectNumber) {
        id
        title
      }
    }
    organization(login: $ownerLogin) {
       projectV2(number: $projectNumber) {
        id
        title
      }
    }
  }
`;

const LIST_PROJECT_ITEMS_QUERY = `
  query ListProjectItems($projectId: ID!, $first: Int, $after: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        id
        title
        items(first: $first, after: $after) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            createdAt
            updatedAt
            isArchived
            type # DRAFT_ISSUE, ISSUE, PULL_REQUEST
            content {
              ... on DraftIssue {
                 title
                 body
              }
              ... on Issue {
                id
                number
                title
                url
                state
                repository { nameWithOwner }
              }
              ... on PullRequest {
                id
                number
                title
                url
                state
                repository { nameWithOwner }
              }
            }
            # Example: Get value of a 'Status' field (replace with your actual field name/ID)
            # fieldValueByName(name: "Status") {
            #   ... on ProjectV2ItemFieldSingleSelectValue {
            #     name
            #     optionId
            #   }
            # }
          }
        }
      }
    }
  }
`;

const ADD_PROJECT_ITEM_MUTATION = `
  mutation AddProjectItem($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
      item {
        id # ID of the item within the project
      }
    }
  }
`;

const CREATE_PROJECT_MUTATION = `
  mutation CreateProject($ownerId: ID!, $title: String!, $repositoryId: ID) {
    createProjectV2(input: {ownerId: $ownerId, title: $title, repositoryId: $repositoryId}) {
      projectV2 {
        id
        title
        url
      }
    }
  }
`;

const UPDATE_PROJECT_MUTATION = `
  mutation UpdateProject(
      $projectId: ID!, 
      $title: String, 
      $shortDescription: String, 
      $readme: String, 
      $closed: Boolean
    ) {
    updateProjectV2(input: {
        projectId: $projectId, 
        title: $title, 
        shortDescription: $shortDescription, 
        readme: $readme, 
        closed: $closed
      }) {
      projectV2 {
        id
        title
        shortDescription
        readme
        closed
        url
      }
    }
  }
`;

const DELETE_PROJECT_MUTATION = `
  mutation DeleteProject($projectId: ID!) {
    deleteProjectV2(input: {projectId: $projectId}) {
      projectV2 {
        id # Returns the ID of the deleted project
      }
    }
  }
`;

// Mutation for creating a status update
const CREATE_PROJECT_STATUS_UPDATE_MUTATION = `
  mutation CreateProjectStatusUpdate($projectId: ID!, $body: String!) {
    createProjectV2StatusUpdate(input: {projectId: $projectId, body: $body}) {
      statusUpdate {
        id
        createdAt
        body
        # status # Add if exists in API
        # title # Add if exists in API
        author {
          login
        }
        projectV2 {
            id
            title
        }
      }
    }
  }
`;

// Query to get user or organization Node ID
const GET_NODE_ID_BY_LOGIN_QUERY = `
  query GetNodeId($login: String!) {
    user(login: $login) {
      id
    }
    organization(login: $login) {
      id
    }
  }
`;


// --- Functions ---

// Helper to find Project ID (needed for most other operations)
export async function findProjectID(ownerLogin: string, projectNumber: number): Promise<{ id: string; title: string } | null> {
  const data = await githubGraphQLRequest(GET_PROJECT_ID_QUERY, { ownerLogin, projectNumber });
  // GraphQL returns null for the field if the user/org doesn't exist or doesn't have the project
  const projectData = data?.user?.projectV2 || data?.organization?.projectV2;
  if (!projectData?.id) {
      // Provide a more specific error message based on whether user/org data was returned at all
      if (!data?.user && !data?.organization) {
         throw new Error(`Owner '${ownerLogin}' not found or not accessible.`);
      }
       throw new Error(`Project number ${projectNumber} not found for owner '${ownerLogin}', or you may lack permissions to view it.`);
  }
  return { id: projectData.id, title: projectData.title };
}

// List items
export async function listProjectItems(projectId: string, first?: number, after?: string) {
  const variables: Record<string, any> = { projectId };
  if (first !== undefined) variables.first = first;
  if (after !== undefined) variables.after = after;

  const data = await githubGraphQLRequest(LIST_PROJECT_ITEMS_QUERY, variables);
   if (!data?.node) {
       // This could mean the node ID is wrong, or permissions are missing.
       throw new Error(`Project with Node ID '${projectId}' not found or access denied.`);
   }
   // Check if the returned node is actually a ProjectV2 by looking for a known field like 'items'
   if (typeof (data.node as any).items !== 'object' || (data.node as any).items === null) {
       throw new Error(`Node ID '${projectId}' does not appear to be a V2 Project.`);
   }
  return data.node.items; // Return the items connection object (includes nodes, pageInfo, totalCount)
}

// Add Item
export async function addProjectItem(projectId: string, contentId: string) {
    const data = await githubGraphQLRequest(ADD_PROJECT_ITEM_MUTATION, { projectId, contentId });
    // Check specifically for the nested structure expected on success
    const itemId = data?.addProjectV2ItemById?.item?.id;
    if (!itemId) {
        // Attempt to provide a more helpful error based on typical GraphQL responses
        console.error("Failed to add project item. Response data:", JSON.stringify(data, null, 2));
        throw new Error(`Failed to add item with Node ID '${contentId}' to project with Node ID '${projectId}'. Verify the IDs are correct, the item type is supported (Issue/PR), and you have write permissions for the project.`);
    }
    return data.addProjectV2ItemById.item; // Return the newly added project item node { id: '...' }
}

// Helper to get Issue/PR Node ID (using REST API)
export async function getItemNodeId(owner: string, repo: string, itemNumber: number, type: 'issue' | 'pr'): Promise<string> {
    const endpoint = type === 'issue' ? 'issues' : 'pulls';
    const url = `/repos/${owner}/${repo}/${endpoint}/${itemNumber}`; // Use relative path for githubRequest

    try {
        const response = await githubRequest(url); // githubRequest handles base URL

        // Use Zod to parse and extract node_id - ensure schemas include node_id
         if (type === 'issue') {
             // Ensure GitHubIssueSchema has node_id defined
             const issue = GitHubIssueSchema.passthrough().parse(response); // Use passthrough for flexibility
             if (!issue.node_id) throw new Error(`'node_id' missing in issue response.`);
             return issue.node_id;
         } else {
              // Ensure GitHubPullRequestSchema has node_id defined
             const pr = GitHubPullRequestSchema.passthrough().parse(response); // Use passthrough for flexibility
             if (!pr.node_id) throw new Error(`'node_id' missing in pull request response.`);
             return pr.node_id;
         }
    } catch (e: any) {
        console.error(`Failed to parse ${type} response or get node_id for ${owner}/${repo}#${itemNumber}:`, e);
        if (e instanceof z.ZodError) {
             throw new Error(`Could not parse response for ${type} #${itemNumber} in ${owner}/${repo}. Schema validation failed: ${e.errors.map(err => err.message).join(', ')}`);
        }
        // Re-throw GitHub API errors or other exceptions
        throw new Error(`Could not retrieve Node ID for ${type} #${itemNumber} in ${owner}/${repo}. Reason: ${e.message || 'Unknown error'}`);
    }
}

export async function createProject(
    ownerId: string,
    title: string,
    repositoryId?: string
): Promise<{ id: string; title: string; url: string }> {
    const variables: Record<string, any> = { ownerId, title };
    if (repositoryId) {
        variables.repositoryId = repositoryId;
    }
    const data = await githubGraphQLRequest(CREATE_PROJECT_MUTATION, variables);

    if (!data?.createProjectV2?.projectV2?.id) {
        console.error("Failed to create project. Response data:", JSON.stringify(data, null, 2));
        throw new Error(`Failed to create project for owner ID ${ownerId}. Check owner ID and permissions.`);
    }
    return data.createProjectV2.projectV2;
}

export async function updateProject(
    updates: z.infer<typeof UpdateProjectSchema>
): Promise<{ id: string; title: string | null; shortDescription: string | null; readme: string | null; closed: boolean; url: string }> {
    // Prepare variables, ensuring we don't send empty strings if null was intended
    const variables: Record<string, any> = { projectId: updates.projectId };
    if (updates.title !== undefined) variables.title = updates.title;
    if (updates.shortDescription !== undefined) variables.shortDescription = updates.shortDescription;
    if (updates.readme !== undefined) variables.readme = updates.readme;
    if (updates.closed !== undefined) variables.closed = updates.closed;

    // Check if any update fields were actually provided besides projectId
    if (Object.keys(variables).length <= 1) {
        throw new Error("No update fields provided for the project.");
    }

    const data = await githubGraphQLRequest(UPDATE_PROJECT_MUTATION, variables);

    if (!data?.updateProjectV2?.projectV2?.id) {
        console.error("Failed to update project. Response data:", JSON.stringify(data, null, 2));
        throw new Error(`Failed to update project ${updates.projectId}. Check project ID and permissions.`);
    }
    return data.updateProjectV2.projectV2;
}

export async function deleteProject(projectId: string): Promise<{ id: string }> {
    const data = await githubGraphQLRequest(DELETE_PROJECT_MUTATION, { projectId });

    if (!data?.deleteProjectV2?.projectV2?.id) {
        console.error("Failed to delete project. Response data:", JSON.stringify(data, null, 2));
        throw new Error(`Failed to delete project ${projectId}. Check project ID and permissions.`);
    }
    // Return just the ID to confirm deletion
    return { id: data.deleteProjectV2.projectV2.id };
}

// Function to create a project status update
export async function createProjectStatusUpdate(
    projectId: string,
    body: string
): Promise<any> { // Define a specific return type based on mutation response
    const variables = { projectId, body };
    const data = await githubGraphQLRequest(CREATE_PROJECT_STATUS_UPDATE_MUTATION, variables);

    if (!data?.createProjectV2StatusUpdate?.statusUpdate?.id) {
        console.error("Failed to create project status update. Response data:", JSON.stringify(data, null, 2));
        throw new Error(`Failed to create status update for project ${projectId}. Check project ID and permissions.`);
    }
    return data.createProjectV2StatusUpdate.statusUpdate;
}

// Function to get Node ID for a user or organization login
export async function getNodeIdByLogin(login: string): Promise<{ nodeId: string } | null> {
    const data = await githubGraphQLRequest(GET_NODE_ID_BY_LOGIN_QUERY, { login });

    // Check if user ID exists
    if (data?.user?.id) {
        return { nodeId: data.user.id };
    }
    // Check if organization ID exists
    if (data?.organization?.id) {
        return { nodeId: data.organization.id };
    }

    // If neither was found (and githubGraphQLRequest didn't throw for critical errors)
    // it means the login doesn't correspond to an accessible user or org.
    // Log the response for debugging, as non-critical errors might be present.
    console.warn(`Could not resolve login '${login}' to a user or organization. Response data:`, JSON.stringify(data, null, 2));
    throw new Error(`Could not resolve login '${login}' to a user or organization, or you may lack permissions.`);
} 