import type { ApiErrorResponse } from '../../types/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface ApiClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

export class ApiClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async get<T>(path: string, query?: URLSearchParams): Promise<T> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.options.timeoutMs);
    const url = `${this.options.baseUrl}${path}${query?.size ? `?${query.toString()}` : ''}`;

    try {
      const response = await this.fetcher(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await this.readError(response);
        throw new ApiClientError(
          errorBody?.error.message ?? '요청을 처리하지 못했습니다.',
          response.status,
          errorBody?.error.code ?? 'HTTP_ERROR',
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('요청 시간이 초과되었습니다.', 408, 'REQUEST_TIMEOUT');
      }
      throw new ApiClientError('서버에 연결할 수 없습니다.', 0, 'NETWORK_ERROR');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async readError(response: Response): Promise<ApiErrorResponse | undefined> {
    try {
      return (await response.json()) as ApiErrorResponse;
    } catch {
      return undefined;
    }
  }
}
