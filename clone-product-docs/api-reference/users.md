# Users

## Definition

A user is a registered person on the Pipefy App. It can be a representation of yourself, other people or bots created within Pipefy.

## User in our API

Through our API you can retrieve user informations , interact with users and execute the actions you're able to do within Pipefy's graphical interface.

### User Queries

Running queries in our API allows you to fetch information about users. You can run a `me` query to find information about yourself and run a `Organization query` to query for all members of that organization, as you can see [here](https://developers.pipefy.com/reference/organizations#find-organization-members).

See below a example of the `me` query:

```graphql Me
{
  me {
    id
    name
    email
    username
  }
}
```

### User Mutations

To run any mutation you need to have the necessary permission to do so. The same permissions that apply on actions done on the graphical interface apply to actions done through the API.

#### Organization-level Mutations

Using the mutations, you can invite, remove or change the role of a user on the organization.  If you need, you can read more about company members and permissions [here](https://help.pipefy.com/en/articles/6027079-company-roles-and-permissions).

Below are some examples of available mutations in our API:

```graphql Invite Members
mutation {
  inviteMembers(input: {
    organization_id: 1234,
    emails: [{email: "email@email.com", role_name: "admin"}]}) {
    clientMutationId
  }
}
```

```graphql Remove User
mutation {
  removeUserFromOrg(input: {organization_id: 1234, email: "email@email.com"}) {
    clientMutationId
  }
}
```

```graphql Change Permissions
mutation {
  setRole(input: {member: {
    user_id: "123456", role_name: "admin"},
    organization_id: 1234}){
    clientMutationId
  }
}
```

#### Pipe-level Mutations

Using the mutations, you can invite, remove or change the role of a user of a Pipe. If you need, you can read more about Pipe members and permissions [here](https://help.pipefy.com/en/articles/614597-meet-your-pipe-s-members-and-permission-options).

Below are some examples of available mutations in our API:

```graphql Invite Members
mutation {
  inviteMembers(input: {pipe_id: 98765, emails:  { email: "email@email.com", role_name: "admin"}}){
    clientMutationId
  }
}
```

```graphql Remove User
mutation {
  removeUserFromRepo(input: {pipe_id: 98765, email: "email@email.com"}) {
    clientMutationId
  }
}
```

```graphql Change Permissions
mutation {
  setRole(input: {member: {
    user_id: "123456", role_name: "admin"},
    pipe_id: 98765}){
    clientMutationId
  }
}
```

#### Table-level Mutations

Using the mutations, you can invite, remove or change the role of a user of a Table. If you need, you can read more about Table members and permissions [here](https://help.pipefy.com/en/articles/3793714-database-members-and-permissions).

Below are some examples of available mutations in our API:

```graphql Invite Members
mutation {
  inviteMembers(input: {table_id: 98765, emails:  { email: "email@email.com", role_name: "admin"}}){
    clientMutationId
  }
}
```

```graphql Remove User
mutation {
  removeUserFromTable(input: {table_id: 98765, email: "email@email.com"}) {
    clientMutationId
  }
}
```

```graphql Change Permissions
mutation {
  setRole(input: {member: {
    user_id: "123456", role_name: "member"},
    table_id: 98765}){
    clientMutationId
  }
}
```

If you want to know more about GraphQL, we have a whole section about it, [click here](https://developers.pipefy.com/reference/what-is-graphql) to visit our GraphQL section

## Testing our API

When querying for Users, there's much more information available than the ones in the examples of the queries shown in the **[User Queries](https://developers.pipefy.com/reference/user#user-queries)** section.
Also, keep in mind that our API has a lot of queries and mutations available not only about Users.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the data inside Pipefy.
>
> Be especially aware that removing a user from an organization or changing their role to "Guest" will make the user also be removed from all pipes, tables and will remove them from all cards that they are assignee of.