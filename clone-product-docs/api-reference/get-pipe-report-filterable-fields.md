# Get Pipe Report Filterable Fields

Retrieve filterable fields structure for pipe report configuration

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions to access the pipe.
3. **Pipe UUID**: Identify the Pipe you want to get filterable fields for.

## Step 1: Find The Pipe UUID

To execute this query, you’ll need the UUID of the pipe.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.

## Step 2: Query Pipe Report Filterable Fields

Execute the `pipeReportFilterableFields` query to retrieve the filterable fields structure for the pipe:

```graphql
{
  pipeReportFilterableFields(pipeUuid: "123456789") {
    title
    list {
      label
      list {
        label
      }
    }
  }
}
```

### Response Example

```json
{
  "data": {
    "pipeReportFilterableFields": [
      {
        "title": "Status",
        "list": [
          {
            "label": "In Progress",
            "list": [
              {
                "label": "In Progress"
              }
            ]
          },
          {
            "label": "Review",
            "list": [
              {
                "label": "Review"
              }
            ]
          },
          {
            "label": "Done",
            "list": [
              {
                "label": "Done"
              }
            ]
          }
        ]
      },
      {
        "title": "Priority",
        "list": [
          {
            "label": "High",
            "list": [
              {
                "label": "High"
              }
            ]
          },
          {
            "label": "Medium",
            "list": [
              {
                "label": "Medium"
              }
            ]
          },
          {
            "label": "Low",
            "list": [
              {
                "label": "Low"
              }
            ]
          }
        ]
      },
      {
        "title": "Assignee",
        "list": [
          {
            "label": "John Doe",
            "list": [
              {
                "label": "John Doe"
              }
            ]
          },
          {
            "label": "Jane Smith",
            "list": [
              {
                "label": "Jane Smith"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Key Fields Explained

### Filterable Fields Structure

* `title`: The field name/category (e.g., "Status", "Priority", "Assignee")
* `list`: Array of available values for this field
  * `label`: The display name for the filter option
  * `list`: Nested list structure (typically contains the same label for consistency)

## Use Cases

### Building Filter Interfaces

Use this query to build dynamic filter interfaces for pipe reports:

```graphql
# Get filterable fields for a specific pipe
{
  pipeReportFilterableFields(pipeUuid: "123456789") {
    title
    list {
      label
      list {
        label
      }
    }
  }
}
```

### Dynamic Report Configuration

This query is particularly useful for:

* **Filter UI Generation**: Create dropdown menus and filter controls
* **Report Creation**: Show available filter options when creating reports
* **Report Updates**: Display current filter options when updating reports
* **Validation**: Ensure selected filter values are valid for the pipe

## Example: Building a Filter Interface

Based on the response, you can build a filter interface like this:

```javascript
const filterOptions = {
  Status: ['In Progress', 'Review', 'Done'],
  Priority: ['High', 'Medium', 'Low'],
  Assignee: ['John Doe', 'Jane Smith'],
};
```

## Notes

* **Real-time Data**: Filter options reflect current pipe data and may change as cards are added/modified
* **Permissions**: Ensure you have access to the pipe to retrieve its filterable fields