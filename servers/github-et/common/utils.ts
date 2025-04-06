import { getUserAgent } from "universal-user-agent";
import { createGitHubError } from "./errors.js";
import { VERSION } from "./version.js";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export function buildUrl(baseUrl: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
}

const USER_AGENT = `modelcontextprotocol/servers/github/v${VERSION} ${getUserAgent()}`;

export async function githubRequest(
  path: string,
  options: RequestInit = {},
  returnType: "json" | "text" | "response" = "json"
): Promise<any> {
  const url = path.startsWith("https://") ? path : `https://api.github.com${path}`;

  // Initialize headers as a simple Record
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };

  // Manually merge options.headers if they exist
  if (options.headers) {
    // Headers can be Headers object, string[][], or Record<string, string>
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      // It's a Record<string, string>
      Object.assign(headers, options.headers);
    }
  }

  // Now add Authorization safely
  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`;
  }

  // Prepare the body
  let processedBody = options.body;
  if (processedBody && typeof processedBody !== "string" && !(processedBody instanceof Blob) && !(processedBody instanceof FormData) && !(processedBody instanceof URLSearchParams) && !(processedBody instanceof ReadableStream)) {
    processedBody = JSON.stringify(processedBody);
    // Add Content-Type if we stringified the body and it wasn't already set
    if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
    }
  }

  // Construct final options for fetch
  const fetchOptions: RequestInit = {
    // Copy other options like method, cache, credentials etc.
    method: options.method,
    credentials: options.credentials,
    cache: options.cache,
    redirect: options.redirect,
    referrer: options.referrer,
    referrerPolicy: options.referrerPolicy,
    integrity: options.integrity,
    keepalive: options.keepalive,
    signal: options.signal,
    // Use the processed headers and body
    headers: headers, 
    body: processedBody as BodyInit | null | undefined
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GitHub API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    if (returnType === "response") {
      return response;
    }
    if (returnType === "text") {
      return await response.text();
    }
    // Default to JSON
    const jsonResponse = await response.json();
    if (jsonResponse && typeof jsonResponse === 'object' && 'documentation_url' in jsonResponse) {
        console.warn(`GitHub API response may indicate an issue: ${jsonResponse['documentation_url']}`);
    }
    return jsonResponse;

  } catch (error) {
    console.error("Error during GitHub request:", error);
    throw new Error(`Failed to execute GitHub request to ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function validateBranchName(branch: string): string {
  const sanitized = branch.trim();
  if (!sanitized) {
    throw new Error("Branch name cannot be empty");
  }
  if (sanitized.includes("..")) {
    throw new Error("Branch name cannot contain '..'");
  }
  if (/[\s~^:?*[\\\]]/.test(sanitized)) {
    throw new Error("Branch name contains invalid characters");
  }
  if (sanitized.startsWith("/") || sanitized.endsWith("/")) {
    throw new Error("Branch name cannot start or end with '/'");
  }
  if (sanitized.endsWith(".lock")) {
    throw new Error("Branch name cannot end with '.lock'");
  }
  return sanitized;
}

export function validateRepositoryName(name: string): string {
  const sanitized = name.trim().toLowerCase();
  if (!sanitized) {
    throw new Error("Repository name cannot be empty");
  }
  if (!/^[a-z0-9_.-]+$/.test(sanitized)) {
    throw new Error(
      "Repository name can only contain lowercase letters, numbers, hyphens, periods, and underscores"
    );
  }
  if (sanitized.startsWith(".") || sanitized.endsWith(".")) {
    throw new Error("Repository name cannot start or end with a period");
  }
  return sanitized;
}

export function validateOwnerName(owner: string): string {
  const sanitized = owner.trim().toLowerCase();
  if (!sanitized) {
    throw new Error("Owner name cannot be empty");
  }
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/.test(sanitized)) {
    throw new Error(
      "Owner name must start with a letter or number and can contain up to 39 characters"
    );
  }
  return sanitized;
}

export async function checkBranchExists(
  owner: string,
  repo: string,
  branch: string
): Promise<boolean> {
  try {
    await githubRequest(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`
    );
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function checkUserExists(username: string): Promise<boolean> {
  try {
    await githubRequest(`https://api.github.com/users/${username}`);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return false;
    }
    throw error;
  }
}

const GRAPHQL_USER_AGENT = `modelcontextprotocol/servers/github-graphql/v${VERSION} ${getUserAgent()}`;

export async function githubGraphQLRequest(
  query: string,
  variables?: Record<string, any>
): Promise<any> { // Consider defining a more specific GraphQLResponse type
  const url = "https://api.github.com/graphql";
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": GRAPHQL_USER_AGENT,
  };

  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`;
  } else {
     throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set.");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const responseBody = await response.json() as any;

    // Check for errors, but ONLY throw if data is also missing or response was not ok.
    // Some queries (like user/org lookup) might return partial data AND errors.
    if ((!response.ok || responseBody.data == null) && responseBody.errors) {
        console.error("GraphQL Error Response:", JSON.stringify(responseBody, null, 2));
        const errorMessage = responseBody.errors?.[0]?.message || `GraphQL request failed with status ${response.status}`;
        throw new Error(`GitHub GraphQL Error: ${errorMessage}`);
    }

     // Check for completely unexpected response format (no data and no errors)
     if (responseBody.data === undefined && responseBody.errors === undefined) {
        console.error("Unexpected GraphQL Response:", JSON.stringify(responseBody, null, 2));
        throw new Error("Unexpected response format from GitHub GraphQL API.");
    }

    // Log warnings if errors exist alongside data, but proceed.
    if (responseBody.data != null && responseBody.errors) {
        console.warn("GraphQL Response contained non-critical errors:", JSON.stringify(responseBody.errors, null, 2));
    }

    return responseBody.data; // Return data even if non-critical errors were present

  } catch (error) {
      console.error("Error during GraphQL request:", error);
       if (error instanceof Error && error.message.startsWith("GitHub GraphQL Error:")) {
           throw error;
       }
      throw new Error(`Failed to execute GraphQL request: ${error instanceof Error ? error.message : String(error)}`);
  }
}