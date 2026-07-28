# Pagination Basics

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions.

## Pagination Basics

Some queries use cursor-based pagination with these key arguments:

* `first`: Number of items to fetch after the cursor (e.g., first 10 items)
* `last`: Number of items to fetch before the cursor (e.g., last 10 items)
* `after`: Cursor to start fetching items after (from pageInfo.endCursor)
* `before`: Cursor to start fetching items before (from pageInfo.startCursor)

## Common Use Cases

### 1. Fetch Initial Page

Get the first `n` items (start of the list):

```graphql
{
  cards(pipe_id: 305800669, first: 2) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
  }
}
```

* `first: 2` returns the first 2 cards
* `pageInfo.endCursor` gives the cursor for the next page
* `pageInfo.hasNextPage` boolean information if the next page is available

Example response:

```json
{
  "data": {
    "cards": {
      "edges": [
        {
          "node": {
            "id": "1090621871",
            "title": "Update User Documentation"
          }
        },
        {
          "node": {
            "id": "1090621932",
            "title": "Review Quarterly Budget"
          }
        }
      ],
      "pageInfo": {
        "startCursor": "ABCD1234",
        "endCursor": "OPQR5678",
        "hasNextPage": true,
        "hasPreviousPage": false
      }
    }
  }
}
```

### 2. Fetch Next Page

Use `after` with the cursor from the previous page:

```graphql
{
  cards(pipe_id: 305800669, after: "OPQR5678") {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
  }
}

```

* We used the `endCursor` from the first result. This is like a bookmark that tells us where the last item ended. By using this bookmark, we can fetch the next set of data that comes after the last item from the previous result.

### Example

1. **First Query:** You ask for the first 5 tasks. The API gives you those tasks and a "bookmark" (`endCursor`) to remember where you stopped.
2. **Next Query:** You use that "bookmark" (`endCursor`) to ask for the next 5 tasks. The API starts giving you tasks from where the last set ended.

Example response:

```json
{
  "data": {
    "cards": {
      "edges": [
        {
          "node": {
            "id": "1090621998",
            "title": "Design New Landing Page"
          }
        },
        {
          "node": {
            "id": "1090622048",
            "title": "Test Login Functionality"
          }
        },
        {
          "node": {
            "id": "1090622111",
            "title": "Organize Team Meeting"
          }
        },
        [...] # continues
      ],
      "pageInfo": {
        "startCursor": "ABCD1234",
        "endCursor": "OPQR5678",
        "hasNextPage": true,
        "hasPreviousPage": true
      }
    }
  }
}
```

### 3. Fetch Previous Page

Use `before` with a cursor to go back:

```graphql
{
  cards(pipe_id: 305800669, before: "WXYZ7890") {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "cards": {
      "edges": [
        {
          "node": {
            "id": "1090622875",
            "title": "Plan Marketing Campaign"
          }
        },
        {
          "node": {
            "id": "1090622973",
            "title": "Onboard New Employee"
          }
        },
        {
          "node": {
            "id": "1090623098",
            "title": "Optimize Database Queries"
          }
        },
        [...] # continues
      ],
      "pageInfo": {
        "startCursor": "ABCD1234",
        "endCursor": "OPQR5678",
        "hasNextPage": false,
        "hasPreviousPage": false
      }
    }
  }
}
```

### 4. Jump to the End

Fetch the last `n` items:

```graphql
{
  cards(pipe_id: 305800669, last: 1) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "cards": {
      "edges": [
        {
          "node": {
            "id": "1090723099",
            "title": "Review Database Queries"
          }
        }
      ],
      "pageInfo": {
        "startCursor": "ABCD1234",
        "endCursor": "OPQR5678",
        "hasNextPage": false,
        "hasPreviousPage": true
      }
    }
  }
}
```

### Key Tips

1. Always request `pageInfo` fields (`endCursor`, `hasNextPage`, etc.) to navigate pages.
2. Use `hasNextPage`/`hasPreviousPage` to check if more pages exist.
3. Never mix `first` with `before` or `last` with `after` (they’re mutually exclusive).