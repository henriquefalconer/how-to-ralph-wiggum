# Table Records

## Definition

In the same way that **cards** belongs to Pipes, Table **records** belongs to Tables and relates to the information stored inside Database Tables.

If you need to understand better the concept of Database Tables, please take a look at our [Database Tables](https://developers.pipefy.com/reference/table) documentation.

## Hierarchy and Relations

**Accessible through:**[`Tables`](https://developers.pipefy.com/reference/tables#table-query)
**Objects tables records can access directly:** [`Fields`](https://developers.pipefy.com/reference/fields#phase-fields), [`Record Values`](https://developers.pipefy.com/reference/fields#table-record-fields)

## Table Records in our API

Through the GraphQL API, you can retrieve TableRecords information, interact with TableRecords and execute the actions you're able to do within Pipefy's graphical interface.

As described [here](https://developers.pipefy.com/reference/what-is-graphql), GraphQL operations always use the HTTP `POST` method, and you can use queries and mutations to interact with the API.

### Table Records Queries

Queries are used to **fetch** data from Pipefy.

Here are some examples of queries to retrieve table records by its `ID`. You can get the record ID in the URL, if have the record opened in Pipefy UI, or list their `IDs` with the `table_records` query by table ID ( the table ID can be found using an `Organization` query, as shown [here](https://developers.pipefy.com/reference/organizations#find-tables)).

The following fields are the most used, but there are a lot more options of data you can select from TableRecords. Remember: GraphQL is a query language, so query whatever you need.

```graphql table_record
{
  table_record(id: 987654) {
    id
    title
    done
    table {
      id
    }
    created_at
    created_by {
      id
    }
  }
}
```

```graphql table_records
{
  table_records(table_id: ID) {
    edges {
      node {
        id
        title
        done
        table {
          id
        }
        created_at
        created_by {
          id
        }
      }
    }
  }
}
```

### Table Records Mutations

Most of the Pipefy API functionalities allow CRUD operations. We saw before the Read operations to **get TableRecords**, here are the Mutations to create, update and delete TableRecords, since Mutations are used to **change** data in Pipefy.
If you need to update the values of its fields, you can use the `setTableRecordFieldValue` mutation described [here](https://developers.pipefy.com/reference/fields#table-fields).

```graphql createTableRecord
mutation {
  createTableRecord(input: {table_id: ID, title: "New record", fields_attributes: {field_id: "text", field_value: "New value for this record field"}}) {
    table_record {
      id
    }
  }
}
```

```graphql updateTableRecord
mutation {
  updateTableRecord(input: {id: ID, title: "New title"}) {
    table_record {
      id
      title
    }
  }
}
```

```graphql deleteTableRecord
mutation {
  deleteTableRecord(input: {id: ID}) {
    success
  }
}
```

## Testing our API

When querying for TableRecords, there's much more information available than the ones in the examples above.
Also, keep in mind that our API has a lot of queries and mutations available not only about TableRecords.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.