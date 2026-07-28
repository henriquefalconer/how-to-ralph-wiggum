# Archive Field

How to archive a field using GraphQL mutation

## Overview

This guide explains how to **archive a field** using Pipefy's GraphQL API. The `archiveField` mutation allows you to archive a field by setting its `archivedAt` timestamp, which marks the field as archived without deleting it.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure you have permission to manage the pipe (Pipe admin).
3. **Field UUID**: Required. You must provide the UUID of the field you want to archive.

## Step 1: Find Your Field UUID

To execute this mutation, you'll need the UUID of the field you want to archive.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.
* You can also use the `pipe` query to list fields in a pipe:

```graphql
{
  pipe(id: 1234) {
    phases {
      name
      fields {
        uuid
        label
      }
    }
  }
}
```

## Step 2: Archive Field

Use the `archiveField` mutation to archive a field. You must provide the `uuid` of the field.

```graphql
mutation ArchiveField(
  $uuid: String!
) {
  archiveField(input: {
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

* **`uuid`**: The UUID of the field to archive

### Key Fields Returned

* **`success`**: Boolean indicating whether the mutation was successful
  * `true`: The field was archived successfully
  * `false`: The field archiving failed

## Error Handling

If the mutation fails, you'll receive an error response:

```json
{
  "data": {
    "archiveField": null
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
        "archiveField"
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

* Archiving a field sets the `archivedAt` timestamp but does not delete the field
* If a field is already archived, calling this mutation will have no impact in the field