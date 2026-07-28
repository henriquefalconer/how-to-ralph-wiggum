# Receiving invalid_input

### Example Error

```json
{
  "data": {
    "updateCardField": null
  },
  "errors": [
    {
      "message": "Invalid input: attachment ([\"asdf\"])",
      "locations": [ ... ],
      "path": [ ... ],
      "extensions": {
        "code": "INVALID_INPUT",
        "correlation_id": "4161f176-9d65-453a-9c5e-9fe9fc2ee4b8"
      }
    }
  ]
}
```

## Why This Happens

This error occurs when the input provided for a field (in this case, `attachment`) does not match the expected format or validation rules. Common causes include:

1. **Incorrect Attachment Format**
   1. You provided a value like "asdf" instead of a valid Pipefy attachment identifier (e.g., "orgs/07f23917-7346-4319-8421-0a8131951ff0/uploads/ffa88f6c-7967-4174-9b00-143c1f5603aa/Document.pdf").
   2. The attachment must reference a file already uploaded to Pipefy.
2. **Invalid Field Type**
   1. The field you’re updating (e.g., an "Attachment" field) expects specific data, such as an attachment URL. Passing raw text or an unsupported format will fail.
   2. In another case if the field were an “Email” for example, the input value should have a valid email format and so on.
3. **Uploaded File Not Found**
   1. The attachment path you provided does not exist in Pipefy’s system (e.g., due to a typo, expired upload, or deletion).
4. **Syntax Errors in Input**
   1. Incorrect GraphQL syntax, such as using strings instead of arrays or misnamed arguments.

## How to Fix it

1. **Verify the Format**
   1. Ensure the value matches the format returned by Pipefy after a successful file upload.
   2. Example of a valid attachment identifier.
      1. `"orgs/07f23917-7346-4319-8421-0a8131951ff0/uploads/ffa88f6c-7967-4174-9b00-143c1f5603aa/Document.pdf"`
   3. Example of a valid email identifier
      1. `"john.smith@pipefy.com"`
   4. Other fields can have different validation patterns. You can validate in the UI by filling that field or looking at the field’s configurations to get more information.
2. **Check the Field Type**
   1. Confirm that the card field you’re updating is from the right type, so you maybe have a valid email but is trying to fulfill a field that should receive numbers only.
3. **Validate Your Mutation Syntax**
   1. Ensure your GraphQL mutation uses the correct arguments and data types.

   2. Example of a valid `updateCardField` mutation:

      1. ```graphql
         mutation {
           updateCardField(input: {
             card_id: 123
             field_id: "document_upload"
             new_value: ["orgs/07f23917-7346-4319-8421-0a8131951ff0/uploads/ffa88f6c-7967-4174-9b00-143c1f5603aa/Document.pdf"]
           }) {
             success
           }
         }
         ```

   3. Of course, the `card_id`, `field_id` and `new_value` will be different for you, so check that out! Also, this is just an example for the `updateCardField` mutation, there are other ways to do the same so you could have got the error we are treating here through another mutation.