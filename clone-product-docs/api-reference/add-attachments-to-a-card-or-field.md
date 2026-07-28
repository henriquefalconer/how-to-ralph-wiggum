# Add attachments to a card or field

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Card ID**: Identify the Card where the attachment will be created.

4. **Organization ID**: Identify the organization where the attachment will be stored.

## Step 1: Find Your Card and Organization ID

### Via Pipefy UI

1. Open the Card in your browser.
2. The URL will include the Card ID: `https://app.pipefy.com/open-cards/123456789`.
3. **Card ID = `123456789`** (the number after `/open-cards/`).
4. Open the Organization in your browser.
5. The URL will include the Organization ID: `https://app.pipefy.com/organizations/987654321`.
6. **Organization ID = `987654321`** (the number after `/organizations/`).

### Via GraphQL Query

1. [How to get the card ID.](https://developers.pipefy.com/reference/get-resource-ids#card-id)
2. [How to get the organization ID.](https://developers.pipefy.com/reference/get-resource-ids#organization-id)

## Step 2: Add the attachment

### Generate a Pre-Signed URL

To upload a file, you first need a pre-signed URL from Pipefy. Use the `createPresignedUrl` GraphQL mutation with your organization ID and filename.

We'll use the organization ID we found before (2) and add the name of the file we'll add to the card (in this case, Document.pdf):

```graphql
mutation {
  createPresignedUrl(input: { organizationId: 2, fileName: "Document.pdf" }){
    url
  }
}
```

The response will return a URL that we'll use to upload the file, like so:

```json
{
  "data": {
    "createPresignedUrl": {
      "clientMutationId": null,
      "url": "https://pipefy-development.s3.sa-east-1.amazonaws.com/orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf?x-amz-acl=public-read&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=XYTU3MDMTNTRHMC00MMIXLTHKN2MT%2Fsa-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250228T204348Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=mmyxytu3mdmtntrhmc00mmixlt"
    }
  }
}
```

## Upload the file

You got the presigned url, with that address we need to first make a request to prepare the server to receive the file, like so:

```json
curl --request PUT --url 'https://pipefy-development.s3.sa-east-1.amazonaws.com/orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf?x-amz-acl=public-read&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=XYTU3MDMTNTRHMC00MMIXLTHKN2MT%2Fsa-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250228T204348Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=mmyxytu3mdmtntrhmc00mmixlt' --header 'Content-Type: application/pdf' --data 'BINARY_DATA'
```

Make sure to replace the URL with your own, to make clear to see the command, here is the same command with the long url replaced with "\<pressigned\_url>"

```json
curl --request PUT --url '<pressigned_url>' --header 'Content-Type: application/pdf' --data 'BINARY_DATA'
```

Alright, now we can upload the file:

\*Notice that `sample.pdf` is the file name in my computer and when I execute this command, I'm in the same directory where the file is located:

```json
curl -v --upload-file sample.pdf 'https://pipefy-development.s3.sa-east-1.amazonaws.com/orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf?x-amz-acl=public-read&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=XYTU3MDMTNTRHMC00MMIXLTHKN2MT%2Fsa-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250228T204348Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=mmyxytu3mdmtntrhmc00mmixlt'
```

And here's the same command with the URL replaced with "\<pressigned\_url>" to make it easier to read:

```json
curl -v --upload-file sample.pdf '<pressigned_url>'
```

## Update the card attachment field

We already uploaded the file, now we need to update the attachment field from the card with the correct information.

First, get the pressigned url we've been working with:

```json
'https://pipefy-development.s3.sa-east-1.amazonaws.com/orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf?x-amz-acl=public-read&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=XYTU3MDMTNTRHMC00MMIXLTHKN2MT%2Fsa-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250228T204348Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=mmyxytu3mdmtntrhmc00mmixlt'
```

Noticed that highlighted part, we'll need to add that to the field so the attachment can work correctly, in this case:

```json
'orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf'
```

Now we have all the information we need to update the card, so we can use the `updateCardField` mutation with the card and field id we got in the first step:

```graphql
mutation {
  updateCardField(input: {
    card_id: 10808965
    field_id: "document_upload"
    new_value: ["orgs/e0c83866-9313-41c8-bf9b-cd79d5e52f43/uploads/2f1a5703-54a0-42b1-8d7c-3f5a89a6cdc4/Document.pdf"]
  }) {
    success
  }
}
```

A result similar to this will be returned if everything is ok:

```json
{
  "data": {
    "updateCardField": {
      "success": true
    }
  }
}
```

All done! Now the card has the attachment correctly added. It looks like lots of steps at first, but it gets easier over time, also, you can get all together in one script to automate these steps and make it even easier to update your cards attachments.