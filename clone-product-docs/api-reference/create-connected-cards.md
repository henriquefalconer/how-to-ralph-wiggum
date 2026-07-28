# Create connected cards using throughConnectors

Learn how to create cards that are connected through connector fields using the throughConnectors parameter

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions to create cards in both the source and target pipes.

3. **Pipe IDs**: Identify both the source Pipe (where you're creating the card) and the target Pipe (where the connected card will be created).

4. **Connector Fields**: Ensure you have connector fields set up that connect the pipes you want to work with.

## Understanding Connected Cards and Through Connectors

**Connected cards** are cards that are linked together through **connector fields**. These fields allow you to establish relationships between cards in different pipes, enabling you to:

* Create a card in one pipe and automatically create a related card in another pipe
* Maintain data consistency across different processes
* Track relationships between different types of work items

The `throughConnectors` parameter in the `createCard` mutation allows you to specify the path of connector fields that should be used to create the connected card.

## Step 1: Understand Connector Fields

Connector fields are special field types that can connect cards between different pipes. Before creating connected cards, you need to understand the connector field structure.

### Connector Field Properties

A connector field has the following key properties:

* **`connectedRepo`**: The pipe or table you want to connect to
* **`canCreateNewConnected`**: Boolean indicating if you can create new connected items
* **`canConnectExisting`**: Boolean indicating if you can connect to existing items
* **`canConnectMultiples`**: Boolean indicating if you can connect to multiple items

## Step 2: Find Your Pipe and Connector Field Information

First, you need to identify the pipes and connector fields involved in your connection.

### Query for Pipe and Field Information

```graphql
{
  pipe(id: 34) {
    id
    name
    start_form_fields {
      id
      label
      type
      connectedRepo {
        ...on PublicPipe {
          id
        }
        ...on PublicTable {
          id
        }
      }
      canCreateNewConnected
      canConnectExisting
      canConnectMultiples
    }
    phases {
      id
      name
      fields {
        id
        label
        type
        connectedRepo {
          ...on PublicPipe {
            id
          }
          ...on PublicTable {
            id
          }
        }
        canCreateNewConnected
        canConnectExisting
        canConnectMultiples
      }
    }
  }
}
```

### Example Response

```json
{
  "data": {
    "pipe": {
      "id": "34",
      "name": "Project Management",
      "start_form_fields": [
        {
          "id": "project_name",
          "label": "Project Name",
          "type": "short_text",
          "connectedRepo": null,
          "canCreateNewConnected": false,
          "canConnectExisting": false,
          "canConnectMultiples": false
        }
      ],
      "phases": [
        {
          "id": "123456789",
          "name": "Planning",
          "fields": [
            {
              "id": "tasks_connector",
              "label": "Related Tasks",
              "type": "connector",
              "connectedRepo": {
                "id": "56",
              },
              "canCreateNewConnected": true,
              "canConnectExisting": true,
              "canConnectMultiples": true
            }
          ]
        }
      ]
    }
  }
}
```

## Step 3: Create a Connected Card

Now you can create a card that will automatically create a connected card in the target pipe using the `throughConnectors` parameter.

### Basic Connected Card Creation

```graphql
mutation {
  createCard(input: {
    pipe_id: 34
    title: "New Project: Website Redesign"
    fields_attributes: [
      {
        field_id: "project_name"
        field_value: "Website Redesign Project"
      }
    ]
    throughConnectors: {
      fieldId: "tasks_connector"
    }
  }) {
    card {
      id
      title
      fields {
        name
        value
      }
    }
  }
}
```

### Multi-Level Connection

If you need to create a card through multiple connector fields (chained connections), you can use the `nextConnectorField` parameter:

```graphql
mutation {
  createCard(input: {
    pipe_id: 34
    title: "Complex Project with Sub-tasks"
    fields_attributes: [
      {
        field_id: "project_name"
        field_value: "Complex Project"
      }
    ]
    throughConnectors: {
      fieldId: "tasks_connector"
      nextConnectorField: {
        fieldId: "subtasks_connector"
      }
    }
  }) {
    card {
      id
      title
    }
  }
}
```

## Step 4: Understanding the Through Connectors Structure

The `throughConnectors` parameter follows this structure:

```graphql
throughConnectors: {
  fieldId: "connector_field_id"           # Required: The connector field ID
  nextConnectorField: {                  # Optional: For chained connections
    fieldId: "next_connector_field_id"
    nextConnectorField: {                # Can be nested further
      fieldId: "another_connector_field_id"
    }
  }
}
```

## Step 5: Verify the Connection

After creating the card, you can verify that the connection was established by querying the card and its relationships:

```graphql
{
  card(id: "12345") {
    id
    title
    fields {
      name
      value
    }
    child_relations {
      cards {
        id
        title
      }
      pipe {
        id
        name
      }
    }
  }
}
```

## Important Considerations

### Authorization Requirements

* Your token must have permission to create cards in both the source and target pipes
* The connector fields must be properly configured with `can_create_connected_cards: true`
* The connector fields must be connected to the target pipe

### Field Configuration

* Ensure the connector field is of type `"connector"`
* Verify that `can_create_connected_cards` is set to `true`
* Check that the `connected_repo_id` points to the correct target pipe

### Error Handling

Common errors you might encounter:

1. **Permission Denied**: Your token doesn't have permission to create cards in the target pipe
2. **Invalid Connector**: The connector field doesn't allow creating connected cards
3. **Disconnected Fields**: The connector fields in the chain are not properly connected
4. **Target Not Found**: The target pipe specified in the connector field doesn't exist

## Example Use Cases

### 1. Project Management

Create a project card that automatically creates a task card in a tasks pipe.

### 2. Customer Support

Create a support ticket that automatically creates a follow-up task for the development team.

### 3. Sales Process

Create a lead card that automatically creates an opportunity card in the sales pipeline.

### 4. Multi-level Workflows

Create a main card that triggers the creation of multiple connected cards in different pipes through chained connector fields.

## Troubleshooting

If you encounter issues:

1. **Check Field Types**: Ensure you're using connector fields, not regular fields
2. **Verify Permissions**: Confirm your token has access to both pipes
3. **Validate Connections**: Make sure the connector fields are properly connected between pipes
4. **Check Field Configuration**: Verify the connector field settings allow creating connected cards