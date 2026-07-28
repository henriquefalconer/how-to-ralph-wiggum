# Reorder phase fields

Move a phase field up or down to change the order it appears in a phase.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have admin access to the pipe that contains the phase.
3. **Field UUID**: Identify the UUID of the phase field you want to move.

## Step 1: Find the Field UUID

Query the phase to list its fields and their UUIDs:

```graphql
{
  phase(id: 123456789) {
    fields {
      uuid
      label
      index
    }
  }
}
```

The `index` value reflects the current display order of each field.

## Step 2: Move the Field

Use `moveUpPhaseField` to swap the field with the one before it:

```graphql
mutation {
  moveUpPhaseField(input: { uuid: "field-uuid-here" }) {
    success
  }
}
```

Or use `moveDownPhaseField` to swap it with the one after it:

```graphql
mutation {
  moveDownPhaseField(input: { uuid: "field-uuid-here" }) {
    success
  }
}
```

* **`uuid`**: The UUID of the phase field to move.

A sample response:

```json
{
  "data": {
    "moveUpPhaseField": {
      "success": true
    }
  }
}
```

## Key Notes

* Each call moves the field **one position** at a time. Run the mutation repeatedly to move a field several positions.
* Moving the first field up (or the last field down) returns the error `Field could not be moved.` — the field has no neighbor to swap with.
* An unknown UUID returns `Field not found with uuid: <uuid>`.
* Users without admin permission on the pipe receive a `Permission denied` error.
* To create new fields in a phase, see **[Create fields in a phase](https://developers.pipefy.com/reference/create-fields-in-phase)**.