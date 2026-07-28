# List My Tasks in an Organization

Retrieve the tasks assigned to the current user within an organization, with optional filtering by status, pipe, and search term.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have access to the organization whose tasks you want to list.
3. **Organization ID**: Identify the organization the tasks belong to.

## Step 1: Find Your Organization ID

* Open the organization in your browser. The URL includes the ID: `https://app.pipefy.com/organizations/123456789`.
* Organization ID = `123456789` (the number after `/organizations/`).
* You can also retrieve it via the [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Query Your Tasks

The `tasks` query returns the tasks assigned to the authenticated user in the given organization. It is a paginated (Relay-style) connection.

```graphql
query {
  tasks(
    organizationId: "123456789"
    status: open
    order: asc
    search: "invoice"
    pipeUuids: ["pipe-uuid-here"]
    first: 20
  ) {
    edges {
      node {
        id
        title
        done
        countFulfilled
        cardId
        dueDate
        phase {
          id
          name
        }
        repo {
          id
          name
        }
      }
    }
  }
}
```

### Input

| Argument         | Type                 | Required | Description                                             |
| ---------------- | -------------------- | -------- | ------------------------------------------------------- |
| `organizationId` | `ID`                 | Yes      | The organization whose tasks will be listed.            |
| `status`         | `TasksStatusGQLEnum` | No       | Filter by fulfillment status: `open`, `done`, or `all`. |
| `order`          | `Sort`               | No       | Sort by task due date: `asc` or `desc`.                 |
| `search`         | `String`             | No       | Filter tasks by title.                                  |
| `pipeUuids`      | `[ID]`               | No       | Restrict results to the given pipe UUIDs.               |

### Sample Response

```json
{
  "data": {
    "tasks": {
      "edges": [
        {
          "node": {
            "id": "1",
            "title": "Review invoice",
            "done": false,
            "countFulfilled": 0,
            "cardId": "42",
            "dueDate": "2026-06-10T12:00:00Z",
            "phase": { "id": "10", "name": "Pending Review" },
            "repo": { "id": "7", "name": "Accounts Payable" }
          }
        }
      ]
    }
  }
}
```

## Key Notes

* The query only returns tasks assigned to the **authenticated user** — it is scoped to the current user, not to all organization members.
* `done` is `true` when at least one assignee has fulfilled the task; `countFulfilled` exposes the underlying count.
* Use `first`/`after` (Relay cursor pagination) to page through results; the page size is capped at 20.
* If the user lacks access to the organization, the API returns a permission error.