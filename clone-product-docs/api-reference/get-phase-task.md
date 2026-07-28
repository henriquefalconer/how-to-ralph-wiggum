# Get a Phase Task by Card and Phase

Fetch a single phase task — its assignees, fulfillment status, and form link — for a given card and phase.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have access to the card (`show` permission). Requests for a card you cannot access return a `Permission denied` error.
3. **Card ID** and **Phase ID**: the IDs of the card and the phase the task belongs to.

## Step 1: Find Your Card ID and Phase ID

* **Card ID**: open the card in the Pipefy UI — the URL contains it: `https://app.pipefy.com/open-cards/123456789` → **Card ID = `123456789`**.
* **Phase ID**: hover the phase title, click the gear icon — the URL contains it: `https://app.pipefy.com/pipes/1234/settings/phases/123456` → **Phase ID = `123456`**.
* You can also retrieve both via the API — see our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Execute the Query

Use the `task` query to fetch the phase task for the selected card and phase:

```graphql
query {
  task(cardId: "123456789", phaseId: "123456") {
    id
    title
    done
    countFulfilled
    repo {
      id
      name
    }
    phase {
      id
      name
    }
    phaseFormLink {
      url
      slug
    }
    assignment {
      type
      status
    }
    assignees {
      type
      status
      user {
        id
      }
    }
  }
}
```

### Arguments Breakdown

* `cardId`: the ID of the card the task is anchored to. **Required.**
* `phaseId`: the ID of the phase the task belongs to. **Required.**

### Fields Breakdown

* `id`: the task ID.
* `title`: the task title.
* `done`: `true` when at least one assignee has fulfilled the task.
* `countFulfilled`: the number of users that have fulfilled the task.
* `repo` / `phase`: the pipe (repo) and phase where the task resides.
* `phaseFormLink`: the public form link (`url`, `slug`) associated with the task.
* `assignment`: the current user's assignment on the task (`type`, `status`).
* `assignees`: all assignees of the task, each with `type`, `status`, and the related `user`.

### Example Response

```json
{
  "data": {
    "task": {
      "id": "987654",
      "title": "Review the order",
      "done": false,
      "countFulfilled": 0,
      "repo": {
        "id": "1234",
        "name": "Pizza Orders"
      },
      "phase": {
        "id": "123456",
        "name": "Order"
      },
      "phaseFormLink": {
        "url": "http://app.pipefy.com/public/phase_redirect/abc123?origin=tasks_area",
        "slug": "abc123"
      },
      "assignment": {
        "type": 1,
        "status": 0
      },
      "assignees": [
        {
          "type": 1,
          "status": 0,
          "user": {
            "id": "42"
          }
        }
      ]
    }
  }
}
```

## Key Notes

* **Returns a single task or `null`.** If no task matches the given `cardId` + `phaseId`, the query resolves to `null` (no error).
* **Permission errors.** If your token cannot `show` the target card, the query returns a `Permission denied` error.
* **Migrated from the Internal schema.** This query is available on the standard API V1 schema. The legacy Internal field is deprecated but still functional; new integrations should use the field shown above.