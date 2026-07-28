# Retrieve Tag Categories of an Organization

Retrieve all tag categories for an organization, including details about the user who created each category.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has super admin or admin permission.

### **Step 1. Find the Organization UUID**

Find the organization UUID.

You can retrieve it using this query:

```graphql
{
  organization(id: "<ORGANIZATION_ID>") {
    uuid
  }
}
```

The organization ID can be found on the home page url: `https://app.pipefy.com/organizations/<ORGANIZATION_ID>`

## Step 2: Execute the Query

```graphql
query tagCategories($organizationUuid: ID!) {
  tagCategories(organizationUuid: $organizationUuid) {
    uuid
    name
    default
    createdAt
    createdBy {
      avatarUrl
      uuid
      name
      __typename
    }
    __typename
  }
}
```

## Response Fields

* **name**: Name of the category.
* **uuid**: Unique identifier of the tag category.
* **createdAt**: When the category was created.
* **createdBy**: Information about the user who created the category.
  * **uuid**: Unique identifier of the creator user.
  * **name**: Name of the creator user.
  * **avatarUrl**: Creator avatar url.

## Example Response

```json
{
  "data": {
    "tagCategories": [
      {
        "uuid": "5ad55292-3a3e-4c51-9ef4-164a3395f2fe",
        "name": "RH",
        "default": false,
        "createdAt": "2025-06-06T14:34:59Z",
        "createdBy": {
          "avatarUrl": "https://gravatar.com/avatar/97c712aa60976209ae6d1c741b1338d3.png?s=144&d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png",
          "uuid": "45093a33-cfb3-4d49-9c7f-17b623a577c3",
          "name": "John",
          "__typename": "UserReference"
        },
        "__typename": "TagCategory"
      }
    ]
  }
}
```

## Additional Notes

This query is read-only and does not modify tag categories.

This query offers a quick and effective way to retrieve all tag categories for the specified organization, along with information about the user who created each category.