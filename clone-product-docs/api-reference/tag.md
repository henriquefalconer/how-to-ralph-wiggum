# Retrieve a Tag by UUID

Retrieve a specific tag and its details using its UUID.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has super admin or admin permission on the organization scope.

### **Step 1. Find the Tag UUID**

Find the **tag UUID**.

You can retrieve it by running [the TagsByCategory query](./02-tags-by-category.md), or by navigating to the tag in the Pipefy admin panel — the UUID is visible in the URL:

`https://app.pipefy.com/organizations/<ORGANIZATION_ID>/admin-panel/tags/<TAG_UUID>`

## Step 2: Execute the Query

```graphql
query tag($uuid: ID!) {
  tag(uuid: $uuid) {
    uuid
    name
    description
    createdAt
    category {
      uuid
      name
      default
      __typename
    }
    createdBy {
      uuid
      name
      avatarUrl
      __typename
    }
    __typename
  }
}
```

## Response Fields

* **uuid**: Unique identifier of the tag.
* **name**: Name of the tag.
* **description**: Description of the tag.
* **createdAt**: When the tag was created.
* **category**: The category this tag belongs to.
  * **uuid**: Unique identifier of the category.
  * **name**: Name of the category.
  * **default**: Whether this is the default (uncategorized) category.
* **createdBy**: Information about the user who created the tag.
  * **uuid**: Unique identifier of the creator user.
  * **name**: Name of the creator user.
  * **avatarUrl**: Creator avatar URL.

## Example Response

```json
{
  "data": {
    "tag": {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "RH",
      "description": "Human Resources related processes",
      "createdAt": "2025-06-06T14:34:59Z",
      "category": {
        "uuid": "5ad55292-3a3e-4c51-9ef4-164a3395f2fe",
        "name": "Departments",
        "default": false,
        "__typename": "TagCategorySummary"
      },
      "createdBy": {
        "uuid": "45093a33-cfb3-4d49-9c7f-17b623a577c3",
        "name": "John",
        "avatarUrl": "https://gravatar.com/avatar/97c712aa60976209ae6d1c741b1338d3.png?s=144&d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png",
        "__typename": "UserReference"
      },
      "__typename": "Tag"
    }
  }
}
```

## Additional Notes

This query returns `null` if the UUID does not exist or if the token does not have permission on the organization that owns the tag.

This query is read-only and does not modify the tag.