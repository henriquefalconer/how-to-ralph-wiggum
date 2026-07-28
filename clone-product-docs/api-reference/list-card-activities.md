# List a Card's Activities

Retrieve the timeline of phase transitions and received emails for a card using the activities query.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have permission to view the card's activities — you need access to the card you are querying.
3. **Card UUID**: The `uuid` of the card whose activities you want to list. This is the card's UUID string (not the numeric open-cards ID).

## Step 1: Find Your Card UUID

The `activities` query identifies the card by its **UUID**, not by the numeric card ID.

1. **Via GraphQL Query:**
   1. Query the `card` operation and request its `uuid` field:

      ```graphql
      query {
        card(id: 123456789) {
          uuid
        }
      }
      ```

   2. Use the returned `uuid` value (for example `"e6237646-45b3-4725-b973-56d8b6bdb389"`) as the `cardUuid` argument below.

## Step 2: Execute the Query

Use the `activities` query to retrieve the card's activity timeline. Activities are a union of
`PhaseActivity` (phase transition events) and `EmailActivity` (emails the card received), so use
inline fragments to select fields for each type. The query returns a paginated connection.

```graphql
query {
  activities(cardUuid: "e6237646-45b3-4725-b973-56d8b6bdb389", order: asc, first: 10) {
    edges {
      node {
        __typename
        ... on PhaseActivity {
          timestamp
          kind
          target
          direction
        }
        ... on EmailActivity {
          timestamp
          inboxEmailId
          shortBody
          address
          attachmentsCount
        }
      }
    }
  }
}
```

### Arguments Breakdown

* `cardUuid`: The UUID of the card whose activities you want to list.
* `order`: Sort direction for the timeline by timestamp — `asc` (oldest first) or `desc` (newest first). Optional; when omitted it defaults to `desc` (most recent first).
* `first` / `after`: Standard Relay connection pagination arguments. The connection returns at most **50** items per page.

### Example Response

```json
{
  "data": {
    "activities": {
      "edges": [
        {
          "node": {
            "__typename": "PhaseActivity",
            "timestamp": "2026-05-20T13:45:00Z",
            "kind": "initial",
            "target": "Start Form",
            "direction": "forward"
          }
        },
        {
          "node": {
            "__typename": "EmailActivity",
            "timestamp": "2026-05-21T09:12:00Z",
            "inboxEmailId": "171",
            "shortBody": "Thanks for the update",
            "address": "customer@example.com",
            "attachmentsCount": 0
          }
        }
      ]
    }
  }
}
```

## Key Notes

* **Two activity types**: each `node` is either a `PhaseActivity` or an `EmailActivity`. Use `__typename` plus inline fragments (`... on PhaseActivity`, `... on EmailActivity`) to read the type-specific fields. `PhaseActivity` exposes `timestamp`, `kind`, `target`, and `direction`; `EmailActivity` exposes `timestamp`, `inboxEmailId`, `shortBody`, `address`, and `attachmentsCount`.
* **`cardUuid` in practice**: although the schema marks `cardUuid` as optional, the query resolves the card by UUID, so a valid `cardUuid` is required to return that card's activities.
* **Permissions**: if your token lacks access to the card, the query returns a `Permission denied` error rather than data.
* **Pagination**: the connection caps results at 50 per page; use `first`/`after` to page through longer timelines.