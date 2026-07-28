# Organization Webhooks

## Definition

Organization webhooks are payloads that are sent to a configured endpoint whenever an action occurs at the organization level. Currently, this includes user management webhooks, such as: [`user.invitation_sent`](https://developers.pipefy.com/reference/organization-webhooks#user-invited), [`user.invitation_acceptance`](https://developers.pipefy.com/reference/organization-webhooks#invitation-accepted), [`user.role_set`](https://developers.pipefy.com/reference/organization-webhooks#permission-role-change), [`user.removal_from_org`](https://developers.pipefy.com/reference/organization-webhooks#removal-from-organization)

## Queries

Queries are used to fetch data using the parameters you've given as arguments. If you want to know more about queries and other GraphQL terms, read [here](https://developers.pipefy.com/reference/graphql-structure)

Below is how you query for a certain organization's webhooks. This takes in the [organization's ID](https://developers.pipefy.com/reference/organizations#organization-query) as it's only argument:

```graphql Organization's Webhooks
{
  organization(id: 12345) {
    webhooks {
      id
      name
      email
      actions
      url
      headers
    }
  }
}
```

```graphql Multiple Organization's Webhooks
{
  organizations(ids: [12345, 67890, 98765]) {
    webhooks {
      id
      name
      email
      actions
      url
      headers
    }
  }
}
```

## Mutations

If you want to create, make a change to, or eliminate a webhook, you can do that using a [mutation](https://developers.pipefy.com/reference/what-is-graphql-new-page#mutations).

### Create

The first tab in the code block shows how to create an organization webhook.  The required arguments are:

* `actions: [String]!` (see [`User Management Webhooks`](https://developers.pipefy.com/reference/organization-webhooks#user-management-webhooks) section to see which valid actions are available)
* `name: String!`
* `url: String!`
* `organization_id: ID!`

### Update

The second tab in the code block shows how to update an organization webhook. In the example, we're updating the action, headers, and email parameters of a webhook. The webhook's ID is the only necessary argument.

### Delete

The third tab in the code block shows how to delete an organization webhook. The webhook's ID is the only necessary argument.

```graphql Creating Organization Webhook
mutation {
  createOrganizationWebhook(input: {
    actions: ["user.invitation_sent"],
    name: "Webhook 1",
    organization_id: 123456,
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

```graphql Updating Organization Webhook
mutation{
  updateOrganizationWebhook(input:{
    id:123
    actions:["user.role_set"] # New action
    headers:["Header"] # New header
    email:"john-doe@email.com" # Adding Email
  })
}
```

```graphql Deleting Organization Webhook
mutation {
  deleteOrganizationWebhook(input: {id: 123})
}
```

## User Management Webhooks

### User Invited

Suppose you want to receive a webhook payload with the event's information whenever a user is invited to your organization. In this case, you can use `user.invitation_sent` as an argument in the `actions` parameter. See below how to create this webhook:

```graphql user.invitation_sent
mutation {
  createOrganizationWebhook(input: {
    actions: ["user.invitation_sent"],
    name: "User Invited",
    organization_id: 123456,
    url: "https://your-endpoint.com/"}) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `invitation_sent`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "payload_id": "0x0x0x0x-0xx0-00xx-0000-x0x000x0x000",
    "action": "user.invitation_sent",
    "user": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "user_invited_by": {
      "id": 98765,
      "name": "Jane Doe",
      "username": "jane-doe",
      "email": "jane.doe@email.com"
    },
    "to": { "organization_id": 11111, "name": "Organization 1" }
  }
}
```

### Invitation Accepted

Suppose you want to receive a webhook payload with the event's information whenever someone you've invited to join your company accepts the invitation. You can use `user.invitation_acceptance` as an argument in the `actions` parameter of the webhook creation mutation.

> 📘 Important
>
> The webhook only triggers if a user with that email address has not yet been created within Pipefy, and only if they create an account via the invitation link. If a person creates an account manually, and is then invited to an organization, this webhook will not be triggered.

Below is an example of how to create this webhook:

```graphql user.invitation_acceptance
mutation {
  createOrganizationWebhook(input: {
    actions: ["user.invitation_acceptance"],
    name: "User Invitation Acceptance",
    organization_id: 123456,
    url: "https://your-endpoint.com/"}) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `invitation_acceptance`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "payload_id": "0x0x0x0x-0xx0-00xx-0000-x0x000x0x000",
    "action": "user.invitation_acceptance",
    "user": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "accepted_at": "2022-03-22 23:21:57 UTC"
  }
}
```

### Permission Role Change

Suppose you want to receive a webhook payload with the event's information whenever a user has their permission changed at an organization level. You can use `user.role_set` as an argument in the `actions` parameter of the webhook creation mutation. Below is an example of how to create this webhook:

```graphql user.role_set
mutation {
  createOrganizationWebhook(input: {
    actions: ["user.role_set"],
    name: "User Permission Change (Organization)",
    organization_id: 123456,
    url: "https://your-endpoint.com/"}) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `role_set`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "payload_id": "0x0x0x0x-0xx0-00xx-0000-x0x000x0x000",
    "action": "user.role_set",
    "user": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "action_done_by": {
      "id": 98765,
      "name": "Jane Doe",
      "username": "jane-doe",
      "email": "jane.doe@email.com"
    },
    "from": { "organization_id": 11111, "name": "Organization 1" },
    "previous_role": null,
    "new_role": "admin",
    "action_done_at": "2022-03-22 20:06:14 -0300"
  }
}
```

### Removal From Organization

Suppose you want to receive a webhook payload with the event's information whenever a user is removed from your organization. You can use `user.removal_from_org` as an argument in the `actions` parameter of the webhook creation mutation. Below is an example of how to create this webhook:

```graphql user.removal_from_org
mutation {
  createOrganizationWebhook(input: {
    actions: ["user.removal_from_org"],
    name: "User Removal From Organization",
    organization_id: 123456,
    url: "https://your-endpoint.com/"}) {
    webhook {
      id
      actions
      url
    }
  }
}
```

#### Response for `removal_from_org`

Below is an example of this webhook's payload format.

```json JSON Response Payload
{
  "data": {
    "payload_id": "0x0x0x0x-0xx0-00xx-0000-x0x000x0x000",
    "action": "user.removal_from_org",
    "user": {
      "id": 12345,
      "name": "John Doe",
      "username": "john-doe",
      "email": "john.doe@email.com",
      "avatar_url": "https://gravatar.com/avatar/0000x0x0x000000x0x00000xx0000xx0.png?s=144\u0026d=https://pipestyle.staticpipefy.com/v2-temp/illustrations/avatar.png"
    },
    "user_removed_by": {
      "id": 98765,
      "name": "Jane Doe",
      "username": "jane-doe",
      "email": "jane.doe@email.com"
    },
    "from": { "organization_id": 11111, "name": "Organization 1" },
    "action_done_at": "2022-03-22 20:45:36 -0300"
  }
}
```

## Testing Our API

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 📘 API Authentication
>
> Our API is protected, so you have to provide your access token to be able to complete the requests to our API.
> You can read more about our Authentication and how to get your access token in our [Authentication section](https://developers.pipefy.com/reference/authentication).
>
> Once you have the token in hands, within our playground you'll have to add a key in the headers named "Authorization", and the value must be the name "Bearer" followed by your token, like in the image below.

![Headers Token](https://files.readme.io/62b0819-image_9.png "image (9).png")