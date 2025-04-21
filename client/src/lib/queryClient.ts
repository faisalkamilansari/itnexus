import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
  // Add better debugging for form submissions
  if (method === 'POST' || method === 'PATCH') {
    console.log(`Request payload:`, JSON.stringify(data, null, 2));
  }
  
  try {
    // For login and register, we don't need to check authentication
    const isAuthEndpoint = url === '/api/login' || url === '/api/register';
    
    if (!isAuthEndpoint) {
      // Check if we're authenticated for non-auth endpoints
      const sessionCheckRes = await fetch('/api/session-info', {
        credentials: "include",
      });
      
      if (!sessionCheckRes.ok) {
        console.warn("Session check failed before API request");
      } else {
        const sessionInfo = await sessionCheckRes.json();
        console.log("Current session info:", sessionInfo);
        
        // If not authenticated and trying to access protected endpoint, abort
        if (!sessionInfo.isAuthenticated && !url.includes('/api/session-info')) {
          throw new Error("Not authenticated. Please log in before performing this action.");
        }
      }
    }
    
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Debug response headers
    console.log(`API Response: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      let errorText = await res.text();
      try {
        // Try to parse as JSON for better error details
        const errorJson = JSON.parse(errorText);
        console.error(`API Error (${res.status}):`, errorJson);
        // Extract useful details from error
        if (errorJson.message) {
          errorText = errorJson.message;
        }
        if (errorJson.errors) {
          errorText += ": " + JSON.stringify(errorJson.errors);
        }
      } catch (e) {
        // Text wasn't JSON, use as is
        console.error(`API Error (${res.status}): ${errorText}`);
      }
      
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
