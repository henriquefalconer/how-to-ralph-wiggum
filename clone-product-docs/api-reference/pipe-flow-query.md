# Get pipe flow (phases with related AI agents and automations)

Query a pipe's flow by UUID to retrieve phases and their related active AI agents and automations.

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts) (Personal Access Tokens are deprecated).
2. **Permissions**: Your token must have **manage** permission on the pipe (e.g. pipe admin). Pipe members receive a "Permission denied" error.
3. **Pipe UUID**: The UUID of the pipe whose flow you want to retrieve.

## What is the pipeFlow query?

The `pipeFlow` query returns a pipe's **flow**: its non-draft phases plus, for each phase, the **active AI agents** and **active automations** that are related to that phase. Use it when you need to build a flow view (e.g. kanban or pipeline UI) that shows which AI agents and automations are tied to each phase.

## Step 1: Find your pipe UUID

### 1. Via Pipefy UI

* Open the pipe in your browser.
* The URL may include the pipe ID (numeric). The **pipe UUID** is a different identifier; you can obtain it via a GraphQL query (see below).

### 2. Via GraphQL query

* Use the `pipe` query by **pipe ID** to get the pipe's `uuid` (and other data). See our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids) for how to find the pipe ID.

```graphql
{
  pipe(id: 123456789) {
    id
    uuid
    name
  }
}
```

* From the response, use the `uuid` value as `pipeUuid` in the `pipeFlow` query.

## Step 2: Execute the pipeFlow query

Use the `pipeFlow` query with the pipe's UUID to get phases and their related active AI agents and automations:

```graphql
query flow($pipeUuid: ID!) {
  pipeFlow(pipeUuid: $pipeUuid) {
    phases {
      id
      name
      relatedActiveAiAgents {
        totalCount
        aiAgents {
          id
          name
          url
          relatedBy
        }
      }
      relatedActiveAutomations {
        totalCount
        automations {
          id
          name
          url
          relatedBy
        }
      }
    }
  }
}
```

**Variables:**

```json
{
  "pipeUuid": "f06a4ab7-8ca8-48ae-8b86-e7c8fe159bf0"
}
```

### Arguments

| Argument   | Type  | Required | Description           |
| ---------- | ----- | -------- | --------------------- |
| `pipeUuid` | `ID!` | Yes      | The UUID of the pipe. |

### Response fields

* **`phases`**: List of non-draft phases in the pipe. Each phase includes:
  * **`id`**, **`name`**: Phase identifier and name (and any other `Phase` fields you request).
  * **`relatedActiveAiAgents`**:
    * **`totalCount`**: Number of active AI agents related to this phase.
    * **`aiAgents`**: List of agents; each has **`id`**, **`name`**, **`url`**, **`relatedBy`** (e.g. `["EVENT"]`).
  * **`relatedActiveAutomations`**:
    * **`totalCount`**: Number of active automations related to this phase.
    * **`automations`**: List of automations; each has **`id`**, **`name`**, **`url`**, **`relatedBy`** (e.g. `["ACTION"]`).

## Example response

```json
{
  "data": {
    "pipeFlow": {
      "phases": [
        {
          "id": "1001",
          "name": "To Do",
          "relatedActiveAiAgents": {
            "totalCount": 2,
            "aiAgents": [
              {
                "id": "agent-uuid-1",
                "name": "Ramon Salazar",
                "url": "https://app.pipefy.com/pipes/123/ai_agents/agent_builder/agent-uuid-1/basic_info",
                "relatedBy": ["EVENT"]
              },
              {
                "id": "agent-uuid-2",
                "name": "Bitores Mendez",
                "url": "https://app.pipefy.com/pipes/123/ai_agents/agent_builder/agent-uuid-2/basic_info",
                "relatedBy": ["ACTION"]
              }
            ]
          },
          "relatedActiveAutomations": {
            "totalCount": 1,
            "automations": [
              {
                "id": "2001",
                "name": "Notify on field update",
                "url": "https://app.pipefy.com/pipes/123/settings/automations/2001",
                "relatedBy": ["EVENT", "ACTION"]
              }
            ]
          }
        },
        {
          "id": "1002",
          "name": "Done",
          "relatedActiveAiAgents": { "totalCount": 0, "aiAgents": [] },
          "relatedActiveAutomations": { "totalCount": 0, "automations": [] }
        }
      ]
    }
  }
}
```

## Error cases

* **Invalid or non-existent pipe UUID**: Returns an error with message `"Resource not found or not exist"`.
* **Insufficient permissions** (e.g. pipe member without manage permission): Returns an error with message `"Permission denied"`.

## Key notes

* Only **non-draft** phases are returned.
* **Manage** permission on the pipe is required; pipe members cannot use this query successfully.
* **`relatedBy`** indicates how the agent or automation is linked to the phase:
  * **`EVENT`**: The automation or AI agent is **triggered by an event** that targets this phase (e.g. card moved to/from this phase, card received in inbox in this phase, or a field in this phase was updated).
  * **`ACTION`**: The automation or AI agent **performs an action that affects this phase**—for example, it moves cards to this phase, updates or creates fields in this phase, sends HTTP requests using phase field values, or (for AI agents) is configured to act on fields in this phase or to move cards to this phase. `ACTION` is returned when the phase is related through what the automation/agent **does**, not through its trigger.
  * The array can contain both values (e.g. `["EVENT", "ACTION"]`) when the automation or agent is related to the phase both by its trigger and by its action.
* Use the returned `url` fields to deep-link to the AI agent or automation settings in the Pipefy UI.