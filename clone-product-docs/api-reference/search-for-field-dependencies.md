# Get field dependencies by field UUID

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has permissions to view fields.
3. **Field UUID**: Identify the field.

## Step 1: Find Your Field UUID

### 1. Via GraphQL Query

* First, you need to find the pipe ID which the target field belongs to.

* Open the pipe in your browser.

* The URL will include the pipe ID: `https://app.pipefy.com/pipes/1234`.

* **Pipe ID = `1234`** (the number after `/pipes/`).

* Assuming you need to see a field from a pipe, you can look up its UUID using the `pipe` query like in the example below.

```graphql
{
  pipe(id: 1234) {
    start_form_fields {
      uuid
      label
    }
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

* If the pipe ID is correct and you are authorized, this is an example response from the query:

```json
{
  "data": {
    "pipe": {
      "start_form_fields": [
        {
          "uuid": "ac7de831-0ce1-4d27-a720-7d5a3b1adc1g",
          "label": "Title"
        }
      ],
      "phases": [
        {
          "name": "Inbox",
          "fields": [
            {
              "uuid": "1ea56732-9009-4b8f-a112-cafe4ec057fe",
              "label": "Assignee"
            },
            {
              "uuid": "704fff25-d872-452a-bd03-4e44aea14c6e",
              "label": "Priority"
            }
          ]
        },
        {
          "name": "Doing",
          "fields": []
        },
        {
          "name": "Done",
          "fields": []
        }
      ]
    }
  }
}
```

## Step 2: Query Field

Use the `field` query to retrieve all field dependencies from the target field. Below is an example:

```graphql
{
  query field($fieldUuid: ID!) {
    field(fieldUuid: "1ea56732-9009-4b8f-a112-cafe4ec057fe") {
      dependentAiAgents {
        nodes {
          id
          name
          active
          url
        }
      }
      dependentAutomations {
        totalCount
        nodes {
          id
          name
          active
          url
        }
      }
      dependentConditionals {
        totalCount
        nodes {
          id
          name
          url
        }
      }
      dependentDynamicFields {
        totalCount
        nodes {
          id
          name
          url
        }
      }
      dependentEmailTemplates {
        totalCount
        nodes {
          id
          name
          url
        }
      }
      dependentConnections {
        totalCount
        nodes {
          id
          name
          url
        }
      }
    }
  }
}
```

### Key Fields Explained:

* In case of field dependencies, some resources can be loaded:
  * `AI Agents`
    * **`id`**: AI Agent unique identifier.
    * **`name`**: Name of the AI Agent.
    * **`active`**: Whether the AI Agent is active.
    * **`url`**: AI Agent's URL.

  * `Automations`
    * **`id`**: Automation unique identifier.
    * **`name`**: Name of the automation.
    * **`active`**: Whether the automation is active.
    * **`url`**: Automation's URL.

  * `Field Conditionals`
    * **`id`**: Field conditional unique identifier.
    * **`name`**: Name of the field conditional.
    * **`url`**: Field Conditionals' URL.

  * `Dynamic Fields`
    * **`id`**: Dynamic field unique identifier.
    * **`name`**: Display name for the dynamic field, referencing the phase it lives in.
    * **`url`**: Dynamic field's URL.

  * `E-mail Templates`
    * **`id`**: E-mail template unique identifier.
    * **`name`**: Display name for the e-mail template.
    * **`url`**: E-mail template's URL.

  * `Connections`
    * **`id`**: Connection unique identifier.
    * **`name`**: Display name for the connection.
    * **`url`**: Connection's URL.

## Step 3: Execute and Interpret the Response

After running the query, you'll receive a structured JSON response. Here’s an example:

```json
{
  "data": {
    "field": {
      "dependentAiAgents": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "1",
            "name": "Sample agent",
            "active": true,
            "url": "http://app.pipefy.com/pipes/1234/settings/automations/1"
          }
        ]
      },
      "dependentAutomations": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "2",
            "name": "Sample automation",
            "active": false,
            "url": "http://app.pipefy.com/pipes/1234/settings/automations/2"
          }
        ]
      },
      "dependentConditionals": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "1",
            "name": "Sample field conditional",
            "url": "http://app.pipefy.com/pipes/1234/settings/form/conditionals/1"
          }
        ]
      },
      "dependentDynamicFields": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "1",
            "name": "Created in Inbox phase",
            "url": "http://app.pipefy.com/pipes/1234/settings/phases/2/fields/1"
          }
        ]
      },
      "dependentEmailTemplates": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "1",
            "name": "E-mail template for admins",
            "url": "http://app.pipefy.com/pipes/1234/settings/email/1"
          }
        ]
      }
      "dependentConnections": {
        "totalCount": 1,
        "nodes": [
          {
            "id": "1",
            "name": "Connection example",
            "url": "http://app.pipefy.com/pipes/1234/settings/connections/1"
          }
        ]
      }
    }
  }
}
```

This query provides a quick and effective way to retrieve information about a field dependency.