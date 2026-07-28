# Create and send an email through a card

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Card ID**: Identify the Card where the email will be created.

4. **Pipe ID**: Identify the Pipe where the card you'll create the email is located.

## Step 1: Find The IDs

1. **Via Pipefy UI**:
   1. Open the Card in your browser.
   2. The URL will include the Card ID: `https://app.pipefy.com/open-cards/123456789`.
   3. **Card ID = `123456789`** (the number after `/open-cards/`).
   4. Open the Pipe in your browser.
   5. The URL will include the Pipe ID: <https://app.pipefy.com/pipes/987654321>.
   6. Pipe ID = 987654321 (the number after /pipes/).
2. **Via GraphQL Query**:
   1. [How to get the card ID](https://developers.pipefy.com/reference/get-resource-ids#card-id).
   2. [How to get the pipe ID](https://developers.pipefy.com/reference/get-resource-ids#pipe-id).

## Step 2: Create the email

With the **Card ID** and **Pipe ID** ready, you can easily create an email using the `createInboxEmail` mutation. It's a simple process, but there's one detail to keep in mind: The `repo_id` parameter refers to the **Pipe ID**. This is because, internally, Pipefy sometimes uses "Repo" to reference a Pipe—they mean the same thing.

```graphql
mutation {
  createInboxEmail(
    input: {
      repo_id: 123456789,
      card_id: 987654321,
      from: "john.doe@example.com",
      to: "jane.smith@example.com",
      subject: "Project Update",
      text: "Here is the latest update on the project."
    }
  ) {
    inbox_email {
      id
    }
  }
}
```

We are using several arguments in this mutation, so let's break them down to better understand what's going on:

* `repo_id`: The ID of the Pipe (internally referred to as a "Repo") where the email will be associated.
* `card_id`: The ID of the card to which the email will be linked.
* `from`: The email address of the sender (who the email is coming from).
* `to`: The email address of the recipient (who the email is being sent to).
* `subject`: The subject line of the email.
* `text`: The body of the email, containing the main message or content.

After the mutation is executed, the response will include the id of the newly created inbox email, which can be used for further reference or operations.

**Example Response:**

```json
{
  "data": {
    "createInboxEmail": {
      "inbox_email": {
        "id": "551991950"
      }
    }
  }
}
```

You'll need the returned `id` from the mutation to send the email. Once the email is created, you can verify it by checking the referenced card in the Pipefy interface. The email will appear there with the status **"Processing"**.

If you prefer, you can send the email manually via the UI. However, in the next step, we'll guide you through sending the email programmatically using GraphQL.

## Step 3: Send the email

Next, we'll use another mutation to send the email. The only argument required is the `id` of the email created in the previous step. This `id` ensures that the correct email is sent.

```graphql
mutation {
  sendInboxEmail(input: {
    id: 551991950
  }) {
    success
  }
}
```

Example Response:

```json
{
  "data": {
    "sendInboxEmail": {
      "success": true
    }
  }
}
```

If the `success` field returns `true`, it means your email was successfully sent!