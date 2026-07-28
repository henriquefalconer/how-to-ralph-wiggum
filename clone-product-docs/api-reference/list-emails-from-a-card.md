# List emails from a card

## Before You Begin

🔗 **Use the [GraphQL Playground](https://app.pipefy.com/graphiql)** to execute the queries in this guide.

➡️ **New to GraphQL?** Learn how to navigate the Playground with our **[Playground Basics Guide](https://developers.pipefy.com/reference/exploring-the-playground)**.

## Prerequisites

1. **Authentication**: Use a [Service Account token](https://developers.pipefy.com/reference/service-accounts)  (Personal Access Tokens are deprecated).

2. **Permissions**: Ensure your token has the necessary permissions.

3. **Card ID**: Identify the Card where the attachment will be created.

## Step 1: Find Your Card ID

1. **Via Pipefy UI:**
   1. Open the Card in your browser.
   2. The URL will include the Card ID: `https://app.pipefy.com/open-cards/123456789`.
   3. **Card ID = `123456789`** (the number after `/open-cards/`).
2. **Via GraphQL Query**
   1. Check on our [Get resource IDs page](https://developers.pipefy.com/reference/get-resource-ids).

## Step 2: List the emails

Assuming you have the card id already, you can simply execute the query:

```graphql
{
  card(id: 10805973) {
    id
    inbox_emails {
      id
      subject
      body
    }
  }
}
```

With the following response::

```json
{
  "data": {
    "card": {
      "id": "10805973",
      "inbox_emails": [
        {
          "id": "547923445",
          "subject": "Missing Document for Your Vacation Request",
          "body": "Dear Steve,\nThank you for submitting your vacation request. Upon reviewing your submission, I noticed that the approved project handover form is missing. This document is required to proceed with processing your request.\nCould you please forward the completed form at your earliest convenience? Once received, we’ll be able to finalize your vacation approval.\nIf you have any questions or need assistance, feel free to reach out.\nThank you for your prompt attention to this matter.\nBest regards,Laura JohnsonHR CoordinatorBrightPath SolutionsEmail: laura.johnson@pipefy.com | Phone: (555) 246-8100"
        }
      ]
    }
  }
}
```

In this case we only requested the email id, subject and body, but of course we could get any of the information available in the InboxEmail type.