# Update Pipe Report

Update an existing pipe report configuration

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the mutations in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to update the specific report.
3. **Report ID**: Identify the Pipe Report you want to update.

## Step 1: Find The Report ID

1. **Via Pipefy UI:**

   1. Open the Pipe Report in your browser.
   2. The URL will include the Report ID: `https://app.pipefy.com/pipes/123/reports_v2/987654321`.
   3. **Report ID = `987654321`** (the number after `/reports_v2/`).

2. **Via GraphQL Query:**
   1. Use the `pipeReports` query to list all reports and find the specific report ID you need.
   2. [How to get pipe reports.](https://developers.pipefy.com/reference/get-pipe-reports)

## Step 2: Update Pipe Report

Execute the `updatePipeReport` mutation:

```graphql
mutation {
  updatePipeReport(
    input: {
      id: 456789123
      name: "Updated Sales Pipeline Report"
      color: red
      fields: ["title", "status", "assignee", "due_date", "priority", "value"]
      formulas: ["field_1_number", "sum", "average"]
      filter: {
        operator: or
        queries: [
          { field: "status", operator: contains, value: ["in_progress", "review", "done"] }
          { field: "priority", operator: eq, value: "high" }
        ]
      }
    }
  ) {
    pipeReport {
      id
      name
      cardCount
      color
      lastUpdatedAt
      fields
      filter
      selectedFormulaFields {
        indexName
      }
      repo {
        id
        name
      }
    }
  }
}
```

### Response Example

```json
{
  "data": {
    "updatePipeReport": {
      "pipeReport": {
        "id": "456789123",
        "name": "Updated Sales Pipeline Report",
        "cardCount": 890,
        "color": "#FF6B6B",
        "lastUpdatedAt": "2024-03-13T16:45:00Z",
        "fields": ["title", "status", "assignee", "due_date", "priority", "value"],
        "filter": {
          "operator": "or",
          "queries": [
            {
              "field": "status",
              "operator": "contains",
              "value": ["in_progress", "review", "done"]
            },
            {
              "field": "priority",
              "operator": "eq",
              "value": "high"
            }
          ]
        },
        "selectedFormulaFields": [
          {
            "indexName": "field_1_number"
          },
          {
            "indexName": "sum"
          },
          {
            "indexName": "average"
          }
        ],
        "repo": {
          "id": "987654321",
          "name": "Sales Pipeline"
        }
      }
    }
  }
}
```

## Arguments Explained

### Required Arguments

* `id`: ID - The report ID to update

### Optional Arguments

* `name`: The new display name for the report
* `color`: The report's color (enum values: red, blue, green, etc.)
* `fields`: Array of field names to display as columns in the report
* `formulas`: Array of formula field names to include in the report
* `filter`: Complex filter object to limit which cards appear in the report

### Filter Structure

The `filter` argument supports complex filtering with the following structure:

```graphql
filter: {
  operator: and | or
  queries: [
    {
      field: String      # Field name to filter on
      operator: String   # Filter operator (eq, not_eq, contains, etc.)
      value: Any         # Filter value(s)
    }
  ]
  groups: [              # Nested filter groups
    {
      operator: and | or
      queries: [...]
    }
  ]
}
```

## Partial Updates

You can update only specific fields without affecting others:

### Update Name Only

```graphql
mutation {
  updatePipeReport(input: { id: 456789123, name: "New Report Name" }) {
    pipeReport {
      id
      name
      lastUpdatedAt
    }
  }
}
```

### Update Color Only

```graphql
mutation {
  updatePipeReport(input: { id: 456789123, color: blue }) {
    pipeReport {
      id
      color
      lastUpdatedAt
    }
  }
}
```

### Update Fields Only

```graphql
mutation {
  updatePipeReport(input: { id: 456789123, fields: ["title", "status", "assignee"] }) {
    pipeReport {
      id
      fields
      lastUpdatedAt
    }
  }
}
```

### Update Formulas Only

```graphql
mutation {
  updatePipeReport(input: { id: 456789123, formulas: ["sum", "average", "count"] }) {
    pipeReport {
      id
      selectedFormulaFields {
        indexName
      }
      lastUpdatedAt
    }
  }
}
```

## Notes

* **Partial Updates**: Only include the fields you want to change - other fields remain unchanged
* **Formula Fields**: Use the `formulas` argument to specify which formula fields to include in the report