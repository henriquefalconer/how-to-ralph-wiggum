# Create fields in a phase

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions.
3. **Phase ID**: Identify the Phase where the field will be created.

## Step 1: Find Your Phase ID

### 1. Via Pipefy UI

1. Open the Phase settings page in your browser.
2. The URL will include the Phase ID: `https://app.pipefy.com/pipes/123/settings/phases/123456789`.
3. **Phase ID = `123456789`** (the number after `/phases/`).

### 2. Via GraphQL Query

* Check on our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Create the Fields

Use the `createPhaseField` mutation to add fields to your phase. Below are examples for creating different types of fields.

## 1. Currency Field

Creates a field for entering currency values.

```graphql
mutation {
  createPhaseField(input: {
    phase_id: 334655689
    type: "currency"
    label: "Estimated Implementation Cost"
    description: "The estimated cost to implement the suggestion."
    required: true
  }) {
    phase_field {
      id
    }
  }
}
```

We are using several arguments here, so let's break them down to better understand what's going on.

* **`phase_id`**: The ID of the phase where the field will be added.
* **`type`**: The field type (e.g., `"currency"`, `"short_text"`, `"attachment"`).
* **`label`**: The name of the field displayed in the UI.
* **`description`**: Additional context shown below the field name.
* **`required`**: Whether the field is mandatory (`true` or `false`).

**Example response from our field creation:**

```json
{
  "data": {
    "createPhaseField": {
      "phase_field": {
        "id": "estimated_implementation_cost"
      }
    }
  }
}
```

If the operation was successful, it'll return the id of the field we just created.

Now, let's create some more fields for our phase!

## 2. Assignee Selection Field

Creates a field for assigning a reviewer to the card.

```graphql
mutation {
  createPhaseField(input: {
    phase_id: 334655689
    type: "assignee_select"
    label: "Assigned Reviewer"
    description: "The person responsible for reviewing the suggestion."
    required: true
  }) {
    phase_field {
      id
    }
  }
}
```

## 3. Radio Button Field

Creates a field for selecting the feasibility of the suggestion.

```graphql
mutation {
  createPhaseField(input: {
    phase_id: 334655689
    type: "radio_vertical"
    label: "Feasibility Assessment"
    description: "Assessment of the feasibility of the suggestion."
    options: ["High", "Medium", "Low"]
    required: true
  }) {
    phase_field {
      id
    }
  }
}
```

### New Argument

* **`options`**: Defines the available choices for selection fields.

## 4. Attachment Field

Creates a field for uploading supporting documents.

```graphql
mutation {
  createPhaseField(input: {
    phase_id: 334655689
    type: "attachment"
    label: "Supporting Documents"
    description: "Attachments or documents supporting the suggestion."
    required: false
  }) {
    phase_field {
      id
    }
  }
}
```

## Step 3. Verify the Fields

After successfully executing the mutations, your phase will include the new fields. You can explore additional arguments and field types in the GraphQL Playground to customize your phase further.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/b4aac1c89b5189a80b06cb61ea13c10a48b71a88c01c0dcec7f022bdef6fd69a-image2.gif",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]