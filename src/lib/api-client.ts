interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  isMock?: boolean;
}

/** HTTP 오류와 서버가 반환하는 저장 실패를 함께 확인합니다. */
export async function requestApi<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, { ...init, signal: init?.signal || AbortSignal.timeout(15_000), cache: "no-store" });
  const result: ApiResponse<T> = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error || "서버 요청에 실패했습니다. 다시 시도해 주세요.");
  }
  return result;
}
