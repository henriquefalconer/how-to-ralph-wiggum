# Create Pipe Report

Create a new pipe report with specified configuration

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the mutations in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to create reports in the pipe.
3. **Pipe ID**: Identify the Pipe where you want to create the report.

## Step 1: Find The Required IDs

1. **Pipe ID:**

   1. Open the Pipe in your browser.
   2. The URL will include the Pipe ID: `https://app.pipefy.com/pipes/987654321`.
   3. **Pipe ID = `987654321`** (the number after `/pipes/`).

## Step 2: Create Pipe Report

Execute the `createPipeReport` mutation:

```graphql
mutation {
  createPipeReport(
    input: {
      name: "Sales Pipeline Overview"
      pipeId: 987654321
      fields: ["title", "status", "assignee", "due_date", "priority"]
      formulas: ["field_1_number", "sum"]
      filter: {
        operator: and
        queries: [
          { field: "status", operator: contains, value: ["in_progress", "review"] }
          { field: "priority", operator: contains, value: ["high", "medium"] }
        ]
      }
    }
  ) {
    pipeReport {
      id
      name
      cardCount
      color
      createdAt
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
    "createPipeReport": {
      "pipeReport": {
        "id": "456789123",
        "name": "Sales Pipeline Overview",
        "cardCount": 1250,
        "color": "#FF6B6B",
        "createdAt": "2024-03-13T15:30:00Z",
        "fields": ["title", "status", "assignee", "due_date", "priority"],
        "filter": {
          "operator": "AND",
          "queries": [
            {
              "field": "status",
              "operator": "IN",
              "value": ["in_progress", "review"]
            },
            {
              "field": "priority",
              "operator": "IN",
              "value": ["high", "medium"]
            }
          ]
        },
        "selectedFormulaFields": [
          {
            "indexName": "field_1_number"
          },
          {
            "indexName": "sum"
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

* `name`: The display name for the report
* `pipeId`: The pipe ID where the report will be created

### Optional Arguments

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

## Key Fields Explained

### Report Information

* `id`: Unique identifier for the report
* `name`: Display name of the report
* `cardCount`: Total number of cards included in the report (calculated in real-time)
* `color`: The report's color (enum values: red, blue, green, etc.)
* `createdAt`: Timestamp when the report was created

### Report Configuration

* `fields`: Array of field names to display in the report columns
* `filter`: JSON object containing filter criteria applied to the report
* `selectedFormulaFields`: Array of formula fields included in the report
  * `indexName`: The formula field identifier

### Associated Resources

* `repo`: The pipe this report belongs to
  * `id`: Pipe ID
  * `name`: Pipe name