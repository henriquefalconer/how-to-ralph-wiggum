# Get Pipe Reports

Retrieve all pipe reports for a specific pipe

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to access the pipe.
3. **Pipe UUID**: Identify the Pipe you want to fetch reports for.

## Step 1: Find The Pipe UUID

To execute this query, you’ll need the UUID of the pipe.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.

## Step 2: Query Pipe Reports

Execute the `pipeReports` query to retrieve all reports of the pipe:

```graphql
{
  pipeReports(pipeUuid: "123456789") {
    edges {
      node {
        id
        name
        cardCount
        color
        createdAt
        lastUpdatedAt
        fields
        filter
        sortBy {
          field
          direction
        }
        selectedFormulaFields {
          indexName
        }
        repo {
          id
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

### Response Example

```json
{
  "data": {
    "pipeReports": {
      "edges": [
        {
          "node": {
            "id": "456789123",
            "name": "Sales Pipeline Report",
            "cardCount": 1250,
            "color": "#FF6B6B",
            "createdAt": "2024-01-15T10:30:00Z",
            "lastUpdatedAt": "2024-03-13T14:45:00Z",
            "fields": ["title", "status", "assignee", "due_date"],
            "filter": {
              "status": ["in_progress", "review"]
            },
            "sortBy": {
              "field": "due_date",
              "direction": "ASC"
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
              "id": "123456789",
              "name": "Sales Pipeline"
            }
          }
        },
        {
          "node": {
            "id": "456789124",
            "name": "Lead Management Report",
            "cardCount": 89,
            "color": "#4ECDC4",
            "createdAt": "2024-02-20T09:15:00Z",
            "lastUpdatedAt": "2024-03-12T16:20:00Z",
            "fields": ["title", "lead_source", "value", "created_at"],
            "filter": null,
            "sortBy": {
              "field": "created_at",
              "direction": "desc"
            },
            "selectedFormulaFields": [
              {
                "indexName": "average"
              }
            ],
            "repo": {
              "id": "123456789",
              "name": "Sales Pipeline"
            }
          }
        }
      ],
      "pageInfo": {
        "hasNextPage": false,
        "hasPreviousPage": false,
        "startCursor": "YXJyYXljb25uZWN0aW9uOjA=",
        "endCursor": "YXJyYXljb25uZWN0aW9uOjE="
      }
    }
  }
}
```

## Key Fields Explained

### Report Information

* `id`: Unique identifier for the report
* `name`: Display name of the report
* `cardCount`: Total number of cards included in the report
* `color`: The report's color (enum values: red, blue, green, etc.)
* `createdAt`: Timestamp when the report was created
* `lastUpdatedAt`: Timestamp when the report was last modified

### Report Configuration

* `fields`: Array of field names to display in the report
* `filter`: JSON object containing filter criteria applied to the report
* `sortBy`: Object defining how cards are sorted in the report
  * `field`: The field name to sort by
  * `direction`: Sort direction (`asc` or `desc`)
* `selectedFormulaFields`: Array of formula fields included in the report
  * `indexName`: The formula field identifier

### Associated Resources

* `repo`: The pipe this report belongs to
  * `id`: Pipe ID
  * `name`: Pipe name

### Pagination

The `pipeReports` query uses pagination. Refer to our [Pagination basics page](https://developers.pipefy.com/reference/pagination-basics) to understand more about how it works.

* `pageInfo`: Pagination information for handling large result sets
  * `hasNextPage`: Boolean indicating if more results are available
  * `hasPreviousPage`: Boolean indicating if previous results exist
  * `startCursor`: Cursor for the first item in the current page
  * `endCursor`: Cursor for the last item in the current page

## Notes

* **Pagination**: The query supports pagination with a maximum page size of 500 items
* **Pipe UUID**: Use the pipe UUID (not ID) to query pipe reports