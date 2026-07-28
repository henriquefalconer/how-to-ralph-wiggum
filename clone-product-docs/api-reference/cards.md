# Cards

## Definition

A card is a visual, detailed representation of an activity included on your pipe.

In order to illustrate how a card represents an activity in your processes, here are a few examples:

* In a sales pipeline, each card represents a new potential customer moving through all the phases of your sales process. From prospecting to closing the sale, all the information you gather throughout the process is stored within the card.

* In a purchase process, each card represents a request for an item to be purchased or a service to be hired.

Even though cards represent different things in different pipes, they're essentially pieces of information gathered to guide an activity.

Cards move laterally from left to right through the phases of your pipe. Your pipe will probably have a few phases for your cards to go through, therefore it’s normal to see different cards in different phases of your process simultaneously.

## Hierarchy and Relations

**Accessible through:** *[`Phases`](https://developers.pipefy.com/reference/cards#card-queries) and [`Pipes`](https://developers.pipefy.com/reference/cards#findcards). See links for more information*
**Objects cards can access directly:**

**\***&#x48;as many card field values through fields. See how [here](https://developers.pipefy.com/reference/fields#card-field-values)

## Cards in our API

Through our API you can retrieve cards information and interact with cards and execute the actions you're able to do within Pipefy's graphical interface.

### Card queries

Running queries in our API allows you to fetch information about the cards that exist in Pipefy.

As you can see in the example below, you can fetch for information about the card's *phase* and *pipe* as well as the *values of the fields* of the card

```graphql Basic Card Query
query {
  card(id: 123) {
    title
    done
    id
    updated_at
  }
}
```

```graphql Objects Within Cards
{
  card(id: 12345) {
    pipe {
      id
      name
    }
    fields {
      name
      value
      filled_at
    }
    current_phase {
      id
      name
    }
    assignees {
      name
      email
    }
  }
}
```

```graphql Cards Query
{
  cards(pipe_id: 123, search: {title: "Card title"}) {
    edges {
      node {
        fields {
          date_value
          datetime_value
          filled_at
          float_value
          indexName
          name
          native_value
          report_value
          updated_at
          value
        }
        title
        done
        id
        updated_at
        assignees {
          name
          email
        }
        attachments {
          url
          path
        }
        current_phase {
          name
        }
        pipe {
          name
        }
      }
    }
  }
}
```

```graphql findCards Query
query {
  findCards(pipeId: 123, search: {fieldId: "field_1", fieldValue: "Value 1"}) {
    edges {
      node {
        fields {
          date_value
          datetime_value
          filled_at
          float_value
          indexName
          name
          native_value
          report_value
          updated_at
          value
        }
        title
        done
        id
        updated_at
        assignees {
          name
          email
        }
        attachments {
          url
          path
        }
        current_phase {
          name
        }
        pipe {
          name
        }
      }
    }
  }
}
```

#### findCards

As you can see in the `findCards` query in the third tab above, there's the option to retrieve cards by providing the `fieldId` and the `fieldValue`. The `fieldId` is tricky to find, and as this option is necessary for some mutations, we wrote a whole section to talk about fields and explained how to get this information. You can find this section [here](https://developers.pipefy.com/reference/fields#finding-the-field-id)

### Card mutations

Mutations are commands you can execute that change data through our API. They represent the Create, Delete, Update of CRUD operations.

Below are some examples of commonly used mutations for cards in our API:

```graphql createCard
mutation {
  createCard(input: {
    pipe_id: 123,
    title: "New card",
    fields_attributes:[
      {field_id: "field_1", field_value: "Value 1"},
      {field_id: "field_2", field_value: "Value 2"}
    ]}
  ) {
    card {
      title
    }
  }
}
```

```graphql deleteCard
mutation {
  deleteCard(input: {id: 123}) {
    success
  }
}
```

```graphql updateCard
mutation {
  updateCard(input: {id: 123, title: "New title"}) {
    card {
      title
    }
  }
}
```

```graphql updateCardField
mutation {
  updateCardField(input: {card_id: 123, field_id: "field_1", new_value: "New field value"}) {
    card {
      title
    }
  }
}
```

If you want to know more about GraphQL, we have a whole section about it, [click here](https://developers.pipefy.com/reference/what-is-graphql) to visit our GraphQL section

## Testing our API

When querying for cards, there's much more information available than the ones in the examples of the queries shown in the [Cards queries](https://developers.pipefy.com/reference/cards#card-queries) section.

Also, keep in mind that our API has a lot of queries and mutations available, not just for cards.
For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.