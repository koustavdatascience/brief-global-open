import { describe, expect, it, vi } from "vitest";
import { fetchFederalRegisterDocuments } from "./federalRegisterAdapter";

const source = {
  id: "source-1",
  canonicalUrl: "https://www.federalregister.gov/api/v1/documents.json",
  sourceKind: "api" as const,
  jurisdictionCode: "USA" as const,
  sourceLanguage: "en",
};

describe("Federal Register approved-source adapter", () => {
  it("fetches only bounded same-origin raw text records from the reviewed endpoint", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "A rule",
                html_url: "https://www.federalregister.gov/documents/1",
                raw_text_url: "https://www.federalregister.gov/documents/1/raw",
                publication_date: "2026-08-23",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response("Official source text", {
          status: 200,
          headers: { "content-type": "text/plain" },
        })
      );
    const documents = await fetchFederalRegisterDocuments(source, fetcher);
    expect(documents).toEqual([
      expect.objectContaining({
        officialRecordUrl: "https://www.federalregister.gov/documents/1",
        sourceDocumentUrl: "https://www.federalregister.gov/documents/1/raw",
        sourceText: "Official source text",
      }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("hydrates raw text URL from the detail endpoint when the catalogue omits it", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "A proposed rule",
                document_number: "2026-17239",
                html_url:
                  "https://www.federalregister.gov/documents/2026/08/24/2026-17239/example",
                publication_date: "2026-08-24",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            raw_text_url:
              "https://www.federalregister.gov/documents/full_text/text/2026/08/24/2026-17239.txt",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response("Hydrated official source text", {
          status: 200,
          headers: { "content-type": "text/plain" },
        })
      );

    const documents = await fetchFederalRegisterDocuments(source, fetcher);

    expect(documents).toEqual([
      expect.objectContaining({
        sourceDocumentUrl:
          "https://www.federalregister.gov/documents/full_text/text/2026/08/24/2026-17239.txt",
        sourceText: "Hydrated official source text",
      }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects a source that is not the reviewed Federal Register endpoint", async () => {
    await expect(
      fetchFederalRegisterDocuments(
        { ...source, canonicalUrl: "https://example.com/api" },
        vi.fn()
      )
    ).rejects.toThrow("unapproved_federal_register_source");
  });
});
