# Move Card to a Different Phase

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Card ID**: The ID of the card you want to move.

4. **Destination Phase ID**: The ID of the phase where the card will be moved.

## Step 1: Find Your Card ID

1. **Via Pipefy UI:**
   1. Open the Card in your browser.
   2. The URL will include the Card ID: `https://app.pipefy.com/open-cards/123456789`.
   3. **Card ID = `123456789`** (the number after `/open-cards/`).
2. **Via GraphQL Query**
   1. Check on our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Find Your Destination Phase ID

1. **Via Pipefy UI:**
   1. Open the Phase settings in your browser.
   2. The URL will include the Phase ID: `https://app.pipefy.com/pipes/316983121/phases/123456789`.
   3. **Phase ID = `123456789`** (the number after `/phases/`).
2. **Via GraphQL Query:**
   1. [How to get the phase ID](https://developers.pipefy.com/reference/get-resource-ids#phase-id)

## Step 3: Execute the Mutation

Use the `moveCardToPhase` mutation to transition the card:

```graphql
mutation {
  moveCardToPhase(input: {
    card_id: 600962891
    destination_phase_id: 316983121
  }) {
    card {
      current_phase {
        id
      }
    }
  }
}
```

### Arguments Breakdown

* `card_id`: The ID of the card you're moving.
* `destination_phase_id`: The ID of the phase where the card will be placed.

### Example Response

```json
{
  "data": {
    "moveCardToPhase": {
      "card": {
        "current_phase": {
          "id": "316983121"
        }
      }
    }
  }
}
```

Notice that the returned ID matches the `destination_phase_id`, so the mutation worked correctly and now the card is in the desired phase.

**Important:** Phases in Pipefy have specific configurations that control where cards can be moved **from** and **to**. If the destination phase doesn't allow the movement you're attempting, you'll encounter an error. To resolve this, check the **Move card settings** option in the Pipefy UI (hover over the phase title -> click on the three dots \[more options] -> Move card settings).