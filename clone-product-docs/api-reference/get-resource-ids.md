# Get Resource IDs

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions.

Here are examples of how to get IDs for multiple pipefy resources through graphql. Every example will have a query and an example response.

## Organization ID and UUID

```graphql
{
  organizations {
    name
    id
    uuid
  }
}
```

Example Response:

```json
{
  "data": {
    "organizations": [
      {
        "id": "2",
        "name": "AlphaCorp"
      },
      {
        "id": "3",
        "name": "GammaInc"
      },
      {
        "id": "4",
        "name": "BetaWorks"
      }
    ]
  }
}
```

## Pipe ID and UUID

You’ll need the Organization ID for this query.

```graphql
{
  organization(id: 3) {
    pipes {
      id
      name
      uuid
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "organization": {
      "pipes": [
        {
          "id": "15",
          "name": "Alpha Team"
        },
        {
          "id": "16",
          "name": "Beta Team"
        },
        {
          "id": "17",
          "name": "Gamma Team"
        },
        {
          "id": "21",
          "name": "Delta Team"
        }
      ]
    }
  }
}
```

## Table ID and UUID

You’ll need the Organization ID for this query.

```graphql
{
  organization(id: 2) {
    tables {
      edges {
        node {
          id
          name
          uuid
        }
      }
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "organization": {
      "tables": {
        "edges": [
          {
            "node": {
              "id": "T0cZ0fUi",
              "name": "People Team",
              "uuid": "06573aec-0cf0-4231-8328-2903280e208e"
            }
          }
        ]
      }
    }
  }
}
```

## Phase ID

You’ll need the Pipe ID for this query.

```graphql
{
  pipe(id: 16) {
    phases {
      id
      name
    }
  }
}

```

Example Response:

```json
{
  "data": {
    "pipe": {
      "phases": [
        {
          "id": "294",
          "name": "1 Pending Review"
        },
        {
          "id": "295",
          "name": "2 In Progress"
        },
        {
          "id": "296",
          "name": "3 Completed"
        },
        {
          "id": "297",
          "name": "4 Cancelled"
        }
      ]
    }
  }
}
```

## Start Form Phase ID

You’ll need the Pipe ID for this query.

```graphql
{
  pipe(id: 24) {
    startFormPhaseId
  }
}
```

Example Response:

```json
{
  "data": {
    "pipe": {
      "startFormPhaseId": "123"
    }
  }
}
```

## Start Form Field IDs

You’ll need the Pipe ID for this query.

```graphql
{
  pipe(id: 16) {
    start_form_fields {
      id
      label
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "pipe": {
      "start_form_fields": [
        {
          "id": "name",
          "label": "Name"
        },
        {
          "id": "email",
          "label": "Email"
        },
        {
          "id": "additional_id",
          "label": "Additional ID"
        }
      ]
    }
  }
}
```

## Phase Fields IDs

You’ll need the Phase ID for this query.

```graphql
{
  phase(id: 294) {
    fields {
      id
      label
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "phase": {
      "fields": [
        {
          "id": "reason_for_hold",
          "label": "Reason for Hold"
        },
        {
          "id": "assigned_contact",
          "label": "Assigned Contact"
        }
      ]
    }
  }
}
```

## Label IDs

You’ll need the Pipe ID for this query.

```graphql
{
  pipe(id: 1) {
    labels {
      id
      name
    }
  }
}

```

Example Response:

```json
{
  "data": {
    "pipe": {
      "labels": [
        {
          "id": "8",
          "name": "High priority"
        },
        {
          "id": "9",
          "name": "Pending Approval"
        },
        {
          "id": "10",
          "name": "Blocked"
        },
        {
          "id": "11",
          "name": "Awaiting Response"
        }
      ]
    }
  }
}
```

## Card IDs

