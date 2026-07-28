# How to handle errors

# How to Handle API Errors

This guide provides an overview of common errors you might encounter when using the Pipefy API and how to handle them effectively.

## Common Error Types

| Error Code                            | Error Name                                                                                                       | Description                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `UNAUTHORIZED`                        | [Unauthorized Error](./unauthorized-error)                                                                       | Occurs when the API request lacks valid authentication credentials or the provided token is invalid.   |
| `INVALID_ROLE`                        | [Invalid Role Errors](./invalid-role-errors)                                                                     | Triggered when attempting to perform actions without the required permissions or with an invalid role. |
| `RESOURCE_NOT_FOUND`                  | [Field Type Not Found Error](./field-type-not-found-error-resource-not-found)                                    | Occurs when trying to access a field type that doesn't exist in the specified context.                 |
| `missingRequiredInputObjectAttribute` | [Missing Required Argument Error](./missing-required-argument-card-id-error-missingrequiredinputobjectattribute) | Triggered when required parameters are missing from the API request.                                   |
| `INVALID_INPUT`                       | [Invalid Input Error](./invalid-input-error-invalid-input)                                                       | Occurs when the provided input data doesn't meet the expected format or validation rules.              |
| `USAGE_LIMIT_EXCEEDED`                | [Email Rate Limit Exceeded Error](./email-rate-limit-exceeded-error-usage-limit-exceeded)                        | Triggered when the email sending rate limit is exceeded.                                               |
| `Card could not be moved to phase`    | [Card Could Not Be Moved to Phase Error](./card-could-not-be-moved-to-phase-error)                               | Occurs when there's an issue moving a card to a different phase.                                       |

> 📘 Other Errors
>
> If your error isn't listed here, you can find the complete list in the [Status Codes and Error Handling](./status-and-error-handling) section.

## Error Response Format

All API errors follow a consistent response format:

```json
{
  "error": {
    "message": "Error description",
    "details": {
      "code": "ERROR_CODE",
      "correlation_id": "unique-identifier-string",
      // Additional error details if available
    }
  }
}
```

The `correlation_id` field in the error details is a unique identifier that can be used to track specific error instances. When contacting Pipefy support, please include this ID to help us identify and resolve your issue more efficiently.