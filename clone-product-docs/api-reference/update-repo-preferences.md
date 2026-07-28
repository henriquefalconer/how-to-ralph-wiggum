# Update Repo Preferences

Hide or show specific buttons and start form attributes in a pipe using the updateRepoPreferences mutation.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have `Admin` (manage) permission on the target pipe.
3. **Repo UUID**: The UUID of the pipe whose preferences you want to update. See [Get resource IDs](https://developers.pipefy.com/reference/get-resource-ids).

## Step 1: Update Repo Preferences

Use the `updateRepoPreferences` mutation to control which buttons appear in the open-card view and which attributes appear in the start form. Both arguments are optional — omitting one leaves its current value unchanged.

```graphql
mutation {
  updateRepoPreferences(input: {
    repoUuid: "pipe-uuid-here"
    hiddenTopButtons: ["Assignees", "Labels"]
    hiddenStartFormAttributes: ["DueDate"]
  }) {
    repoPreferences {
      hiddenTopButtons
      hiddenStartFormAttributes
    }
  }
}
```

**Input Explanation**:

* **`repoUuid`** *(required)*: The UUID of the pipe to update.
* **`hiddenTopButtons`** *(optional)*: Array of button names to hide in the open-card view. Accepted values: `Assignees`, `Attachments`, `Checklist`, `Comments`, `DueDate`, `Labels`, `PDF`. Pass an empty array (`[]`) to show all buttons.
* **`hiddenStartFormAttributes`** *(optional)*: Array of attribute names to hide in the start form. Pass an empty array (`[]`) to show all attributes. Omitting the argument leaves the current value untouched.

**Sample Response**:

```json
{
  "data": {
    "updateRepoPreferences": {
      "repoPreferences": {
        "hiddenTopButtons": ["Assignees", "Labels"],
        "hiddenStartFormAttributes": ["DueDate"]
      }
    }
  }
}
```

The response returns the updated `repoPreferences` object reflecting the new configuration.

## Key Notes

* **Partial updates**: Each argument is independent. Omitting `hiddenTopButtons` leaves the current top-button visibility unchanged; omitting `hiddenStartFormAttributes` does the same for start form attributes.
* **Clearing all hidden items**: Pass an empty array (`[]`) for either argument to restore full visibility for that group.
* **Invalid values**: Passing a value not in the accepted list for `hiddenTopButtons` or `hiddenStartFormAttributes` returns a `RECORD_INVALID` error.
* **Permission errors**: Tokens without `Admin` (manage) permission on the pipe receive a `PERMISSION_DENIED` error.
* **Related operations**: To query current preferences, use the `repoPreferences` field on the `pipe` query — see [Pipe Flow Query](https://developers.pipefy.com/reference/pipe-flow-query).