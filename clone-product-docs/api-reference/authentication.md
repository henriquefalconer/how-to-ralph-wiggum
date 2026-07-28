# Authentication

Your application needs to authenticate when making requests to our GraphQL API using a [Service Account](./service-accounts) or a [Personal Access Token](./personal-access-token). Authentication ensures that you are authorized to access the data and perform actions within our system. **Service Accounts** are the **recommended and long-term secure method **for integrations, while** Personal Access Tokens (PATs) are deprecated and should no longer be used.**

🔒 **Detailed steps?** Check our dedicated [Authentication Page](https://developers.pipefy.com/reference/authentication) for setup and troubleshooting.

To help you explore our GraphQL API, we provide an interactive [GraphQL Playground](https://app.pipefy.com/graphiql). You'll need to be authenticated at [Pipefy](https://app.pipefy.com/) with your account to have permission to make calls with it. This playground is a great tool for testing queries and mutations directly against our API.

## Authenticating on Pipefy

For authentication regarding Pipefy GraphQL endpoints, you will need an OAuth2 Bearer token generated within the Pipefy platform.  A user is considered authenticated once they have a valid Bearer Token.

Today, we have two kinds of authentication:  Service Accounts and Personal Access Tokens

## Using your token to authenticate

To use your token to authenticate, you need to pass the key `Authentication` in the request header, with `Bearer YOUR_TOKEN` as the value.

**Within your custom code** it is necessary to write manually`Bearer` before adding your token, otherwise, Pipefy will not be able to authenticate the user.  Be sure to use the `Authentication` key and see examples of how to send a Bearer token in different languages. Try it and check the response, if you see your user ID and email in the response, it means that you correctly authenticated to Pipefy.

**On an API platform**, like Postman or Insomnia, it is unnecessary to manually write "Bearer" before your token, as the application will do it for you. Go to the "Authorization" tab, choose "Bearer Token" as the type, and input your token as the value. See below an example of Postman.

![Postman](https://files.readme.io/48d7402-postman.PNG "postman.PNG")

> 🚧 Attention
>
> To access a resource via API, you need to have the necessary role and permission for this resource. Click [here](https://help.pipefy.com/en/articles/614617-company-members-and-permissions) to learn more about Company Roles and Permissions and [here](https://help.pipefy.com/en/articles/614597-meet-your-pipe-s-members-and-permission-options) to learn more about Pipe Members and permissions.