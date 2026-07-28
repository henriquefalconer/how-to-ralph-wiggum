# Delete Pipe Report

Delete an existing pipe report

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the mutations in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to delete the specific report.
3. **Report ID**: Identify the Pipe Report you want to delete.

## Step 1: Find The Report ID

1. **Via Pipefy UI:**

   1. Open the Pipe Report in your browser.
   2. The URL will include the Report ID: `https://app.pipefy.com/pipes/123/reports_v2/987654321`.
   3. **Report ID = `987654321`** (the number after `/reports_v2/`).

2. **Via GraphQL Query:**
   1. Use the `pipeReports` query to list all reports and find the specific report ID you need.
   2. [How to get pipe reports.](https://developers.pipefy.com/reference/get-pipe-reports)

## Step 2: Delete Pipe Report

Execute the `deletePipeReport` mutation:

```graphql
mutation {
  deletePipeReport(input: { id: 456789123 }) {
    success
  }
}
```

### Response Example

```json
{
  "data": {
    "deletePipeReport": {
      "success": true
    }
  }
}
```

## Arguments Explained

### Required Arguments

* `id`: ID - The report ID to delete

## Verification

After deletion, you can verify the report no longer exists by querying it:

```graphql
{
  pipeReports(pipeUuid: "your-pipe-uuid") {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

### Expected Response (Report Deleted)

The deleted report should no longer appear in the list of pipe reports.

## Notes

* **Permanent Deletion**: This action permanently deletes the report and cannot be undone
* **Permissions**: Ensure you have the necessary permissions to delete the specific report
* **Dependencies**: Check if the report is referenced elsewhere before deletion