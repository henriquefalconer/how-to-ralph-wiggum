# Configure a Start Form on existing pipe

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions.
3. **Start Form Phase ID**: Identify the Start Form Phase where the start form will be configured.

## Step 1: Find Your Start Form Phase ID

### Via GraphQL Query

* Check on our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Configure the Start Form with the desired fields

You can use the createPhaseField mutation to add fields to your start form, like so:

```graphql
mutation {
  createPhaseField(input: {
    phase_id: 334664592
    label: "Target Date"
    type: "date"
    description: "This is the date by which the task or goal should be completed."
  }) {
    phase_field {
      id
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "createPhaseField": {
      "phase_field": {
        "id": "target_date"
      }
    }
  }
}
```

It's pretty straightforward, isn't it? This process is the same as the one used in the "[Create Fields in a Phase](https://developers.pipefy.com/reference/create-fields-in-a-phase)" use case. For more details and examples on how to create fields, feel free to refer to that section of the documentation.