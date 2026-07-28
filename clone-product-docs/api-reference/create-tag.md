# Create Tag

Create one tag.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts).
2. **Permissions**: Your token must include admin permissions in the target organization.
3. **Organization UUID**: Required. You must provide the UUID of the organization where the tags will be created.
4. **Tag Name**: Name of the tag to be created.
5. **Description**: Description of the tag to be created
6. **VisibleToMembers**: If the tag will be visible to members
7. **Tag Category UUID (optional)**: If omitted, the tags will be created in the organization’s default tag category (uncategorized).

## Identify Organization and Category UUIDs

To execute this mutation, you’ll need the UUIDs of the organization and (optionally) the tag category.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.

## Mutation Example

```graphql
mutation createTag($description: String, $name: String!, $tagCategoryUuid: ID!, $organizationUuid: ID!, $visibleToMembers: Boolean) {
  createTag(
    input: {description: $description, name: $name, tagCategoryUuid: $tagCategoryUuid, organizationUuid: $organizationUuid, visibleToMembers: $visibleToMembers}
  ) {
    uuid
    name
    visibleToMembers
    tagCategory {
      uuid
      name
      __typename
    }
    createdBy {
      avatarUrl
      name
      uuid
      __typename
    }
    __typename
  }
}
```

### Input Fields

* **name**: Name of the tag to be created.
* **organizationUuid**: UUID of the organization that owns the tags.
* **tagCategoryUuid** *(optional)*: UUID of the tag category in which the tags should be created.
* **Description**: Description of the tag to be created
* **VisibleToMembers**: If the tag will be visible to members

If `tagCategoryUuid` is not provided, the system will:

* Attempt to use the default tag category of the organization.
* Automatically create a default tag category if none exists.

### Response Fields

* **uuid**: The unique identifier of the tag
* **name**: The tag’s name
* **tagCategory**:
  * **uuid**: UUID of the category
  * **name**: Name of the category

### Response Example

```json
{
  "data": {
    "createTag": {
      "uuid": "uuid",
      "name": "A tag",
      "visibleToMembers": true,
      "tagCategory": {
        "uuid": "uuid",
        "name": "Category",
        "__typename": "TagCategorySummary"
      },
      "createdBy": {
        "avatarUrl": "avatar.url",
        "name": "User",
        "uuid": "45093a33-cfb3-4d49-9c7f-17b623a577c3",
        "__typename": "UserReference"
      },
      "__typename": "CreatePayload"
    }
  }
}
```