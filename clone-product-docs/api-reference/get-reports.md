# Get Reports

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Pipe ID**: Identify the Pipe where the report is.

4. **Report ID**: Identify the Report you want to fetch.

## Step 1: Find The IDs

1. **Via Pipefy UI:**
   1. **Pipe ID:**
      1. Open the Pipe in your browser.
      2. The URL will include the Pipe ID: `https://app.pipefy.com/pipes/987654321`.
      3. **Pipe ID = `987654321`** (the number after `/pipes/`).
   2. **Report ID:**
      1. Open the Report in your browser.
      2. The URL will include the Report ID: `https://app.pipefy.com/pipes/123/reports_v2/987654321`.
      3. **Table ID = `987654321`** (the number after `/reports_v2/`).
2. **Via GraphQL Query:**
   1. [How to get the pipe ID.](https://developers.pipefy.com/reference/get-resource-ids#pipe-id)
   2. [How to get the report ID](https://developers.pipefy.com/reference/get-resource-ids#reports-ids)

## Step 2: Generate the Report Export (Mutation)

Execute the `exportPipeReport` mutation:

```graphql
mutation {
  exportPipeReport(input: {
    pipeId: 302725964   # Required
    pipeReportId: 300847410  # Required
  }) {
    pipeReportExport {
      id           # Save this ID for the next step
    }
  }
}
```

Response Example

```json
{
  "data": {
    "exportPipeReport": {
      "pipeReportExport": {
        "id": "312382587",
      }
    }
  }
}
```

### Key Fields

* `id`: Use this export ID to fetch the URL later.

## Step 3: Retrieve the Export URL (Query)

Use the `pipeReportExport` to query the `fileURL`:
*\*The file url may not be immediately available, the report export can take longer depending on the report size.*

```graphql
{
  pipeReportExport(id: 312382670) {
    fileURL # Download link
    finishedAt # Null = processing; timestamp = ready
  }
}
```

Response Example

```json
{
  "data": {
    "pipeReportExport": {
      "fileURL": "https://app.pipefy.com/storage/v1/signed/.../report_03-13-2025.xlsx?expires_on=1741895611",
      "finishedAt": "2025-03-13T14:59:12-04:00"
    }
  }
}
```

Use the file URL to download the report.

### Notes

* **Processing Time:** Larger reports may take minutes.
* **URL Expiry:** The fileURL has a limited lifespan (one hour)
* **Email Notification:** The requester will receive an email once the report is ready for download.