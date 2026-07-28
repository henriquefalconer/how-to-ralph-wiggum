# Update Tag

Updates a Tag

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has super admin or admin permission on the organization scope.

### **Step 1. Find the Tag UUID**

Find the **tag uuid**.

You can retrieve it by running [the TagsByCategory query](./02-tags-by-category.md).

## **Step 2: Execute the Mutation**

Once you have retrieved the category tag uuid, use it to run the mutation.

```graphql
mutation updateTag($uuid: ID!, $name: String, $description: String, $tagCategoryUuid: ID, $visibleToMembers: Boolean) {
  updateTag(input: { uuid: $uuid, name: $name, description: $description, tagCategoryUuid: $tagCategoryUuid, visibleToMembers: $visibleToMembers }) {
    name
    uuid
    description
    createdBy {
      uuid
    }
    taggedPipes {
      pipes {
        edges {
          node {
            name
          }
        }
      }
    }
    taggedResources {
      total
    }
    tagCategory {
      name
      uuid
    }
  }
}
```

## Response Fields

* **uuid**: UUID of the tag.
* **name**: Name of the tag.
* **visibleToMembers**: If the tag is visible to members
* **taggedPipes**: All the pipes tagged with this tag.
* **taggedDatabases**: All the databases tagged with this tag.

## Example Response

```json
{
  "data": {
    "updateTag": {
      "uuid": "uuid",
      "name": "tag",
      "visibleToMembers": false,
      "description": null,
      "taggedPipes": {
        "pipes": {
          "edges": []
        }
      }
    }
  }
}
```