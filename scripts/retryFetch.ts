const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export const fetchWithRetry = async (url: string): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500 || attempt === MAX_ATTEMPTS - 1) return response;
      lastError = new Error(`HTTP ${response.status} pour ${url}`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt));
  }

  throw lastError;
};
