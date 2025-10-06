/**
 * A generic retry mechanism with exponential backoff.
 * @param fn - The async function to retry.
 * @param maxRetries - The maximum number of retry attempts.
 * @param baseDelay - The initial delay in milliseconds.
 * @returns A promise that resolves with the result of the function.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, lastError.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded.');
}