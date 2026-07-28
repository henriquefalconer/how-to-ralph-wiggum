import {
  PipefyCloneApiError,
  PipefyCloneClient,
  PipefyCloneValidationError,
} from "@sdk/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("PipefyCloneClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the correct REST endpoint for moveToPhase", async () => {
    const card = { id: "card-1", pipeId: "p1", phaseId: "phase-2" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { card }));

    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
    });
    const result = await client.cards.moveToPhase("card-1", "phase-2");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://clone.example.com/api/cards/card-1/move");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ toPhaseId: "phase-2" });
    expect(result).toEqual(card);
  });

  it("surfaces a 400 API error as a typed PipefyCloneApiError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "Card title is required" }),
    );

    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
    });

    await expect(
      client.cards.create({ pipeId: "p1", phaseId: "phase-1", values: {} }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Card title is required",
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "Card title is required" }),
    );
    await expect(
      client.cards.create({ pipeId: "p1", phaseId: "phase-1", values: {} }),
    ).rejects.toBeInstanceOf(PipefyCloneApiError);
  });

  it("throws a validation error before making the network request when required input is missing", async () => {
    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
    });

    await expect(client.pipes.create({ name: "" })).rejects.toBeInstanceOf(
      PipefyCloneValidationError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists pipes via GET /api/pipes", async () => {
    const pipes = [{ id: "p1", name: "Purchase Requests" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { pipes }));

    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
    });
    const result = await client.pipes.list();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://clone.example.com/api/pipes");
    expect(init.method).toBe("GET");
    expect(result).toEqual(pipes);
  });

  it("lists and creates table records", async () => {
    const records = [{ id: "r1", tableId: "t1", title: "Row 1" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { records }));

    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
    });
    const listed = await client.tables.records.list("t1");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://clone.example.com/api/tables/t1/records",
    );
    expect(listed).toEqual(records);

    const created = { id: "r2", tableId: "t1", title: "Row 2" };
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { record: created }));
    const result = await client.tables.records.create("t1", {
      values: { field1: "Row 2" },
    });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://clone.example.com/api/tables/t1/records");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ values: { field1: "Row 2" } });
    expect(result).toEqual(created);
  });

  it("sends the api key as a bearer token when configured", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { tables: [] }));

    const client = new PipefyCloneClient({
      baseUrl: "https://clone.example.com",
      apiKey: "secret-key",
    });
    await client.tables.list();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer secret-key");
  });
});
