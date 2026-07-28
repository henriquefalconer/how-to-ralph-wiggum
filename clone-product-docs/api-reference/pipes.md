# Pipes

## Definition

A **Pipe** represents a process in your company.

Pipefy allows you to set up pipes for almost every process in your company - such as purchase requisitions, customer support, sales, etc.

## Hierarchy and Relations

**Accessible through:** [`Organizations`](https://developers.pipefy.com/reference/organizations#find-pipes), [`Cards`](https://developers.pipefy.com/reference/cards#card-queries)
**Objects pipes can access directly:** [`Phases`](https://developers.pipefy.com/reference/phases), [`Start Form Fields`](https://developers.pipefy.com/reference/fields#start-form-fields), [`Users`](https://developers.pipefy.com/reference/users), [`Labels`](http://google.com)

## Pipes in our API

Through the GraphQL API, you can retrieve a pipe's information, interact with pipes and execute the actions you're able to do within Pipefy's graphical interface.

As described [here](https://developers.pipefy.com/reference/what-is-graphql), GraphQL operations always use the HTTP `POST` method, and you can use queries and mutations to interact with the API.

### Pipe Queries

Queries are used to **fetch** data from Pipefy.

**Note**
The pipe `ID` can be retrieved on the interface by looking at the URL of the pipe's page.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/4afd7cf-image_10.png",
        "image (10).png",
        378
      ],
      "caption": "Where to find a pipe's ID"
    }
  ]
}
[/block]

Queries of how to retrieve a pipe or group of pipes are shown in the code block below. Replace '12345' with the `ID` of the pipe you'd like to query for. The following fields are the most used, but there are a lot more options of data you can select from Pipes. Remember: GraphQL is a query language, so query whatever you need.

```graphql Basic Pipe Query
{
  pipe(id: 123456) {
    id
    name
    color
    users_count
    cards_count
    opened_cards_count
    emailAddress
  }
}
```

```graphql Many Pipes Query
{
  pipes(ids: [12345, 987654, 654321, 987321]) {
    id
    uuid
    name
    cards_count
  }
}
```

```graphql Objects Within Pipe
{
  pipe(id: 123456) {
    id
    uuid
    name
    cards_count
    organization {
      id
    }
    members{
      role_name
      user{
        id
        email
      }
    }
    phases {
      id
      name
    }
    start_form_fields {
      id
      label
    }
    labels{
      id
      name
      color
    }
    webhooks {
      name
      id
    }
  }
}
```

### Pipe Mutations

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.

Most of the Pipefy  API functionalities allow the CRUD operations. We saw before the Read operations to get pipes, here are the Mutations to Create, Update and Delete. Mutations are used to **change** data in Pipefy.

The minimum amount of information you need to provide to create a pipe is the name and the organization id, but to update or delete it's necessary to, at least, provide the pipe ID. If you don't know your pipe ID you can use the [Organizations queries](https://developers.pipefy.com/reference/organizations) to list all your pipes and their attributes.

```graphql createPipe
mutation {
  createPipe(input: {name: "Pipe name", organization_id: 987654}) {
    clientMutationId
  }
}
```

```graphql updatePipe
mutation {
  updatePipe(input: {id: 789456, name: "New pipe name", public: true, anyone_can_create_card: true, color: green}) {
    pipe {
      id
    }
  }
}
```

```graphql deletePipe
mutation {
  deletePipe(input: {id: 987654}) {
    success
  }
}
```

## Testing our API

When querying for pipes, there's much more information available than the ones in the examples above.
Also, keep in mind that our API has a lot of queries and mutations available not only about pipes.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.