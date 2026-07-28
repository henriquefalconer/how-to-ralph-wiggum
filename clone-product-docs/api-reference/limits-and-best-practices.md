# Limits and Best Practices

Use this guide to ensure your queries are efficient, within limits, and optimized for the best performance.

## Pipefy GraphQL API Limits

| Complexity limit | Depth Limit | Time limit |
| ---------------- | ----------- | ---------- |
| 50,000           | 15          | 33 seconds |

### Complexity Limit

The complexity of a query is a way to measure how much work the server needs to do to process that query. We set a limit on this complexity to ensure that the server runs efficiently and that all users have a smooth experience. By keeping queries within the complexity limit, we can prevent any single query from using too many resources or slowing down the system. The current complexity limit is **50,000**.

#### How to calculate Complexity?

You can think of query complexity as a score that adds up depending on the fields you ask for. Some fields are simple and add just a little to the score, while others that do more work or return large amounts of data add more.

For example, in this query:

```graphql
query {
  organization(id: 123) { # +1
    name                  # +1
    tables(first: 10) {   # +1
      nodes {             # +1
        name              # +10 (+1, multiplied by `first:` above)
      }
      pageInfo {          # +1
        endCursor         # +1
      }
      totalCount          # +1
    }
  }
}
```

Here's how the complexity adds up:

* Asking for the `organization` adds +1
* Getting the `name` of the organization adds another +1
* The tables connection adds +1. Since you requested the first 10 items, each field inside `nodes` (like `name`) adds +10 (1 for each item, multiplied by `first: 10`). If the `first` parameter wasn’t specified, the default page size, usually 50, would be used instead, leading to a larger complexity score.
* Extra information like `pageInfo` and `totalCount` each add +1

So, the total complexity of this query is **17**.

### Depth Limit

The depth of a query measures how many levels of nested fields the query includes. We set a limit on the depth to ensure that queries remain efficient and don’t become too complex to handle. This helps keep the system fast and responsive for everyone. The current depth limit is **15**.

#### How to calculate Depth?

The depth of a query increases each time you ask for fields inside other fields. Each nested level counts as an additional layer of depth.

For example, in this query:

```graphql
query {
  organization(id: 28) { # 1
    name                 # 2
    tables {             # 2
      nodes {            # 3
        name             # 4
      }
    }
  }
}
```

Here’s how the depth is calculated:

* The `organization` field starts at depth 1.
* The `tables`field inside `organization`adds another level, making it depth 2.
* The `nodes` field inside `tables` brings depth to 3.
* Finally, asking for the `name` inside `nodes` brings the total depth to 4.

So, the total depth of this query is 4.

### Time Limit

The time limit is the maximum amount of time that the server will spend processing a single query. This limit helps ensure that no query takes too long to complete, which could slow down the system for everyone. By keeping your queries efficient, you can avoid hitting this limit and ensure fast, reliable performance. The current time limit is **33 seconds**.

## Avoiding Large Numbers in `first` and `last` arguments

The `first` and `last` parameters are used to control the number of items returned in a list. These parameters are typically used for pagination, allowing you to retrieve a specific number of items from the beginning or end of a list. However, it’s important to be aware of the values you provide.

If you set `first` or `last` to a number larger than the maximum page size (which is usually 50), the query will only return up to the maximum page size. **However,** for the purpose of calculating query complexity, the server will still consider the actual number you specified in the parameter. This means that even if you only receive 50 items, the complexity will be calculated as if you requested the full amount, potentially making your query much more complex than necessary.

## Request Only the Fields You Need

When constructing your queries, it's important to request only the fields that you actually need. Including fields that you don't plan to use can be wasteful, both in terms of the resources required to process the query and the amount of data returned. This can lead to slower response times and higher query complexity, which might bring you closer to hitting the API's limits.