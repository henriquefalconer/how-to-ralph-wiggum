# Get Pipe Report Columns

Retrieve available columns for pipe report configuration

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to access the pipe.
3. **Pipe UUID**: Identify the Pipe you want to get columns for.

## Step 1: Find The Pipe UUID

To execute this query, you’ll need the UUID of the pipe.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.

## Step 2: Query Pipe Report Columns

Execute the `pipeReportColumns` query to retrieve available columns for the pipe:

```graphql
{
  pipeReportColumns(pipeUuid: "123456789") {
    label
    name
  }
}
```

### Response Example

```json
{
  "data": {
    "pipeReportColumns": [
      {
        "label": "Title",
        "name": "title"
      },
      {
        "label": "Status",
        "name": "status"
      },
      {
        "label": "Assignee",
        "name": "assignee"
      },
      {
        "label": "Due Date",
        "name": "due_date"
      },
      {
        "label": "Priority",
        "name": "priority"
      },
      {
        "label": "Created At",
        "name": "created_at"
      },
      {
        "label": "Updated At",
        "name": "updated_at"
      },
      {
        "label": "Card ID",
        "name": "id"
      }
    ]
  }
}
```

## Key Fields Explained

### Column Information

* `label`: Human-readable display name for the column
* `name`: Technical field name used in API calls and filters

## Use Cases

### Building Report Forms

Use this query to populate dropdown menus or form fields when creating or updating pipe reports:

```graphql
# Get available columns for a specific pipe
{
  pipeReportColumns(pipeUuid: "123456789") {
    label
    name
  }
}
```

### Dynamic Report Configuration

This query is particularly useful for:

* **Report Creation**: Get available fields when creating new reports
* **Report Updates**: Show available fields when updating existing reports
* **Form Validation**: Validate that selected fields exist in the pipe
* **UI Generation**: Dynamically generate form fields based on pipe structure

## Notes

* **Field Availability**: The returned columns represent all available fields in the pipe that can be used in reports
* **Permissions**: Ensure you have access to the pipe to retrieve its column information
* **Real-time**: Column information reflects the current pipe structure and may change if pipe fields are modified