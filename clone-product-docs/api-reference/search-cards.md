# Search Cards Across Pipes in an Organization

Run a filtered, paginated, sorted search for cards across one or more pipes of an organization, with a total match count.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must be able to `show` the organization and the report scope. Requests for an organization or pipes you cannot access return a `Permission denied` error.
3. **Organization ID** and **Pipe IDs**: the organization to search within and the pipes to include in the results.

## Step 1: Find Your Organization ID and Pipe IDs

* **Organization ID**: open the organization in the Pipefy UI — the URL contains it: `https://app.pipefy.com/organizations/300000000` → **Organization ID = `300000000`**.
* **Pipe ID**: open the pipe — the URL contains it: `https://app.pipefy.com/pipes/1234` → **Pipe ID = `1234`**.
* You can also retrieve both via the API — see our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Execute the Query

Use the `cardSearch` query to search cards across the selected pipes:

```graphql
query CardSearch(
  $organizationId: ID!
  $pipeIds: [Int]!
  $pagination: ReportPaginationInput!
  $sortBy: ReportSortDirectionInput!
  $filter: ReportCardsFilter
) {
  cardSearch(
    organizationId: $organizationId
    pipeIds: $pipeIds
    pagination: $pagination
    sortBy: $sortBy
    filter: $filter
  ) {
    count
    next_page
    previous_page
    wait
    cards {
      id
      title
      current_phase {
        id
        name
      }
      pipe {
        id
        name
      }
    }
  }
}
```

With these **Query Variables**:

```json
{
  "organizationId": "300000000",
  "pipeIds": [1234],
  "pagination": { "page": 1, "perPage": 50 },
  "sortBy": { "field": "title", "direction": "asc" },
  "filter": {
    "id": 1,
    "operator": "and",
    "groups": [
      {
        "id": 2,
        "operator": "and",
        "queries": [
          { "id": 3, "type": "string", "field": "title", "label": "Title", "operator": "eq", "value": "Invoice" }
        ]
      }
    ],
    "lastId": 0
  }
}
```

### Arguments Breakdown

* `organizationId`: the organization whose cards are searched. **Required.**
* `pipeIds`: the pipes to include in the results. **Required.**
* `pagination`: how the results are paged (`page`, `perPage`). **Required.**
* `sortBy`: the sort `field` and `direction` of the results. **Required.**
* `filter`: a grouped query tree (`ReportCardsFilter`) describing the search conditions. Optional.
* `partialPipeAccess`: set to `true` to search a single pipe the user only partially accesses. Optional.

### Fields Breakdown

* `count`: the total number of cards matching the search.
* `next_page` / `previous_page`: pagination cursors, `null` when there is no further page.
* `wait`: `true` while the underlying index is still preparing the data — retry the call when `true`.
* `cards`: the matching cards. Each exposes the standard `Card` fields (e.g. `id`, `title`, `current_phase`, `pipe`).

### Example Response

```json
{
  "data": {
    "cardSearch": {
      "count": 1,
      "next_page": null,
      "previous_page": null,
      "wait": null,
      "cards": [
        {
          "id": "987654321",
          "title": "Invoice #42",
          "current_phase": { "id": "111", "name": "To Do" },
          "pipe": { "id": "1234", "name": "Finance" }
        }
      ]
    }
  }
}
```

## Key Notes

* **Search is index-backed.** When `wait` is `true`, the result set is still being prepared — retry the query.
* **`pipeIds` scopes the search.** Only cards in the listed pipes (and visible to your token) are returned.
* **`partialPipeAccess`.** When `true`, only one pipe may be passed in `pipeIds`; passing more returns an error.
* **Permission errors.** If your token cannot `show` the organization or the report scope, the query returns a `Permission denied` error.
* **Migrated from the Internal schema.** This query is available on the standard API V1 schema. The legacy Internal field is deprecated but still functional; new integrations should use the field shown above.