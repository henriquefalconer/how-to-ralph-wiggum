# Update Phase Settings

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Phase ID**: The ID of the phase you want to update.

## Step 1: Find Your Phase ID

1. **Via Pipefy UI:**
   1. Click on the gear button that appears when you hover over the phase title and a modal will open over the Kanban area.
   2. The URL will include the Phase ID: `https://app.pipefy.com/pipes/1234/settings/phases/123456`.
   3. **Phase ID = `123456`** (the number after `/phases/`).
2. **Via GraphQL Query**
   1. Check on our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: Execute the Mutation

Use the `phaseSettings` mutation to update the settings of the selected phase:

```graphql
mutation {
  phaseSettings(input: {
    id: 123456,
    canReceiveCardDirectlyFromDraft: false,
    color: cyan,
    description: "An useful description of the work to be done in this phase",
    done: false,
    latenessTime: 86400,
    name: "The new name for the phase",
    teamMemberIds: [9, 13],
    identifyTask: anonymous
  }) {
    canReceiveCardDirectlyFromDraft
    color
    description
    done
    latenessTime
    name
    teamMembers {
      id
      name
    }
    identifyTask
  }
}
```

### Arguments Breakdown

* `canReceiveCardDirectlyFromDraft`: whether cards can be created directly in the phase
* `color`: the color you want for the header and title of the phase. Possible choices are:
  * blue
  * cyan
  * gray
  * green
  * indigo
  * lime
  * pink
  * purple
  * orange
  * red
  * sky
  * yellow
* `description`: a short description of the work to be done in this phase
* `done`: if this phase is and end of the process, a final phase. Possible values are `true` or `false`
* `id`: The ID of the phase you want to update
* `latenessTime`: an SLA for the phase, in seconds
* `name`: the name of the phase
* `teamMemberIds`: the id of the phase members to be assigned
* `identifyTask`: the phase identify\_task. Possible values are: `anonymous` or `identified`

### Example Response

```json
{
  "data": {
    "phaseSettings": {
      "canReceiveCardDirectlyFromDraft": false,
      "color": "cyan",
      "description": "An useful description of the work to be done in this phase",
      "done": false,
      "id": "123456",
      "latenessTime": 86400,
      "name": "The new name for the phase",
      "teamMembers": [
        {
          "id": "9",
          "name": "John"
        }
      ],
      "identifyTask": "anonymous"
    }
  }
}
```

## Troubleshooting

### Related to `teamMemberIds`

If you send and id of a user that is not a member of the pipe, the mutation will return an error such as this:

```json
{
  "data": {
    "phaseSettings": null
  },
  "errors": [
    {
      "message": "Validation failed: User is not a member of this phase's pipe.",
      "locations": [
        {
          "line": 28,
          "column": 3
        }
      ],
      "path": [
        "phaseSettings"
      ],
      "extensions": {
        "code": "RECORD_INVALID",
        "correlation_id": "93d8b236-1e48-405f-8b36-1e7d70479471"
      }
    }
  ]
}
```

It may also happen that no users are found with some of the ids provided

```json
{
  "data": {
    "phaseSettings": null
  },
  "errors": [
    {
      "message": "Couldn't find all Users with 'id': (9, 545)",
      "locations": [
        {
          "line": 28,
          "column": 3
        }
      ],
      "path": [
        "phaseSettings"
      ],
      "extensions": {
        "code": "RECORD_NOT_FOUND",
        "correlation_id": "21a2f1ed-bbed-4f92-8283-485a0cbd0c91"
      }
    }
}
```

Check the id of the members of your pipe to provide a correct input in the `teamMemberIds` attribute.