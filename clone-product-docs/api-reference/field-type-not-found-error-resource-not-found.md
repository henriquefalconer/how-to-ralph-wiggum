# Receiving resource_not_found

### Example Error

```json
{
  "data": {
    "createPhaseField": null
  },
  "errors": [
    {
      "message": "Field type not found with id: attachments",
      "locations": [ ... ],
      "path": [ ... ],
      "extensions": {
        "code": "RESOURCE_NOT_FOUND",
        "correlation_id": "91c444b53a0a596e-IAD"
      }
    }
  ]
}
```

## Why this Happens

This error occurs when the input provided for a field (in this case, `attachment`) does not match the expected format or validation rules. Common causes include:

1. **Typographical Errors**
   1. Misspelling the field type (e.g., `"attachments"` instead of the correct `"attachment"`).
   2. Extra characters or incorrect pluralization (e.g., `"emails"` vs. `"email"`).
2. **Case Sensitivity**
   1. Using uppercase letters (e.g., `"Attachment"` instead of `"attachment"`). Pipefy field types are **case-sensitive** and must be lowercase.
3. **Invalid Field Type**
   1. Attempting to use a custom or non-existent field type (e.g., `"rating"` instead of `"number"`).
4. **Missing information**
   1. If you attempt to send a required field as empty or omit it entirely from the arguments, the request will fail. Ensure all mandatory fields are included and properly filled out to avoid errors.

## How to Fix It

1. **Verify the Field Type Spelling**
   1. Double-check the `type` argument for typos.
   2. **Example Fix:**

      1. ```json
         - type: "attachments" # wrong
         + type: "attachment"  # correct
         ```

2. **Check Valid Field Types**
   1. Pipefy supports specific field types:

      1. ```json
           - assignee_select
           - attachment
           - checklist_horizontal
           - checklist_vertical
           - cnpj
           - connector
           - cpf
           - currency
           - date
           - datetime
           - due_date
           - email
           - id
           - label_select
           - long_text
           - number
           - phone
           - radio_horizontal
           - radio_vertical
           - select
           - short_text
           - statement
           - time
         ```

3. **Use Correct Casing**
   1. Ensure the `type` argument is lowercase.

      1. ```json
         - type: "Attachment" # wrong
         + type: "attachment" # correct
         ```

## Example Corrected Mutation

The error in the original query occurred because `"attachments"` is invalid. The correct type for an attachment field is `"attachment"`:

```graphql
mutation {
  createPhaseField(input: {
    phase_id: "334655689"
    type: "attachment"  # Corrected from "attachments"
    label: "Supporting Documents"
    description: "Attachments or documents supporting the suggestion."
    required: false
  }) {
    phase_field {
      id
    }
  }
}
```