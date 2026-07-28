# Retrieve Tags by Category of an Organization

Get all tags grouped by category, including all the information of the category.

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
query tagsByCategory($organizationUuid: ID!, $search: String) {
  tagsByCategory(organizationUuid: $organizationUuid, search: $search) {
    uuid
    name
    total
    visibleToMembers
    createdAt
    createdBy {
      uuid
      name
    }
    tags {
      uuid
      name
      description
      visibleToMembers
      createdBy {
        avatarUrl
        name
        uuid
        __typename
      }
      taggedResources {
        total
        __typename
      }
      taggedPipes {
        pipes {
          edges {
            node {
              name
              id
            }
          }
        }
      }
      taggedDatabases {
        databases {
          edges {
            node {
              name
              id
            }
          }
        }
      }
      __typename
    }
    __typename
  }
}
```

## Response Fields

* **nodes**: List of tag categories.
  * **name**: Name of the category.
    * 👉 If the name is `Uncategorized`, it means the tags listed under this group do not belong to any category.
  * **uuid**: UUID of the category.
  * **visibleToMembers**: if all Tags in the category are visible to members.
  * **createdAt**: When it was created.
  * **createdBy**: Who created it.
  * **tags**: Tags in the category:
    * **tag**:
      * **uuid**: UUID of the tag.
      * **name**: Name of the tag.
      * **visibleToMembers**: If the tag is visible to members
      * **taggedPipes**: All the pipes tagged with this tag.
      * **taggedDatabases**: All the databases tagged with this tag.

## Example Response

```json
{
  "data": {
    "tagsByCategory": [
      {
        "uuid": "uuid",
        "name": "Departaments",
        "total": 5,
        "default": false,
        "createdAt": "2025-03-27T17:28:20Z",
        "createdBy": {
          "uuid": "uuid",
          "name": "John"
        },
        "tags": [
          {
            "uuid": "uuid",
            "name": "RH",
            "description": null,
            "createdBy": {
              "avatarUrl": "https://gravatar.com/avatar/97c712aa60976209ae6d1c741b1338d3.png?s=144&d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png",
              "name": "John",
              "uuid": "uuid",
              "__typename": "UserReference"
            },
            "taggedResources": {
              "total": 3,
              "__typename": "TaggedResourcesCount"
            },
            "taggedPipes": {
              "pipes": {
                "edges": [
                  {
                    "node": {
                      "name": "New positions",
                      "id": "1"
                    }
                  },
                  {
                    "node": {
                      "name": "Pizzafy RH",
                      "id": "4"
                    }
                  }
                ]
              }
            },
            "taggedDatabases": {
              "databases": {
                "edges": []
              }
            },
            "__typename": "Tag"
          }
        ],
        "__typename": "TagsByCategory"
      }
    ]
  }
}
```

## Additional Notes

Use the `search` argument to filter tags by name and reduce result size.

This query is read-only and does not modify tags.

This query provides a quick and effective way to retrieve all tags grouped by category with all the category information and the tagged pipes and databases.