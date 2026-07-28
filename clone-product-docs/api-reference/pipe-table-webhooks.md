# Pipe & Table Webhooks

## Definition

Pipe/Table Webhooks are payloads that are sent to a configured endpoint whenever an action occurs at the pipe or table level. Currently, this includes card and table record management webhooks, such as: [`card.create`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-created), [`card.field_update`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-field-update), [`card.move`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-moved), [`card.done`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-done), [`card.delete`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-deleted), [`card.late`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-slas), [`card.overdue`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-slas), [`card.expired`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-slas), activities export events such as [`audit_log.export_finished`](https://developers.pipefy.com/reference/pipe-table-webhooks#activities-export-finished), and automation events such as [`automation.execution`](https://developers.pipefy.com/reference/pipe-table-webhooks#automation-execution)

## Queries

Queries are used to fetch data using the parameters you've given as arguments. If you want to know more about queries and other GraphQL terms, read [here](https://developers.pipefy.com/reference/what-is-graphql-new-page#queries)

Below is an example of how you query for a certain pipe or table's webhooks. This takes in the [pipe or table ID](https://developers.pipefy.com/reference/pipes#pipe-queries) as it's only argument:

```graphql Webhooks
{
  pipe(id:12345){
    webhooks{
      id
      actions
      url
      email
      headers
      filters
    }
  }
}
```

```graphql Multiple Pipe's Webhooks
{
  pipes(ids:[12345, 67890] ){
    id
    name
    webhooks {
      id
      actions
      url
      email
      headers
      filters
    }
  }
}
```

## Mutations

If you want to create, make a change to, or eliminate a webhook, you can do so by using a [mutation](https://developers.pipefy.com/reference/what-is-graphql-new-page#mutations).

### Create

The first tab in the code block shows how to create a webhook.  The arguments are:

* `actions: [String]!` (see [`Card/Record Management Webhooks`](https://developers.pipefy.com/reference/pipe-table-webhooks#card-and-record-management-webhooks) section to see which valid actions are available)
* `name: String!`
* `url: String!`
* `pipe_id: ID!` OR `table_id: ID!`
* `filters: JSON` (see [CreateWebhook Input](https://api-docs.pipefy.com/reference/inputObjects/CreateWebhookInput/) documentation to see all applicable filters per action)
* `overridePrevious: Boolean` (default value: false)

> 📘 Table Records
>
> Tables contain records on our graphical interface, but for webhooks those records are considered cards. For example, use `card.create` for getting webhooks alerts for when a table record is created.

### Update

The second tab in the code block shows how to update a webhook. In the example, we're updating the action, headers, and email parameters of a webhook. The webhook's ID is the only necessary argument.

### Delete

The third tab in the code block shows how to delete a webhook. The webhook's ID is the only necessary argument.

```graphql Creating Webhook
mutation {
  createWebhook(input: {
    actions: ["card.create"],
    name: "Webhook 1",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
  }) {
    webhook {
      id
      actions
      url
    }
  }
}
```

```graphql Updating Webhook
mutation {
  updateWebhook(input: {
    id:123
    actions:["card.late"] # Changing Action
    name: "Late Card Webhook" # Changing Name
  })
}
```

```graphql Deleting Webhook
mutation {
  deleteWebhook(input: {id: 123})
}
```

## Card and Record Management Webhooks

> 📘 Note
>
> The Pipe ID shown in the response payloads are `SUIDs` (a unique alphanumeric ID).

### Card Created

Suppose you want to receive a webhook payload with the event's information whenever a card or table record is created in your pipe or table, respectively. In this case, you can use `card.create` as an argument in the `actions` parameter.

See below how to create this webhook:

```graphql card.create
mutation {
  createWebhook(input: {
    actions: ["card.create"],
    name: "Record Creation Webhook",
    table_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `create`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "action": "card.create",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "created_by": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 12345, "pipe_id": "CxeXHeOR" }
  }
}
```

### Card Field Update

Suppose you want to receive a webhook payload with the event's information whenever a card or table record has one of it's fields updated. In this case, you can use `card.field_update` as an argument in the `actions` parameter.

See below how to create this webhook:

```graphql card.field_update
  mutation {
    createWebhook(input: {
      actions: ["card.field_update"],
      name: "Field Update Webhook",
      pipe_id: 123456,
      url: "https://your-endpoint.com/",
      filters: {
        field_id: [ 123, 345 ]
      }
    }) {
      webhook {
        id
        actions
        url
      }
    }
  }
```

You can add `overridePreviousWithSameUrl: true` parameter to override previous settings for the same url and actions,
as the default behaviour for Pipefy is to deny more than one webhook with the same url and action for a pipe/table.

#### Response for `field_update`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "action": "card.field_update",
    "field": { "id": "text", "label": "text", "internal_id": 123454321 },
    "new_value": "new text value",
    "updated_by" {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 123456, "pipe_id": "CxeXHeOR" }
  }
}
```

### Card Moved

Suppose you want to receive a webhook payload with the event's information whenever a card is moved. You can use `card.move` as an argument in the `actions` parameter of the webhook creation mutation.

Below is an example of how to create this webhook:

```graphql card.move
mutation {
  createWebhook(input: {
    actions: ["card.move"],
    name: "Card Movement Webhook",
    table_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      from_phase_id: [ 123 ],
      to_phase_id: [ 345 ]
    }
  }) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `move`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "action": "card.move",
    "from": { "id": 123, "name": "Inbox" },
    "to": { "id": 345, "name": "Doing" },
    "moved_by": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 123456, "title": "Prospect 1", "pipe_id": "CxeXHeOR" }
  }
}
```

### Card Done

Suppose you want to receive a webhook payload with the event's information whenever a card is moved to a finished phase (or changed to a 'done' state with regards to table records). You can use `card.done` as an argument in the `actions` parameter of the webhook creation mutation.

> 🚧 Attention
>
> If a phase has it's settings changed from 'active' to 'done', the card will not trigger a 'card.done' webhook. The card must be moved to a finished phase for the webhook to trigger.

Below is an example of how to create this webhook:

```graphql card.done
mutation {
  createWebhook(input: {
    actions: ["card.done"],
    name: "Finished Card Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

#### Response for `done`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "action": "card.done",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "done_by": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 123456, "pipe_id": "CxeXHeOR" }
  }
}
```

### Card Deleted

Suppose you want to receive a webhook payload with the event's information whenever a card or table record is deleted. You can use `card.delete` as an argument in the `actions` parameter of the webhook creation mutation.

Below is an example of how to create this webhook:

```graphql card.delete
mutation {
  createWebhook(input: {
    actions: ["card.delete"],
    name: "Deleted Card Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

#### Response for `delete`

```json card.delete Response Payload
{
  "data": {
    "action": "card.delete",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "deleted_by": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 1234567, "title": "Prospect 1", "pipe_id": "CxeXHeOR" }
  }
}
```

Below is an example of this webhook's payload format.

### Card Comment Create

Suppose you want to receive a webhook payload with the event's information whenever a comment is made on a card. You can use `card.comment_create` as an argument in the `actions` parameter of the webhook creation mutation.

Below is an example of how to create this webhook:

```graphql card.comment_create
mutation {
  createWebhook(input: {
    actions: ["card.comment_create"],
    name: "New Card Comment Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

#### Response for `comment_create`

```json card.comment_create Response Payload with mentioned users
{
  "data": {
    "action": "card.comment_create",
    "on_phase": { "id": 273, "name": "Bad Reviews" },
    "comment": "Hello dear **@[john-doe](12345)** and **@[jane-doe](12346)**, I need your thoughts on this card status",
    "mentioned_users": [
      {
        "id": 12345,
        "name": "John Doe",
        "username": "john-doe",
        "email": "john.doe@email.com",
        "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
      },
      {
        "id": 12346,
        "name": "jane Doe",
        "username": "jane-doe",
        "email": "jane.doe@email.com",
        "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
      }
    ],
    "made_by": {
      "id": 12347,
        "name": "Rob Doe",
        "username": "rob-doe",
        "email": "rob.doe@email.com",
        "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 1234567, "title": "Prospect 1", "pipe_id": "CxeXHeOR" }
  }
}
```

```json card.comment_create Response Payload without mentioned users
{
  "data": {
    "action": "card.comment_create",
    "on_phase": { "id": 273, "name": "Bad Reviews" },
    "comment": "I approve this request",
    "mentioned_users": [],
    "made_by": {
      "id": 12347,
        "name": "Rob Doe",
        "username": "rob-doe",
        "email": "rob.doe@email.com",
        "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "card": { "id": 1234567, "title": "Prospect 1", "pipe_id": "CxeXHeOR" }
  }
}
```

Below is an example of this webhook's payload format.

### Card Email Received

Suppose you want to receive a webhook payload with the event's information whenever an email is received by a card. You can use `card.email_received` as an argument in the `actions` parameter of the webhook creation mutation.

Below is an example of how to create this webhook:

```graphql card.email_received
mutation {
  createWebhook(input: {
    actions: ["card.email_received"],
    name: "New Card Email Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

Below is an example of this webhook's payload format.

#### Response for `email_received`

```json card.email_received Response Payload
{
  "data": {
    "action": "card.email_received",
    "on_phase": { "id": 123, "name": "Bad Reviews" },
    "email": {
      "id": 1234,
      "from": "john-doe@email.com",
      "from_name": "John Doe",
      "main_to": "card-email@mail.pipefy.com",
      "to": ["card-email@mail.pipefy.com"],
      "cc": [],
      "bcc": [],
      "subject": "Email subject",
      "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\r\n\r\n-- \r\nBest regards,\r\nJohn Doe",
      "clean_text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\r\n\r\n-- \r\nBest regards,\r\nJohn Doe",
      "pipe_id": 123456,
      "card_id": 1234567,
      "sent_via_automation": false
    },
    "card": { "id": 1234567, "title": "Prospect 1", "pipe_id": "CxeXHeOR" }
  }
}
```

### Card SLAs

Click [here](https://help.pipefy.com/en/articles/625596-creating-pipe-alerts) if you want to learn about SLAs.

Suppose you want to receive a webhook payload with the event's information whenever a card or table record triggers an SLA within a pipe. There are three type of SLAs that can be used within a pipe currently:

#### Card Lateness

* Use `card.late` as an argument in the `actions` parameter of the webhook creation mutation.

#### Card Overdue

* Use `card.overdue` as an argument in the `actions` parameter of the webhook creation mutation.

#### Card Expiration

* Use `card.expired` as an argument in the `actions` parameter of the webhook creation mutation.

> 🚧 Attention
>
> Lateness and Expiration type webhooks will **not** trigger for tables, as these SLA configurations are not available at a table level.

Below is an example of how to create these webhooks:

```graphql card.late
mutation {
  createWebhook(input: {
    actions: ["card.late"],
    name: "Card Lateness Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

```graphql card.overdue
mutation {
  createWebhook(input: {
    actions: ["card.overdue"],
    name: "Card Overdue Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

```graphql card.expired
mutation {
  createWebhook(input: {
    actions: ["card.expired"],
    name: "Card Expiration Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
    filters: {
      on_phase_id: [ 123 ]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

##### Response for `SLAs`

Below is an example of these webhooks' payload format for each of the SLAs.

```json card.late Response Payload
{
  "data": {
    "action": "card.late",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "card": { "id": 123456, "pipe_id": "CxeXHeOR" }
  }
}
```

```json card.overdue Response Payload
{
  "data": {
    "action": "card.overdue",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "card": { "id": 123456, "pipe_id": "CxeXHeOR" }
  }
}
```

```json card.expired Response Payload
{
  "data": {
    "action": "card.expired",
    "on_phase": { "id": 123, name: "Phase 123"  },
    "card": { "id": 123456, "pipe_id": "CxeXHeOR" }
  }
}
```

## Activities Webhooks

### Activities Export Finished

Use `audit_log.export_finished` to receive a webhook payload whenever a pipe activities export completes — either successfully or with a failure. This action is triggered when the `exportPipeAuditLogsReport` mutation is called with `deliveryMethod: WEBHOOK`.

See below how to create this webhook:

```graphql audit_log.export_finished
mutation {
  createWebhook(input: {
    actions: ["audit_log.export_finished"],
    name: "Activities Export Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
  }) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `audit_log.export_finished` — success

```json JSON Response Payload (success)
{
  "data": {
    "action": "audit_log.export_finished",
    "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

#### Response for `audit_log.export_finished` — failure

```json JSON Response Payload (failure)
{
  "data": {
    "action": "audit_log.export_finished",
    "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": "Export could not be completed due to an internal error. Please try again."
  }
}
```

> 📘 Note
>
> The webhook payload is intentionally minimal — it signals that the export finished, nothing more. Use the `correlationId` to query `auditLogExportRequest` for all details: status, pipe information, and the pre-signed download URL (`signedUrl`, valid for up to **7 days**).
>
> In failure cases, `details` contains a human-readable error message.
>
> Use the `correlationId` returned by `exportPipeAuditLogsReport` to match the webhook payload to the original export request.

### Org Activities Export Finished

Use `audit_log.export_finished` to receive a webhook payload whenever an **org-scoped** activities export completes — either successfully or with a failure. This action is triggered when the `exportOrgAuditLogsReport` mutation is called with `deliveryMethod: WEBHOOK`.

The action name is the same as the pipe-level webhook (`audit_log.export_finished`), but this webhook is configured at the **organization** level rather than on a pipe.

#### Response for `audit_log.export_finished` — success

```json JSON Response Payload (success)
{
  "data": {
    "action": "audit_log.export_finished",
    "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

#### Response for `audit_log.export_finished` — failure

```json JSON Response Payload (failure)
{
  "data": {
    "action": "audit_log.export_finished",
    "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": "Export could not be completed due to an internal error. Please try again."
  }
}
```

> 📘 Note
>
> The payload shape is identical to the pipe-level `audit_log.export_finished` webhook. Use the `correlationId` to query `auditLogExportRequest` for full details — for org-scoped exports, the `pipe` field on that query returns `null`.
>
> In failure cases, `details` contains a human-readable error message.
>
> Use the `correlationId` returned by `exportOrgAuditLogsReport` to match the webhook payload to the original export request.

## Automation Webhooks

### Automation Execution

Suppose you want to receive a webhook payload with the event's information whenever an automation action finishes — either successfully or with an error. You can use `automation.execution` as an argument in the `actions` parameter of the webhook creation mutation.

> 🚧 Attention
>
> Each pipe supports only **one** `automation.execution` webhook. Attempting to create a second one for the same pipe returns a validation error.

See below how to create this webhook:

```graphql automation.execution
mutation {
  createWebhook(input: {
    actions: ["automation.execution"],
    name: "Automation Execution Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      status: ["failed"],
      action_name: ["send_email"],
      trigger: ["card.move"],
      executed: false
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

#### Response for `automation.execution` — success

Below is an example of this webhook's payload format when the automation action completes successfully.

```json JSON Response Payload (success)
{
  "data": {
    "action": "automation.execution",
    "payload_id": "a3f1c2d4-e5f6-7890-abcd-ef1234567890",
    "organization": {
      "id": 123,
      "uuid": "org-uuid"
    },
    "pipe": {
      "id": 456,
      "uuid": "pipe-suid",
      "name": "Hiring Pipeline"
    },
    "automation": {
      "id": 789,
      "name": "Notify on move",
      "action_name": "send_email",
      "trigger": "card.move"
    },
    "execution": {
      "id": 1011,
      "status": "success",
      "executed": true,
      "enqueued_at": "2026-06-12T10:00:00Z",
      "finished_at": "2026-06-12T10:00:01Z",
      "duration_seconds": 1.234
    },
    "card": {
      "id": 555,
      "uuid": "card-uuid",
      "title": "John Doe application"
    },
    "failure": null
  }
}
```

#### Response for `automation.execution` — failure

Below is an example of this webhook's payload format when the automation action fails.

```json JSON Response Payload (failure)
{
  "data": {
    "action": "automation.execution",
    "payload_id": "a3f1c2d4-e5f6-7890-abcd-ef1234567890",
    "organization": {
      "id": 123,
      "uuid": "org-uuid"
    },
    "pipe": {
      "id": 456,
      "uuid": "pipe-suid",
      "name": "Hiring Pipeline"
    },
    "automation": {
      "id": 789,
      "name": "Notify on move",
      "action_name": "send_email",
      "trigger": "card.move"
    },
    "execution": {
      "id": 1011,
      "status": "failed",
      "executed": false,
      "enqueued_at": "2026-06-12T10:00:00Z",
      "finished_at": "2026-06-12T10:00:01Z",
      "duration_seconds": 0.456
    },
    "card": {
      "id": 555,
      "uuid": "card-uuid",
      "title": "John Doe application"
    },
    "failure": {
      "error_type": "automation_logs_error",
      "details": "Condition not met: field 'Assignee' is blank"
    }
  }
}
```

> 📘 Note
>
> `card` and `pipe` are present only when the automation is scoped to a pipe and was triggered by a card event. They are `null` for organization-level automations.
>
> `failure` is only present when `execution.status` is `"failed"`. In all other cases it is `null`.
>
> `executed: false` means the action ran but produced no effect — for example, a move action whose conditions were not met. This is not an error and `failure` will be `null`.

### AI Agent Execution

Use `agent.ai_execution` to receive a webhook payload whenever an AI Agent automation finishes executing on a card — whether the execution succeeded or failed. The payload is delivered once per execution, after the AI agent has returned its result to Pipefy.

> 📘 Note
>
> Only one `agent.ai_execution` webhook can be registered per pipe. Attempting to create a second one for the same pipe will return a validation error.

See below how to create this webhook:

```graphql agent.ai_execution
mutation {
  createWebhook(input: {
    actions: ["agent.ai_execution"],
    name: "AI Agent Execution Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/"
  }) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Filters

You can narrow which executions trigger the webhook using the `filters` parameter. Multiple filters are ANDed together.

| Filter     | Type       | Description                                                                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `status`   | `String[]` | Accepted values: `"success"`, `"failed"`. Example: `["failed"]` receives only failed executions.                         |
| `executed` | `Boolean`  | `true` to receive only executions where the agent performed an action; `false` for executions where no action was taken. |
| `trigger`  | `String[]` | Filter by the automation's trigger event. Example: `["card.create", "card.move"]`.                                       |

```graphql agent.ai_execution with filters
mutation {
  createWebhook(input: {
    actions: ["agent.ai_execution"],
    name: "AI Agent Failures Webhook",
    pipe_id: 123456,
    url: "https://your-endpoint.com/",
    filters: {
      status: ["failed"]
    }
  }) {
    webhook {
      id
      actions
      url
      filters
    }
  }
}
```

#### Response for `agent.ai_execution` — success

Below is an example of this webhook's payload format when the AI agent execution completes successfully.

```json JSON Response Payload (success)
{
  "data": {
    "action": "agent.ai_execution",
    "payload_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "organization": {
      "id": 11111,
      "uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    },
    "pipe": {
      "id": 123456,
      "uuid": "CxeXHeOR",
      "name": "My Pipe"
    },
    "agent": {
      "id": 5678,
      "name": "Run AI Review",
      "trigger": "card.create"
    },
    "execution": {
      "id": 9999,
      "status": "success",
      "executed": true,
      "enqueued_at": "2025-06-16T14:00:00Z",
      "finished_at": "2025-06-16T14:00:07Z",
      "duration_seconds": 7.042
    },
    "card": {
      "id": 1234567,
      "uuid": "card-uuid-here",
      "title": "Vendor Contract Review"
    },
    "ai_agent": {
      "performed_actions": [
        { "type": "update_field", "field": "Status", "value": "Reviewed", "status": "success" }
      ],
      "llm_config_info": {
        "name": "Contract Reviewer",
        "provider": "openai",
        "model": "gpt-4o"
      },
      "graph_tracing": [
        { "node_name": "start", "status": "success" },
        { "node_name": "analyze", "status": "success" },
        { "node_name": "act", "status": "success" }
      ]
    }
  }
}
```

#### Response for `agent.ai_execution` — failure

```json JSON Response Payload (failure)
{
  "data": {
    "action": "agent.ai_execution",
    "payload_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "organization": {
      "id": 11111,
      "uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    },
    "pipe": {
      "id": 123456,
      "uuid": "CxeXHeOR",
      "name": "My Pipe"
    },
    "agent": {
      "id": 5678,
      "name": "Run AI Review",
      "trigger": "card.create"
    },
    "execution": {
      "id": 10000,
      "status": "failed",
      "executed": false,
      "enqueued_at": "2025-06-16T14:05:00Z",
      "finished_at": "2025-06-16T14:05:03Z",
      "duration_seconds": 3.118
    },
    "card": {
      "id": 1234567,
      "uuid": "card-uuid-here",
      "title": "Vendor Contract Review"
    },
    "ai_agent": {
      "performed_actions": null,
      "llm_config_info": null,
      "graph_tracing": null
    }
  }
}
```

> 📘 Payload fields
>
> * **`payload_id`**: Unique identifier for this webhook delivery. Use it to detect duplicate deliveries on retries.
> * **`agent.id / agent.name`**: The AI Agent automation that triggered this execution.
> * **`agent.trigger`**: The pipe event that triggered the automation (e.g. `"card.create"`).
> * **`execution.status`**: `"success"` or `"failed"`.
> * **`execution.executed`**: `true` when the AI agent performed at least one action on the card; `false` when the automation ran but the agent decided no action was needed or a pre-condition was not met.
> * **`execution.duration_seconds`**: Total time in seconds from when the execution was enqueued to when it finished. This includes queue wait time — actual AI processing time may be shorter.
> * **`ai_agent.performed_actions`**: List of actions the AI agent took during the execution. `null` when the execution failed before the agent could act.
> * **`ai_agent.llm_config_info`**: Metadata about the LLM used — name, provider, and model identifier.
> * **`ai_agent.graph_tracing`**: Step-by-step trace of the agent's internal execution graph. Useful for debugging multi-step agent flows. `null` when the agent was not reached. See [graph\_tracing node fields](#agentaiexecution--graphtracing-node-fields) below for the full field reference.

#### `agent.ai_execution` — `graph_tracing` node fields

Each entry in `graph_tracing` represents a step in the agent's internal execution graph and contains the following fields:

| Field           | Type           | Description                                                                                                            |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `node_name`     | string         | Name of the execution step (e.g. `"Execution Plan"`, `"Update card fields"`).                                          |
| `status`        | string         | Outcome of the step. One of `"SUCCESS"`, `"FAILED"`, or `"SKIPPED"`.                                                   |
| `error_message` | string \| null | Error description when the step failed. `null` on success or skipped steps.                                            |
| `reasoning`     | string \| null | The agent's explanation for what it did or why it skipped the step. `null` on certain failure types — see table below. |

##### `status` values

| Value       | Meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| `"SUCCESS"` | Step completed without errors.                                      |
| `"FAILED"`  | Step encountered an error. Execution may or may not have continued. |
| `"SKIPPED"` | Step was intentionally not executed — a pre-condition was not met.  |

##### `error_message` reference

`error_message` is always `null` when `status` is `"SUCCESS"`.

**Fixed messages**

| `error_message`                                                                                                                                                        | `status`  | Step                    | What it means                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `null`                                                                                                                                                                 | `SKIPPED` | Action steps            | The agent evaluated the step's condition and decided to skip it. See `reasoning` for the agent's explanation.             |
| `"This action wasn't executed because the condition defined for it wasn't met. The Agent evaluated the logic and continued the flow with the next applicable action."` | `SKIPPED` | Infrastructure steps    | A built-in pre-condition was not met; execution continued normally.                                                       |
| `"Could not parse tool arguments"`                                                                                                                                     | `FAILED`  | Action steps            | The model generated invalid arguments for the tool call. This is an internal LLM error — no action was taken on the card. |
| `"Node execution failed"`                                                                                                                                              | `FAILED`  | `"Document Processing"` | Generic document-processing failure with no additional detail available.                                                  |

**Dynamic messages**

| Format                                                  | `status` | Step                                | What it means                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"<ExceptionClass>: <message>"` or `"<ExceptionClass>"` | `FAILED` | `behavior_setup`                    | A configuration error occurred before any action could run — e.g. a required field was missing or the agent configuration was invalid. `reasoning` will contain `"Behavior failed during setup before any action could run: <error_message>"`. |
| Exception message (free text)                           | `FAILED` | `"Document Processing"`             | A specific library error while processing a document (e.g. a PDF parse error).                                                                                                                                                                 |
| OCR exception message (free text)                       | `FAILED` | `"Intelligent Document Processing"` | One of three OCR-specific failures: file could not be downloaded, file could not be read, or file is password-protected. The message identifies which case occurred.                                                                           |
| Exception message (free text)                           | `FAILED` | Action steps                        | A runtime error occurred while executing the action. The message comes from the underlying exception and varies by action type.                                                                                                                |

> 📘 Note on `reasoning`
>
> * **`SUCCESS`**: `"Step completed successfully."` for most steps; LLM-generated text for action steps, explaining what the agent did and which values it chose.
> * **`SKIPPED`**: LLM-generated text for action steps, explaining why the condition was not met; the fixed SKIPPED message for infrastructure steps.
> * **`FAILED`**: For action steps, `reasoning` mirrors `error_message`. For `behavior_setup`, it wraps the error in a setup-context sentence. For all other step types (`"Document Processing"`, `"Intelligent Document Processing"`, skill steps), `reasoning` is `null`.

## Testing Our API

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 📘 API Authentication
>
> Our API is protected, so you have to provide your access token to be able to complete the requests to our API.
> You can read more about our Authentication and how to get your access token in our [Authentication section](https://developers.pipefy.com/reference/authentication).
>
> Once you have the token in hands, within our playground you'll have to add a key in the headers named "Authorization", and the value must be the name "Bearer" followed by your token, like in the image below.

![Authorization token](https://files.readme.io/924343d-image_11.png "image (11).png")