# Organizations

## Definition

Your organization in Pipefy is your company’s account. It's a virtual representation of your company's structure.
It encompasses all your processes and team members.

## Hierarchy and Relations

An organization:
**Accessible through:** [`Pipes`](https://developers.pipefy.com/reference/pipes), [`Tables`](https://developers.pipefy.com/reference/tables)
**Objects organizations can access directly:** [`Members`](https://developers.pipefy.com/reference/users#organization-level-mutations),  [`Pipes`](https://developers.pipefy.com/reference/pipes), [`Database Tables`](https://developers.pipefy.com/reference/tables), [`Organization Webhooks`](https://developers.pipefy.com/reference/organization-webhooks)

## Organizations in our API

Through our API you can fetch information about an organization using a query. To create, update and delete an organization, you should use a mutation.

### Organization Query

In the code block below, there is an example of a query which retrieves information about an organization. Replace '12345' with the `ID` of the organization you'd like to query for. The organization `ID` can be retrieved on the interface by either looking at the URL of the main organization dash page when logging into Pipefy,

![organization url](https://files.readme.io/4811bc7-image_2.png "image (2).png")

or by executing the `organizations` query on our [GraphQL Console](https://developers.pipefy.com/graphql)

```graphql Basic Organizations Query
{
  organizations{
    id
    name
  }
}
```

```graphql Objects Within Organizations
{
  organizations(ids:[28, 456, 789]){
    pipes{
      id
      name
    }
    tables{
      edges{
        node{
          id
          name
        }
      }
    }
    members{
      role_name
      user{
        id
        name
      }
    }
    webhooks{
      id
      name
    }
  }
}
```

After retrieving the organization's ID, you can search for it's attributes by executing the `organization` query with the attributes you need. Check our [GraphQL Console](https://developers.pipefy.com/graphql) to see all other attributes that are available for use.

```graphql Basic Organization Query
{
  organization(id:12345) {
    id
    name
    planName
    createdAt
  }
}
```

```graphql Objects Within Organization
{
  organization(id:123){
    pipes{
      id
      name
    }
    tables{
      edges{
        node{
          id
          name
        }
      }
    }
    members{
      role_name
      user{
        id
        name
      }
    }
    webhooks{
      id
      name
    }
  }
}
```

### Organization Mutations

Below are examples of mutations that you can use to create, update and delete an organization.

#### `createOrganization` mutation

Add a name for the new organization in the `name` parameter and the industry for which this organization is most focused towards within the `industry` parameter. Valid industries include:

* construction
* consulting
* education
* energy
* financial\_services
* health
* legal\_services
* manufacturing
* marketing
* non\_profit\_organization
* public\_sector
* retail
* tourism
* technology
* telecommunications
* transportation
* others

#### `updateOrganization`

Change the `id` to the id of your organization, and fill in the information that you need to update. In the example below, the organization's name is being updated.

#### `deleteOrganization`

Fill in the id of the organization you wish to delete.

```graphql createOrganization
mutation{
  createOrganization(input:{
    name:"New Organization"
    industry:"financial_services"
  })
}
```

```graphql updateOrganization
mutation{
  updateOrganization(input:{
    id:12345
    name:"New Name"
  })
}
```

```graphql deleteOrganization
mutation{
  deleteOrganization(input:{
    id:12345
  })
}
```

## Common Uses

Since the most accessible piece of information all users within a company will have is the organization's id, you will most likely use the organization query to find information about the children objects of that specific organization. For example, if you want to find all of your tables and pipes and some of their attributes, it won't be necessary to manually open each resource on the graphical interface to do so. Here are some examples:

### Find Tables

```graphql Find Tables
{
  organization(id:12345) {
    id
    tables {
      edges {
        node {
          id
          name
          internal_id
        }
      }
    }
  }
}
```

#### Find Pipes

```graphql Find Pipes
{
  organization(id:12345) {
    id
    name
    pipes {
      id
      name
    }
  }
}
```

#### Find Organization Members

```graphql Find Org Members
{
  organization(id:12345) {
    id
    name
    members{
      role_name
      user {
        id
        email
      }
    }
  }
}
```

## Testing our API

When querying for organizations, there's much more information available than the ones in the examples of the query shown in the [*Organization Query*](https://developers.pipefy.com/reference/organizations#organization-query) section.
Also, keep in mind that our API has a lot of queries and mutations available, not just regarding organizations.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.