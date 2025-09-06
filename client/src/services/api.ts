import { queryClient } from "@/lib/queryClient";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const token = localStorage.getItem("token");
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Only redirect to login if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }

  return response;
}

export async function uploadFile(file: File): Promise<string> {
  // Get upload URL
  const response = await apiRequest("POST", "/api/objects/upload");
  const { uploadURL } = await response.json();
  
  // Upload file directly to storage
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });
  
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }
  
  return uploadURL;
}

export function invalidateQueries(queryKey: string[]) {
  queryClient.invalidateQueries({ queryKey });
}
