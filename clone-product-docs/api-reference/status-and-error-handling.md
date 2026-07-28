# Status codes and Error Handling

## Status 200 - OK

GraphQL does not return status codes in the same way that REST APIs do. For example, GraphQL can return a **200 OK** in cases where a REST API would return a 5xx or 4xx status code. Due to this fact, GraphQL can return a 200 OK even when an action at the application level fails.

## Error Handling

To check for errors, you need to check for the 'errors' object within the response, which contains additional information about what caused the issue. Some mutations also have a "Success" boolean as a return field, that will return true or false, depending on the success or failure of the action. To check the return fields of all mutations and queries, check our [API Docs](https://api-docs.pipefy.com/reference/overview/Card/).

In the event of an error, in addition to the error messages returned within the 'errors' object, we provide an 'extensions' object. This object will display details about the error that occurred, identified by the 'code' key (refer to the Error Table below), along with a 'correlation\_id' hash to facilitate issue analysis with our support team.

```json 200 OK Error Response
{
 "data": {
   "deleteCard": null
 },
 "errors": [
   {
     "message": "Card not found with id: 00000000",
     "locations": [
       {
         "line": 32,
         "column": 3
       }
     ],
     "path": [
       "deleteCard"
     ],
     "extensions": {
       "code": "RESOURCE_NOT_FOUND",
       "correlation_id": "fcc162735121ac9f71ceba9fb58a639e"
     }
   }
 ]
}
```

```json 200 Ok Success False
{
  "data": {
    "updateFieldsValues": {
      "success": false
    }
  }
}
```

## Error codes

See below those errors and an explanation of them

| Error                                               | Explaining                                                                                                     |
| :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **AI\_CHAT\_REQUEST\_FAILED**                       | Occurs when a request to the AI Chat API fails.                                                                |
| **ANOTHER\_IMPORTATION\_ALREADY\_RUNNING**          | Indicates that another importation or similar process is already running and cannot be started simultaneously. |
| **BLANK\_NAME**                                     | Occurs when trying to create a resource with a blank name                                                      |
| **ENABLED\_APP**                                    | Occurs when there is an issue with the activation or use of a specific application                             |
| **FAILED\_TO\_RETRIEVE\_DATA**                      | Occurs when data retrieval from an external source fails                                                       |
| **FEATURE\_BLOCKED**                                | Occurs when the feature has been blocked for the organization                                                  |
| **FEATURE\_NOT\_ALLOWED\_BY\_ORGANIZATION\_PLAN**   | Denotes that the requested feature is not available in the current organization plan.                          |
| **FIELD\_EDITABLE\_ONLY\_ON\_ITS\_ORIGINAL\_PHASE** | Signals that a field can only be edited in its original phase and not in other phases.                         |
| **INVALID\_CONNECTED\_FIELD**                       | This exception is raised when a operation with a connected field is invalid.                                   |
| **INVALID\_INPUT**                                  | Indicates that the provided input data is not valid or improperly formatted.                                   |
| **INVALID\_SMTP\_AUTH**                             | Indicates that the provided authentication type for SMTP server is not supported.                              |
| **LIMIT\_RESOURCES\_PER\_ORGANIZATION**             | Occurs when trying to create more resources than the allowed organization limit                                |
| **NAME\_TOO\_LONG**                                 | Occurs when trying to create a resource with a name that is too long                                           |
| **NAME\_NOT\_UNIQUE**                               | Occurs when trying to create a resource with a name that already exists                                        |
| **ORGANIZATION\_IN\_BLOCKLIST**                     | Indicates that the organization is in the blocklist, preventing certain actions.                               |
| **PERMISSION\_DENIED**                              | Represents the denial of necessary permissions to perform a specific operation.                                |
| **PHASE\_TRANSITION\_ERROR**                        | Indicates when attempting to transition a card to a phase results in an error.                                 |
| **PROVIDER\_NOT\_IDENTIFIED**                       | This exception is thrown whenever it's not possible to find the provider through the user's email domain.      |
| **RECORD\_INVALID**                                 | Points to an error related to the validation or integrity of record data                                       |
| **RECORD\_NOT\_DESTROYED**                          | Refers to a failure in destroying or deleting a record.                                                        |
| **RECORD\_NOT\_SAVED**                              | Refers to a failure in saving a record.                                                                        |
| **RESOURCE\_NOT\_FOUND**                            | Occurs when a specific resource could not be found or does not exist.                                          |
| **UNIQUE\_RESOURCE\_ALREADY\_EXISTS**               | Indicates that a unique resource already exists and cannot be duplicated.                                      |
| **USAGE\_LIMIT\_EXCEEDED**                          | Indicates that a usage limit has been exceeded, such as the maximum number of requests per period.             |
| **USER\_TO\_ASSIGN\_ROLE**                          | Points to an error when trying to assign a role or function to a specific user.                                |

## 4XX and 5XX Status Codes

As mentioned above, in most cases GraphQL will return a 200 OK response when a REST API would return a 4xx or 5xx status code. But in some specific cases, a 4xx or 5xx status code can be returned. See below those cases and an explanation of them.

| Status Code | Explaining                                                                                                                                                                                                                                      |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401**     | Unauthorized. A valid token was not passed within the request header.                                                                                                                                                                           |
| **404**     | Not found. The resource is not available.                                                                                                                                                                                                       |
| **422**     | Unprocessable Entity. Pipefy is not able to process the request.                                                                                                                                                                                |
| **429**     | Too many requests. This error occurs when you reach the rate limit for API Calls. Check the 'Request Limits'  section of this [article](https://help.pipefy.com/en/articles/5580799-how-to-use-pipefy-s-api#h_6b5e9bd9c0) to understand limits. |
| **5xx**     | Internal error within Pipefy                                                                                                                                                                                                                    |