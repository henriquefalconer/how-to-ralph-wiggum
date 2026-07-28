# Receiving Unauthorized

### Example Error

```json
{
  "errors": [
    {
      "title": "Unauthorized",
      "detail": "You are not authorized to access this page"
    }
  ]
}
```

## Why This Happens

**This error means the server couldn’t verify your identity or permissions. Common causes include:**

1. **Missing or Invalid Credentials:**
   1. You forgot to include an authentication token.
   2. The token is expired, revoked, or formatted incorrectly.
2. **Deprecated Authentication Method:**
   1. You’re using a Personal Access Token (PAT), which is deprecated and no longer supported.
3. **Insufficient Permissions:**
   1. Your account doesn’t have access to the specific resource (e.g., a pipe, card, or organization).
4. **Not Logged In:**
   1. You’re using the GraphQL Playground without being authenticated in Pipefy.

## How to fix it

1. **Check Your Authentication Credentials:**
   1. **For API Requests:**

      1. Ensure your request includes a valid `Authorization` header with a Service Account token.

      ```json
      {
         "Authorization": "Bearer YOUR_SERVICE_ACCOUNT_TOKEN"
      }
      ```

2. **For GraphQL Playground:**
   1. Log in to Pipefy in your browser first.
   2. Refresh the Playground page to inherit your session.

3. **Stop Using Personal Access Tokens (PATs):**
   1. **PATs are deprecated. Switch to Service Accounts immediately.**
   2. **[Follow our Service Account setup guide.](https://developers.pipefy.com/reference/service-accounts)**

4. **Verify Permissions:**
   1. Ensure your Service Account or user role has access to the resource you’re querying (e.g., the pipe or organization).
   2. Contact your Pipefy admin to confirm permissions.

5. **Check the API Endpoint:**
   1. Ensure you’re using the correct URL for Pipefy’s GraphQL API: `https://api.pipefy.com/graphql`

6. **Test in GraphQL Playground:**
   1. Double-check your token formatting and headers if the Playground works but your code doesn’t.