You’ll need the Pipe ID for this query. If you have many cards in your pipe, check our [Introduction to Pagination](https://developers.pipefy.com/reference/pagination-basics) to navigate through all the cards.

```graphql
{
  cards(pipe_id: 303001213) {
    edges {
      node {
        id
        title
        current_phase {
          id
          name
        }
      }
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "cards": {
      "edges": [
        {
          "node": {
            "id": "123456789",
            "title": "Project Alpha",
            "current_phase": {
              "id": "318551446",
              "name": "Doing"
            }
          }
        },
        {
          "node": {
            "id": "234567890",
            "title": "Task Beta",
            "current_phase": {
              "id": "318551446",
              "name": "Doing"
            }
          }
        },
        {
          "node": {
            "id": "345678901",
            "title": "Initiative Gamma",
            "current_phase": {
              "id": "318551446",
              "name": "Doing"
            }
          }
        },
        {
          "node": {
            "id": "456789012",
            "title": "Operation Delta",
            "current_phase": {
              "id": "318551446",
              "name": "Doing"
            }
          }
        },
        {
          "node": {
            "id": "567890123",
            "title": "Plan Epsilon",
            "current_phase": {
              "id": "318551446",
              "name": "Doing"
            }
          }
        }
      ]
    }
  }
}
```

## Organization Members IDs

You’ll need the Organization ID for this query.

```graphql
{
  organization(id: 2) {
    users {
      id
      name
    }
  }
}

```

Example Response:

```json
{
  "data": {
    "organization": {
      "users": [
        {
          "id": "10",
          "name": "Morgan"
        },
        {
          "id": "11",
          "name": "Casey"
        },
        {
          "id": "12",
          "name": "Riley"
        },
        {
          "id": "13",
          "name": "Jamie"
        }
      ]
    }
  }
}
```

## Card Emails IDs

You’ll need the Card ID for this query.

```graphql
{
  inbox_emails(card_id: 1090621871) {
    id
    subject
    state
  }
}
```

Example Response:

```json
{
  "data": {
    "card": {
      "inbox_emails": [
        {
          "id": "123456789",
          "subject": "Project Kickoff",
          "state": "processed"
        },
        {
          "id": "987654321",
          "subject": "Weekly Status Update",
          "state": "processed"
        }
      ]
    }
  }
}
```

## Reports IDs

You’ll need the Pipe ID for this query.

```graphql
{
  pipe(id: 123) {
    reports {
      id
      name
    }
  }
}

```

Example Response:

```json
{
  "data": {
    "pipe": {
      "reports": [
        {
          "id": "1",
          "name": "Monthly Performance Summary"
        },
        {
          "id": "2",
          "name": "Project Progress Tracker"
        },
        {
          "id": "3",
          "name": "Team Task Allocation"
        }
      ]
    }
  }
}
```

## Tag Category UUIDs

You’ll need the Organization UUID for this query.

```graphql
{
  tagCategories(organizationUuid: "your-organization-uuid") {
    uuid
    name
  }
}
```

Example Response:

```json
{
  "data": {
    "tagCategories": [
      {
        "uuid": "5ad55292-3a3e-4c51-9ef4-164a3395f2fe",
        "name": "Marketing",
      },
      {
        "uuid": "46bd66df-c109-4ac2-86e3-33b1a1cd2e1e",
        "name": "Engineering",
      }
    ]
  }
}
```

## Field internal\_id for Start Form and Phase Fields

Use this when you need the internal numeric identifier for fields, which is required by some automations (e.g., AI actions).

```graphql
{
  pipe(id: 22) {
    start_form_fields {
      label
      internal_id
    }
    phases {
      fields {
        label
        internal_id
      }
    }
  }
}
```

Example Response:

```json
{
  "data": {
    "pipe": {
      "start_form_fields": [
        {
          "label": "Short text",
          "internal_id": "132"
        },
        {
          "label": "Email",
          "internal_id": "140"
        }
      ],
      "phases": [
        {
          "fields": [
            {
              "label": "Long text",
              "internal_id": "133"
            },
            {
              "label": "Select priority",
              "internal_id": "141"
            }
          ]
        },
        {
          "fields": [
            {
              "label": "Due date",
              "internal_id": "142"
            }
          ]
        },
        {
          "fields": []
        }
      ]
    }
  }
}
```

Notes:

* The Pipe ID here (e.g., `22`) is also the Repo ID used in automations.
* Use `label` only for human reference; pass the `internal_id` in automations:
  * For AI prompts: `%{INTERNAL_ID}` inside `aiParams.value` (e.g., `%{132}`).
  * For outputs: list destination `internal_id`(s) in `aiParams.fieldIds` (e.g., `133`).