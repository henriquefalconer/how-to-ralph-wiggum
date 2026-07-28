# Run Multiple Queries or Mutations in a Single Request

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).
2. **Permissions**: Ensure your token has the necessary permissions.

## Batching Basics

GraphQL allows you to execute multiple queries or mutations in a single HTTP request. This reduces overhead and improves efficiency when performing bulk operations.

### Key Rules

1. **Aliases Required for Duplicate Operations:**
   Use aliases to avoid naming conflicts when running identical mutations/queries.
2. **Order of Execution:**
   Operations run sequentially (in the order they’re written).
3. **Error Handling:**
   If one operation fails, subsequent operations will still execute.

### Common Use Cases

#### 1. Create Multiple Fields in One Request

**Scenario:** Add multiple fields to a phase in a single batch.

**Example Mutation:**

```graphql
mutation {
  createReviewerField: createPhaseField(input: {
    phase_id: "334655689"
    type: "assignee_select"
    label: "Assigned Reviewer"
    required: true
  }) { phase_field { id } }

  createFeasibilityField: createPhaseField(input: {
    phase_id: "334655689"
    type: "radio_vertical"
    label: "Feasibility Assessment"
    options: ["High", "Medium", "Low"]
  }) { phase_field { id } }

  createCostField: createPhaseField(input: {
    phase_id: "334655689"
    type: "currency"
    label: "Estimated Cost"
  }) { phase_field { id } }
}

```

##### Key Details

* Aliases (`createReviewerField`, `createFeasibilityField`, etc.) differentiate identical mutations.
* Each mutation runs sequentially.

##### Example Response

```json
{
  "data": {
    "createReviewerField": {
      "phase_field": {
        "id": "assigned_reviewer"
      }
    },
    "createFeasibilityField": {
      "phase_field": {
        "id": "feasibility_assessment"
      }
    },
    "createCostField": {
      "phase_field": {
        "id": "estimated_cost"
      }
    }
  }
}
```

#### 2. Fetch Multiple Data Points in One Request

**Scenario**: Retrieve organization and user data simultaneously.

**Example Query:**

```graphql
{
  OrganizationStats: organization(id: "123") {
    pipesCount
    membersCount
  }
  CurrentUser: me {
    id
    name
    email
  }
}
```

**Example Response:**

```json
{
  "data": {
    "OrganizationStats": {
      "pipesCount": 95,
      "membersCount": 18
    },
    "CurrentUser": {
      "id": "987",
      "name": "John Doe",
      "email": "john.doe@pipefy.com"
    }
  }
}
```

#### Key Tips

1. **Use Aliases Liberally:**
   1. Avoid conflicts with unique names like `getData1`, `getData2`, or descriptive aliases like `ProjectCards`.

      ```graphql
      mutation {
        createTask: createCard(...) { ... }
        updatePhase: updatePhase(...) { ... }
      }
      ```

2. **Limit Batch Sizes:**
   1. Large batches may trigger rate limits (`USAGE_LIMIT_EXCEEDED`).

3. **Error Handling:**
   1. Check the `errors` array in the response to identify failed operations.

4. **Performance**:
   1. Sending too many operations in a single batch can degrade performance.

## When to Avoid Batching

* **Critical Transactions:** Use single operations for mission-critical tasks.
* **Complex Dependencies:** If one mutation depends on another’s output, execute them sequentially.