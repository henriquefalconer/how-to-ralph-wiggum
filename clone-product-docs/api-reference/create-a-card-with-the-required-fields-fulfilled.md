# Create a card with the required fields fulfilled

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Pipe ID**: Identify the Pipe where the card will be created.

## Step 1: Find Your Pipe ID

### 1. Via Pipefy UI

1. Open the Pipe in your browser.
2. The URL will include the Pipe ID: `https://app.pipefy.com/pipes/123456789`.
3. Pipe ID = `123456789` (the number after `/pipes/`).

### 2. Via GraphQL Query

1. Check on our [Get resource IDs page.](https://developers.pipefy.com/reference/get-resource-ids)

## Step 2: Identify Required Fields

Fetch the information of each field of the Start Form (like id, label, type and if it's required or not). For that, we’ll use the pipe query with the id we got in the previous step.

```graphql
{
  pipe(id: 34) {
    start_form_fields {
      id
      required
      label
      type
      options
    }
    labels {
      id
      name
    }
  }
}
```

In this case, the response was the following:

```json
{
  "data": {
    "pipe": {
      "start_form_fields": [
        {
          "id": "employee_name",
          "required": true,
          "label": "Employee Name",
          "type": "short_text",
          "options": []
        },
        {
          "id": "department",
          "required": true,
          "label": "Department",
          "type": "select",
          "options": [
            "HR",
            "IT",
            "Finance",
            "Marketing"
          ]
        },
        {
          "id": "start_date",
          "required": true,
          "label": "Start Date",
          "type": "date",
          "options": []
        },
        {
          "id": "end_date",
          "required": true,
          "label": "End Date",
          "type": "date",
          "options": []
        },
        {
          "id": "reason",
          "required": false,
          "label": "Reason",
          "type": "long_text",
          "options": []
        },
        {
          "id": "priority",
          "required": true,
          "label": "Priority",
          "type": "label_select",
          "options": [
            "High",
            "Medium",
            "Low"
          ]
        }
      ],
      "labels": [
        {
          "id": "3145549",
          "name": "High"
        },
        {
          "id": "3145540",
          "name": "Medium"
        },
        {
          "id": "3145541",
          "name": "Low"
        }
      ]
    }
  }
}
```

In our query, we retrieve six fields: `id`, `required`, `label`, `type`, `options`, and `label_select`. However, the key ones for our task are `id`, `options`, and `required`. The `id` will be used in the next step to create the card, `options` provide information about the supported values for that field, and `required` indicates whether filling out the field is mandatory.

The other three fields offer additional context. `label` is the name assigned to the field by the form creator, helping us understand the expected input. `type` specifies the kind of data the field supports, such as `date`, `short_text`, `select`, or `label_select` (which includes a predefined set of values retrieved through the `options` field).

In the special case of `label_select`, we don’t use the label’s name directly. Instead, we use its `id`, which we retrieve from the `labels` field in the `pipe` query. We’ll use that `id` when selecting that label in the `createCard` mutation.

## Step 3: Create the Card (GraphQL Mutation)

The `createCard` mutation is used to create a new card within a specific Pipe in Pipefy. This mutation takes a structured input object, making it easy to define all necessary details in a single request.

The `input` argument contains two key elements: `pipe_id`, which specifies the Pipe where the card will be created, and `fields_attributes`, an array of objects representing the fields to be filled. Each field object includes a `field_id`, identifying the specific field in the Pipe, and a `field_value`, which holds the corresponding data. The values can be simple strings, as seen with fields like `employee_name` and `department`, or, in some cases, an array, such as `priority`, which likely references a predefined label.

```graphql
mutation {
  createCard(input: {
    pipe_id: 34
    fields_attributes: [
      {
        field_id: "employee_name"
        field_value: "Palmer Ebert"
      },
      {
        field_id: "department"
        field_value: "Marketing"
      },
      {
        field_id: "start_date"
        field_value: "2049-03-25"
      },
      {
        field_id: "end_date"
        field_value: "2049-04-13"
      },
      {
        field_id: "reason"
        field_value: "Personal time off for rest and recharge."
      },
      {
        field_id: "priority"
        field_value: ["3145549"]
      }
    ]
  }) {
    card {
      id
    }
  }
}
```

In this example, a card is being created in Pipe ID `34`, with fields specifying details such as the employee’s name, department, start and end dates, reason for the request, and priority. The mutation returns a `card` object containing only the `id` of the newly created card, which serves as confirmation that the operation was successful and allows for further interactions with the card if needed.