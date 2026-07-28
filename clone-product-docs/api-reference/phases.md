# Phases

## Phases Definition

A phase is a step of a specific process, or pipe. The cards move laterally through your pipe’s phases using one of the action buttons or by dragging and dropping the card to the phase you’d like it to be.

A phase, just like the form is made of fields you can reorder and edit to better suit your process’ needs.

## Hierarchy and Relations

**Accessible through:** [`Pipes`](https://developers.pipefy.com/reference/pipes)
**Objects phases can access directly:** [`Fields`](https://developers.pipefy.com/reference/fields#phase-fields), [`Cards`](https://developers.pipefy.com/reference/cards)

## Phases in our API

Through our API you can fetch information about a pipe's phases using a query. To create, update and delete a phase, you should use a mutation.

### Phase Query

This is an example of a query which retrieves information about a phase. Replace '12345' with the ID of the phase you'd like to query. The phase ID can be retrieved using a [Pipe query](https://developers.pipefy.com/reference/pipes) or within the URL of the phase settings page on the graphical interface.

If you need to know more attributes regarding the phase, you can fetch them with a phase query. Check our [GraphQL Console](https://developers.pipefy.com/graphql) to see what other attributes are available.

```graphql Basic Phase Query
{
  phase(id: 12345){
    id
    name
  }
}
```

```graphql Objects Within Phase
{
  phase(id: 12345){
    id
    name
    cards_count
    fields {
      id
      label
    }
    cards{
      edges{
        node{
          id
        }
      }
    }
  }
}
```

### Phase Mutations

Below are examples of mutations that you can use to create, update and delete a phase.

#### On the `createPhase` mutation

* Change the "pipe\_id" and "name" mutation to the Id of your pipe and the name of the phase you want to create.
* If you need, you can create a field on this phase using a `createPhaseField` mutation, see more details [here](https://developers.pipefy.com/reference/fields).

#### On the `updatePhase` mutation

* change the `id` to the id of your phase, and fill in the information that you need to update. In the example below, both color and name are being updated.

#### On the `deletePhase` mutation

* Fill in the id of the phase you wish to delete

```graphql createPhase
  mutation {
    createPhase(input: { pipe_id: "0000000", name: "New Phase"}) {
      phase {
        id
      }
    }
  }
```

```graphql updatePhase
  mutation {
    updatePhase(input: { id: 12345, color: lime, name: "Phase" }){
      phase {
        id
      }
    }
  }
```

```graphql deletePhase
  mutation {
    deletePhase(input: {id: 12345}) {
      clientMutationId
      success
    }
  }
```

## Testing our API

When querying for phases, there's much more information available than the ones in the examples of the query shown in the **Phase Query** section.
Also, keep in mind that our API has a lot of queries and mutations available, not just regarding phases.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.