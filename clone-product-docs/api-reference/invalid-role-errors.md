# Receiving invalid_role

### Example Error

```json
{
  "data": {
    "setRoles": {
      "members": [],
      "errors": [
        "Invalid input: role name (invalid_role)"
      ]
    }
  }
}

```

## Why This Happens

* The `role_name` provided is not valid for the context (`organization_id`, `pipe_id`, or `table_id`).
* Example: Using `super_admin` for a pipe role (valid only for organizations).

### How to Fix It

1. **Verify Valid Roles:**

2. **Check the valid roles for the context (organization, pipe, or database).**

3. **Fix Typos:**

   1. ```json
      ❌ Wrong
      role_name: "Admin"
      ✅ Correct
      role_name: "admin"
      ```

4. **Match Scope:**
   1. Use `organization_id` for organization roles, `pipe_id` for pipe roles, or table\_id for database roles.

5. **Confirm User and Target IDs:**
   1. Use GraphQL queries to verify `user_id`, `organization_id`, `pipe_id`, or `table_id` exist.

## Valid Roles Table

| Context      | Valid Roles                                                         |
| :----------- | :------------------------------------------------------------------ |
| Organization | `super_admin`, `admin`, `normal`, `company_guest`, `external_guest` |
| Pipe         | `admin`, `member`, `my_cards_only`, `read_and_comment`, `creator`   |
| Database     | `admin`, `member`, `read_and_comment`                               |

## Example Corrected Mutation

The error in the original query occurred because the `role_name` argument was invalid for the context. While `super_admin` is a valid role for organizations, it is not applicable to pipes. To fix this, replace the argument with a valid role for the specified context, such as `admin` or `member`.

```json
mutation {
  setRoles(input: {
    pipe_id: 2
    members: [
      {
        role_name: "admin" # The query was made with "super_admin", role doesn't exist in pipe context
        user_id: 19
      }
    ]
  }) {
    members {
      role_name
    }
    errors
  }
}

```