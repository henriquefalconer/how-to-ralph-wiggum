# List Records of a Pipe or Database

Fetch records (cards or database records) from a repo with filtering, ordering, and cursor-based pagination.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Why this use case

The `records` query searches the records of a single repo — a pipe (cards) or a database (records) — with a unified interface: free-text search, attribute and custom-field filters, sorting, and cursor-based pagination. Use it to build record listings, dashboards, or exports that need server-side filtering.

***

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must be able to read the target pipe or database.
3. **IDs**: See our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for how to find the `repoId` (pipe or database ID).

## Step 1: Run the query

```graphql
query ListRecords($repoId: ID!) {
  records(
    repoId: $repoId
    orderBy: { attribute: TITLE, direction: ASC }
    where: { attribute: TITLE, ilike: "urgent" }
  ) {
    totalCount
    edges {
      node {
        id
        title
        createdAt
        dueDate
        currentPhase {
          id
          name
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```

### Variables

```json
{
  "repoId": "301234567"
}
```

## Step 2: Check the response

```json
{
  "data": {
    "records": {
      "totalCount": 1,
      "edges": [
        {
          "node": {
            "id": 1001,
            "title": "Urgent order",
            "createdAt": "2026-06-01T12:00:00Z",
            "dueDate": null,
            "currentPhase": {
              "id": "2002",
              "name": "Doing"
            }
          }
        }
      ],
      "pageInfo": {
        "endCursor": "MQ",
        "hasNextPage": false
      }
    }
  }
}
```

### Returned fields

| Field                                | Description                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `totalCount`                         | Total number of records matching the search, across all pages                  |
| `edges[].node.id`                    | The record ID (card ID for pipes, record ID for databases)                     |
| `edges[].node.title`                 | The record title                                                               |
| `edges[].node.createdAt` / `dueDate` | Creation and due timestamps (`dueDate` is `null` when not set)                 |
| `edges[].node.currentPhase`          | The phase the record currently sits in (pipes only)                            |
| `pageInfo.endCursor`                 | Cursor of the last returned record — pass it as `after` to fetch the next page |
| `pageInfo.hasNextPage`               | Whether more records exist beyond this page                                    |

## Filtering

`where` accepts a single condition or a compound filter combining conditions with `and` / `or`:

```graphql
where: {
  and: [
    { attribute: TITLE, ilike: "order" }
    { or: [
      { field: "priority-field-uuid", eq: "high" }
      { attribute: DUE_DATE, lt: "2026-07-01" }
    ] }
  ]
}
```

* `attribute` targets a built-in record attribute (`ID`, `TITLE`, `CREATOR`, …); `field` targets a custom field by its UUID. Each condition takes exactly one of them.
* Supported operators include `eq`, `neq`, `lt`, `gt`, `lte`, `gte`, `contains`, `ncontains`, `in`, `nin`, `between`, `nbetween`, `like`, `nlike`, `ilike`, and `nilike`.
* `contains` / `ncontains` match **exact values** (useful for multi-value attributes such as `LABELS` and `ASSIGNEES`); for substring matching on text use `like`/`nlike` (case-sensitive) or `ilike`/`nilike` (case-insensitive).

## Implementation notes

* `searchTerm` performs a free-text search across the repo's records and can be combined with `where`.
* `phaseId` restricts the search to a single phase (pipes only).
* `orderBy` accepts either a built-in `attribute` or a custom `field` UUID plus a `direction` (`ASC`/`DESC`, default `ASC`).
* Long-running searches are interrupted with a `Query timeout` error — narrow the filter or paginate with smaller pages.