# Add Tags to a Resource

Add multiple tags to a resource using its UUID and type.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has permissions to view automations.
3. **Resource Type**: You must specify the type of resource (pipe or database).
4. **Resource UUID**: You must have the UUID of the pipe or database you want to tag.
5. **Tag UUIDs**: A list of tag UUIDs that you want to add.

## Step 1: Identify the Resource and Tag UUID

### 1. Via GraphQL Query

The resource and tag UUIDs are not displayed in the UI and must be retrieved through a GraphQL query.

* To learn how to retrieve the resource UUID, visit our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).
* To learn how to retrieve the tag UUID, refer to our [TagsByCategoryOnResource use case](https://developers.pipefy.com/reference/tags-by-category-on-resource) page.

## Step 2: Execute the Mutation

```graphql
  mutation {
    addTagsToResource(
      input: {
        resourceType: pipe
        resourceUuid: "pipe-uuid-example"
        tagsUuids: ["tag-uuid-1", "tag-uuid-2"]
      }
    ) {
      success
      errors
      tags {
        uuid
        name
      }
    }
  }
```

* **resourceType**: Must be pipe or database.
* **resourceUuid**: UUID of the target pipe or database.
* **tagsUuids**: List of UUIDs of tags you want to add.

### Response Fields

* **success**: Returns true if all tags were successfully added.
* **errors**: A list of validation errors, if any.
* **tags**: An array of tags that were successfully added. Each tag includes:
  * **uuid**: Unique identifier of the tag
  * **name**: Tag name

### Response Example

```json
{
  "data": {
    "addTagsToResource": {
      "success": true,
      "errors": [],
      "tags": [
        {
          "uuid": "1e7e7a02-261e-456c-bde3-0ffd6d4b15d4",
          "name": "Tag number 1"
        },
        {
          "uuid": "e642b5f4-4fab-4de7-943f-25e92f5ef256",
          "name": "Tag number 2"
        }
      ]
    }
  }
}
```

This mutation provides a quick and effective way to add tags to a pipe or database by specifying their UUIDs.