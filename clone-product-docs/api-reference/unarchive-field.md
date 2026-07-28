# Unarchive Field

How to unarchive a field using GraphQL mutation

## Overview

This guide explains how to **unarchive a field** using Pipefy's GraphQL API. The `unarchiveField` mutation allows you to unarchive a field by setting its `archivedAt` timestamp to `null`, which removes the archived status from the field.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure you have permission to manage the pipe (Pipe admin).
3. **Field UUID**: Required. You must provide the UUID of the field you want to unarchive.

## Step 1: Find Your Field UUID

To execute this mutation, you'll need the UUID of the field you want to unarchive.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.
* You can also use the `pipe` query to list fields in a pipe:

```graphql
{
  pipe(id: 1234) {
    phases {
      name
    }
  }
}
```

## Step 2: Unarchive Field

Use the `unarchiveField` mutation to unarchive a field. You must provide the `uuid` of the field.

```graphql
mutation UnarchiveField(
  $uuid: String!
) {
  unarchiveField(input: {
    uuid: $uuid
  }) {
    success
  }
}
```

**Variables example:**

```json
{
  "uuid": "1ea56732-9009-4b8f-a112-cafe4ec057fe"
}
```

### Arguments Explained

#### Required Arguments

* **`uuid`**: The UUID of the field to unarchive

### Key Fields Returned

* **`success`**: Boolean indicating whether the mutation was successful
  * `true`: The field was unarchived successfully
  * `false`: The field unarchiving failed

## Error Handling

If the mutation fails, you'll receive an error response:

```json
{
  "data": {
    "unarchiveField": null
  },
  "errors": [
    {
      "message": "Permission denied",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "unarchiveField"
      ]
    }
  ]
}
```

### Common Error Scenarios

1. **Permission Denied**: User doesn't have the required permissions to manage the pipe
2. **Field Not Found**: Field UUID doesn't exist or user doesn't have access
3. **Authentication Issues**: Missing or invalid authentication token

## Notes

* Unarchiving a field sets the `archivedAt` timestamp to `null`, removing the archived status
* If a field is not archived, calling this mutation will have no impact on the field