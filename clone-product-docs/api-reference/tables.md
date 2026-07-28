# Database Tables

## Database Definition

The database table is Pipefy's information storage system. It's like bookshelves where you can store and retrieve important information for your company's processes, such as customer, supplier and product registration, for example.
On Pipefy, Database and Table are two names for the same thing.

## Hierarchy and Relations

**Accessible through:** [`Organization`](https://developers.pipefy.com/reference/organizations)
**Objects tables can access directly:** [`Fields`](https://developers.pipefy.com/reference/fields#phase-fields), [`Table Records`](https://developers.pipefy.com/reference/table-records)

## Databases in our API

Through our API you can fetch information about a table using a query. To create, update and delete a table, you should use a mutation.

### Table Query

This is an example of a query which retrieves information about a table. Replace *ZtEdWh* with the ID of the table you'd like to query. The table ID can be found using an `Organization` query, as shown [here](https://developers.pipefy.com/reference/organizations#find-tables).

If you need to know more attributes regarding the table, you can fetch them with a table query. Check our [GraphQL Console](https://developers.pipefy.com/graphql).

```graphql Basic Table Query
{
  table(id: "ZtEdWh") {
    id
    name
  }
}
```

```graphql Objects Within Table
{
  table(id: "ZtEdWh") {
    id
    members {
      user {
        id
        email
      }
    }
    name
    organization {
      id
      name
    }
    public
    table_fields {
      id
      label
    }
    table_records {
      edges {
        node {
          id
          title
        }
      }
    }
    webhooks {
      id
      name
    }
  }
}
```

### Table Mutations

These are examples of mutations that you can use to create, update and delete a table.

#### `createTable`

* Change the `organization_id` and `name` on the mutation input to the ID of the organization you'd like to add the table to, and the name you'd like to give to the new table.
* If you need, you can create table fields using a `CreateTableFields` mutation, see more about fields [here](https://developers.pipefy.com/reference/fields).

#### `updateTable`

* Change the given example `id` on the mutation input to the id of the table you want to update, and fill in the information that you need to update. In this example,  both color and name are being updated.

#### `delete table`

* Change the given example `id` on the mutation input to the id of the table you want to delete.

```graphql createTable
mutation{
  createTable(input: {organization_id: 12345, name: "New Table" }) {
    clientMutationId
    table {
      id
    }
  }
}
```

```graphql updateTable
mutation {
  updateTable(input: {id: "AabB11_cC", name: "New Name", color: lime}) {
    clientMutationId
    table {
      id
    }
  }
}
```

```graphql deleteTable
mutation {
  deleteTable(input: {id: "aBcDeF"}) {
    clientMutationId
    success
  }
}
```

## Testing our API

When querying for tables, there's much more information available than the ones in the examples of the query shown in the [Table Query](https://developers.pipefy.com/reference/table#table-query) section.
Also, keep in mind that our API has a lot of queries and mutations available, not just regarding tables.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.