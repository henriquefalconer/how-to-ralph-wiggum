# Create Tags in Bulk

Create multiple tags at once by specifying their names and the target organization or tag category.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts).
2. **Permissions**: Your token must include admin permissions in the target organization.
3. **Organization UUID**: Required. You must provide the UUID of the organization where the tags will be created.
4. **Tag Names**: Provide a list of tag names to be created.
5. **Tag Category UUID (optional)**: If omitted, the tags will be created in the organization’s default tag category (uncategorized).

## Identify Organization and Category UUIDs

To execute this mutation, you’ll need the UUIDs of the organization and (optionally) the tag category.

* Refer to our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for guidance on retrieving UUIDs using GraphQL queries.

## Mutation Example

```graphql
mutation {
  createTagsInBulk(input: {
    names: ["HR", "IT"]
    organizationUuid: "e3531855-8330-4120-a90d-44ec870e159b",
    visibleToMembers: true
  }) {
    tags {
      uuid
      name
      visibleToMembers
      tagCategory {
        uuid
        name
      }
    }
  }
}
```

### Input Fields

* **names**: List of tag names to be created.
* **visibleToMembers**: Whether the tags should be visible to members.
* **organizationUuid**: UUID of the organization that owns the tags.
* **tagCategoryUuid** *(optional)*: UUID of the tag category in which the tags should be created.

If `tagCategoryUuid` is not provided, the system will:

* Attempt to use the default tag category of the organization.
* Automatically create a default tag category if none exists.

### Response Fields

* **tags**: A list of the created tags. Each tag includes:

  * **uuid**: The unique identifier of the tag
  * **name**: The tag’s name
  * **visibleToMembers**: Whether the tag is visible to members
  * **tagCategory**:
    * **uuid**: UUID of the category
    * **name**: Name of the category

### Response Example

```json
{
  "data": {
    "createTagsInBulk": {
      "tags": [
        {
          "uuid": "07aa2f58-b77c-4d26-b535-cd3e1a6a7c12",
          "name": "HR",
          "visibleToMembers": true,
          "tagCategory": {
            "uuid": "5c1b8b1f-0b21-4b8c-9d6d-5d0aab17012f",
            "name": "Departments",
          }
        },
        {
          "uuid": "3d94f78f-2eaa-4e52-95b4-f2fdc64612e9",
          "name": "IT",
          "visibleToMembers": true,
          "tagCategory": {
            "uuid": "5c1b8b1f-0b21-4b8c-9d6d-5d0aab17012f",
            "name": "Departments",
          }
        },
        {
          "uuid": "3d94f78f-2eaa-4e52-95b4-f2fdc64612e9",
          "name": "Sales",
          "visibleToMembers": true,
          "tagCategory": {
            "uuid": "5c1b8b1f-0b21-4b8c-9d6d-5d0aab17012f",
            "name": "Departments",
          }
        }
      ]
    }
  }
}
```

This mutation allows you to efficiently create multiple tags in a single request, assigning them to a specific category or letting the system manage categorization by using the default category.