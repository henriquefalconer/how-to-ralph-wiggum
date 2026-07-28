export interface PipefyCloneClientOptions {
  /** Base URL of a running clone deployment, e.g. "https://your-clone.onrender.com" */
  baseUrl: string;
  /** Sent as `Authorization: Bearer <apiKey>` on every request, once the clone's API-key wall exists. */
  apiKey?: string;
}

/** Thrown when the API responds with a non-2xx status. */
export class PipefyCloneApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "PipefyCloneApiError";
    this.status = status;
    this.body = body;
  }
}

/** Thrown for client-side input validation failures, before any request is sent. */
export class PipefyCloneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipefyCloneValidationError";
  }
}

export interface Pipe {
  id: string;
  name: string;
  color: string;
  orgId: string;
  titleFieldId: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface Phase {
  id: string;
  pipeId: string;
  name: string;
  position: number;
  done: boolean;
  [key: string]: unknown;
}

export interface Card {
  id: string;
  pipeId: string;
  phaseId: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Table {
  id: string;
  orgId: string;
  name: string;
  titleFieldId: string | null;
  [key: string]: unknown;
}

export interface TableRecord {
  id: string;
  tableId: string;
  title: string;
  createdAt: string;
  [key: string]: unknown;
}

export type FieldValues = Record<string, string>;

async function request<T>(
  options: PipefyCloneClientOptions,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetch(`${options.baseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new PipefyCloneApiError(response.status, message, data);
  }

  return data as T;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) {
    throw new PipefyCloneValidationError(`"${field}" is required`);
  }
  return value;
}

export class PipefyCloneClient {
  private readonly options: PipefyCloneClientOptions;

  readonly pipes: {
    list(): Promise<Pipe[]>;
    get(id: string): Promise<{ pipe: Pipe; phases: Phase[] }>;
    create(input: { name: string; locale?: string }): Promise<Pipe>;
  };

  readonly cards: {
    list(pipeId: string): Promise<Card[]>;
    get(cardId: string): Promise<unknown>;
    create(input: {
      pipeId: string;
      phaseId: string;
      values?: FieldValues;
    }): Promise<Card>;
    moveToPhase(cardId: string, phaseId: string): Promise<Card>;
    setFieldValue(
      cardId: string,
      fieldId: string,
      value: string,
    ): Promise<void>;
  };

  readonly tables: {
    list(): Promise<Table[]>;
    get(id: string): Promise<Table>;
    create(input: { name: string }): Promise<Table>;
    records: {
      list(tableId: string): Promise<TableRecord[]>;
      get(tableId: string, recordId: string): Promise<unknown>;
      create(
        tableId: string,
        input: { values?: FieldValues },
      ): Promise<TableRecord>;
      delete(tableId: string, recordId: string): Promise<void>;
    };
  };

  constructor(options: PipefyCloneClientOptions) {
    requireNonEmpty(options.baseUrl, "baseUrl");
    this.options = { ...options, baseUrl: options.baseUrl.replace(/\/$/, "") };

    this.pipes = {
      list: async () => {
        const { pipes } = await request<{ pipes: Pipe[] }>(
          this.options,
          "/api/pipes",
        );
        return pipes;
      },
      get: async (id) => {
        requireNonEmpty(id, "id");
        return request(this.options, `/api/pipes/${id}`);
      },
      create: async (input) => {
        requireNonEmpty(input.name, "name");
        const res = await request<{ pipe: Pipe }>(this.options, "/api/pipes", {
          method: "POST",
          body: { name: input.name, locale: input.locale },
        });
        return res.pipe;
      },
    };

    this.cards = {
      list: async (pipeId) => {
        requireNonEmpty(pipeId, "pipeId");
        const res = await request<{ cards: Card[] }>(
          this.options,
          `/api/pipes/${pipeId}/cards`,
        );
        return res.cards;
      },
      get: async (cardId) => {
        requireNonEmpty(cardId, "cardId");
        return request(this.options, `/api/cards/${cardId}`);
      },
      create: async (input) => {
        requireNonEmpty(input.pipeId, "pipeId");
        requireNonEmpty(input.phaseId, "phaseId");
        const res = await request<{ card: Card }>(
          this.options,
          `/api/pipes/${input.pipeId}/cards`,
          {
            method: "POST",
            body: { phaseId: input.phaseId, values: input.values ?? {} },
          },
        );
        return res.card;
      },
      moveToPhase: async (cardId, phaseId) => {
        requireNonEmpty(cardId, "cardId");
        requireNonEmpty(phaseId, "phaseId");
        const res = await request<{ card: Card }>(
          this.options,
          `/api/cards/${cardId}/move`,
          { method: "POST", body: { toPhaseId: phaseId } },
        );
        return res.card;
      },
      setFieldValue: async (cardId, fieldId, value) => {
        requireNonEmpty(cardId, "cardId");
        requireNonEmpty(fieldId, "fieldId");
        await request<{ ok: true }>(
          this.options,
          `/api/cards/${cardId}/field-values`,
          { method: "PATCH", body: { fieldId, value } },
        );
      },
    };

    this.tables = {
      list: async () => {
        const { tables } = await request<{ tables: Table[] }>(
          this.options,
          "/api/tables",
        );
        return tables;
      },
      get: async (id) => {
        requireNonEmpty(id, "id");
        const res = await request<{ table: Table }>(
          this.options,
          `/api/tables/${id}`,
        );
        return res.table;
      },
      create: async (input) => {
        requireNonEmpty(input.name, "name");
        const res = await request<{ table: Table }>(
          this.options,
          "/api/tables",
          {
            method: "POST",
            body: { name: input.name },
          },
        );
        return res.table;
      },
      records: {
        list: async (tableId) => {
          requireNonEmpty(tableId, "tableId");
          const res = await request<{ records: TableRecord[] }>(
            this.options,
            `/api/tables/${tableId}/records`,
          );
          return res.records;
        },
        get: async (tableId, recordId) => {
          requireNonEmpty(tableId, "tableId");
          requireNonEmpty(recordId, "recordId");
          return request(
            this.options,
            `/api/tables/${tableId}/records/${recordId}`,
          );
        },
        create: async (tableId, input) => {
          requireNonEmpty(tableId, "tableId");
          const res = await request<{ record: TableRecord }>(
            this.options,
            `/api/tables/${tableId}/records`,
            { method: "POST", body: { values: input.values ?? {} } },
          );
          return res.record;
        },
        delete: async (tableId, recordId) => {
          requireNonEmpty(tableId, "tableId");
          requireNonEmpty(recordId, "recordId");
          await request<{ ok: true }>(
            this.options,
            `/api/tables/${tableId}/records/${recordId}`,
            { method: "DELETE" },
          );
        },
      },
    };
  }
}
