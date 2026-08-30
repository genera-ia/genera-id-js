/** Erro de uma chamada à Management API do Genera ID. */
export class GeneraIdError extends Error {
  /** Status HTTP da resposta (0 quando a requisição nem chegou ao servidor). */
  readonly status: number;

  /** Corpo da resposta, quando houver (ProblemDetails do ASP.NET ou texto). */
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "GeneraIdError";
    this.status = status;
    this.body = body;
  }
}
