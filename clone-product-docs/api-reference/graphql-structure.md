# GraphQL Structure

## Queries vs Mutations

In GraphQL, **queries** and **mutations** are the two main ways to interact with data:

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/12ae185d47bc346c799b4660010b5298b2a7318299c1727321147552e30e5fed-image4.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

**Note:** *This is just a brief introduction to Queries and Mutations to help you get started. There’s no need to fully understand everything right now—we’ll dive deeper into the details later in this guide.*

| Aspect               | Queries                                     | Mutations                                           |
| :------------------- | :------------------------------------------ | :-------------------------------------------------- |
| **Purpose**          | Retrieve (read) data from the server.       | Modify (create, update, delete) data on the server. |
| **Effect**           | Does not change data; it's read-only.       | Causes changes to the server's data.                |
| **Syntax**           | Starts with the keyword `query` (optional). | Starts with the keyword `mutation`.                 |
| **Use Case Example** | Fetching user details or a list of items.   | Creating a new user or updating a record.           |

### Queries

Used to **get** data from a server. Think of it like asking a question—*"What are the names and IDs of the members in this specific pipe?"* The server responds with the exact information requested.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/9601703e38d3642e46427e8e422460b454b42d5087b946e63f28dbbb015cbc13-image9.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

#### Examples

```graphql
{
  pipe(id: 123) {
    name
    users {
      id
      name
    }
  }
}
```

In this query, we’re asking the server for information about a specific pipe and its members. Let’s break it down:

* `pipe(id: 123)`: This asks the server to locate a specific pipe using the `id` argument. The `id` assigned in this case is `123`.
* **Fields:** We specify two fields we want the server to return about the pipe:
  * `name`: The name of the pipe.
  * `users`: We request details about the pipe’s users, and for each user, we want their `id` and `name`.

When this query is executed, the server will return a structured response containing exactly this information.

#### For example

```json
{
  "data": {
    "pipe": {
      "name": "Hiring Process",
      "users": [
        {
          "id": "987654321",
          "name": "Alex Johnson"
        },
        {
          "id": "987654322",
          "name": "Alice Rivera"
        }
      ]
    }
  }
}
```

### Mutations

Used to **change** data on the server, like creating, updating, or deleting something. It’s like placing an order at a restaurant—"I’d like to create a new card." The server processes the request and updates the data accordingly.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/4249e3e535a5bde9bd1f24934b274aa2fb9d179c991c638a134c45ed29127a1f-image5.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

#### Example

```graphql
mutation {
  createCard(input: { pipe_id: 2, title: "Hello World" }) {
    card {
      id
    }
  }
}
```

In this mutation, we ask the server to create a new card in a specific pipe. Let’s break it down:

* **Operation type: `mutation`**: This specifies that we are requesting a data modification, which in this case is creating a new card.
* **`createCard`**: This is the mutation we want to execute. It represents a function to create a new card on the server.
* **`input`**:
  * `pipe_id`: `2`: This tells the server that the new card should be created in the pipe with the unique ID of `2`.
  * `title`: `"Hello World"`: This sets the title of the new card to `"Hello World"`.
* **Fields:** Inside the `createCard` mutation, we specify that we’d like the following field returned:
  * `card { id }`: Once the mutation completes, we request the `id` of the newly created card to confirm it was successfully created and to reference it if needed in subsequent operations.

When this mutation is executed, the server processes the request and returns a structured response with the created data.

##### Example Server Response

```json
{
  "data": {
    "createCard": {
      "card": {
        "id": "1"
      }
    }
  }
}
```