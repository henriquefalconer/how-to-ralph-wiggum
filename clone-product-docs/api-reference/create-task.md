# Create a Task on a Card

Create a task on a card, in the card current phase, optionally assigning users by email and emailing each assignee a link to the task.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the mutation in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must be able to manage the target card. Requests for a card you cannot manage return a `Permission denied` error.
3. **Card ID**: the ID of the card the task will be created on. The task is always created in the card current phase.

## Step 1: Find Your Card ID

* Open the card in the Pipefy UI — the URL contains it: `https://app.pipefy.com/open-cards/123456789` → **Card ID = `123456789`**.
* You can also retrieve it via the API — see our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Execute the Mutation

Use the `createTask` mutation to create a task on the card:

```graphql
mutation {
  createTask(input: {
    cardId: "123456789",
    emails: ["assignee@example.com"],
    title: "Review the order"
  }) {
    task {
      id
      title
      phase {
        id
        name
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
}
```

### Arguments Breakdown

* `cardId`: the ID of the card the task is created on. **Required.**
* `emails`: a list of emails of the users to assign to the task. **Optional** — omit it to create a task with no assignees.
* `title`: the task title. **Optional** — defaults to the card title when omitted.

### Fields Breakdown

* `task`: the created task.
  * `id`: the task ID.
  * `title`: the task title.
  * `phase`: the phase the task was created in (the card current phase).
  * `assignees`: the task assignees, each with `type`, `status`, and the related `user`.

### Example Response

```json
{
  "data": {
    "createTask": {
      "task": {
        "id": "987654",
        "title": "Review the order",
        "phase": {
          "id": "123456",
          "name": "Order"
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
}
```

## Key Notes

* **The task is created in the card current phase.** You do not choose the phase; it always follows the card current phase.
* **The form link is handled for you.** The task is anchored to the card public phase form link for that phase; if one does not exist it is created, and if it already exists it is reused.
* **One task per card and phase.** A card can hold a single task per phase. Calling the mutation again for a card that already has a task on its current phase returns the existing task instead of creating a duplicate.
* **Assignees are optional and matched by email.** Provide `emails` to assign users; omit it to create an unassigned task. Assignment tops out at 30 assignees per task, and blank emails are ignored.
* **Each assignee is emailed a link to the task.** When the task is created with at least one assignee, every assignee receives an email containing a link to the task, sent on behalf of the authenticated user making the request. Delivery happens asynchronously after the task is created, so it never blocks or changes the mutation response, and an email failure never prevents the task from being created. No email is sent when the task has no assignees, or when the organization is blocked for outbound email.
* **The task creator is the authenticated user** making the request.
* **Permission errors.** If your token cannot manage the target card, the mutation returns a `Permission denied` error. An unknown `cardId` returns a not-found error.