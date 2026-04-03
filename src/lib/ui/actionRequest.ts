export type ActionRequestSuccess<T = unknown> = {
  ok: true;
  data: T;
};

export type ActionRequestError = {
  ok: false;
  status: number;
  error: string;
  message: string;
};

export type ActionRequestResult<T = unknown> =
  | ActionRequestSuccess<T>
  | ActionRequestError;

export async function actionRequest<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ActionRequestResult<T>> {
  try {
    const response = await fetch(input, {
      credentials: "include",
      ...init,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: String(data?.error ?? "request_failed"),
        message: String(
          data?.message ?? "Não foi possível concluir a ação solicitada.",
        ),
      };
    }

    return {
      ok: true,
      data: data as T,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "Erro de rede ao tentar concluir a ação.",
    };
  }
}
