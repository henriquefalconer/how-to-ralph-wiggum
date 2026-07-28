# The GraphQL Endpoint

Unlike REST APIs which often have many different endpoints, GraphQL APIs use a single, consistent endpoint for all operations.

For our GraphQL API, the endpoint is:

`https://api.pipefy.com/graphql`

#### Example Request

```curl
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{ "query": "{ me { id name } }" }' \
  https://api.pipefy.com/graphql
```