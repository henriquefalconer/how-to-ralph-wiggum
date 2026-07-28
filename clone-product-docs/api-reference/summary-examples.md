# Summary

# API Use Case Examples

This section contains practical examples of how to use the Pipefy API for common use cases. These examples are organized into modules to help you find the specific functionality you're looking for.

## Table of Contents

### 1. AI

* [Agents usage details query](./agents-usage-details-query)
* [Get an AI Agent by UUID](./ai-agent-query)
* [Retrieve AI Agents](./ai-agents-query)
* [Retrieve AI Agent Log Details](./ai-agent-log-details-query)
* [Retrieve AI Agent Logs by Repo](./ai-agent-logs-by-repo-query)
* [AI Agents Usage Details](./agents-usage-details-query)
* [Template Agents Query](./template-agents-query)
* [Create AI Agent](./create-ai-agent-mutation)
* [Update AI Agent](./update-ai-agent-mutation)
* [Update AI Agent Status](./update-ai-agent-status-mutation)
* [Delete AI Agent](./delete-ai-agent-mutation)
* [Duplicate AI Agent](./duplicate-ai-agent-mutation)
* [Update AI Settings Mutation](./update-ai-settings-mutation)
* [Active LLM Providers Query](./active-llm-providers-query)
* [Default LLM Provider Query](./default-llm-provider-query)
* [Set Active LLM Provider Mutation](./set-active-llm-provider-mutation)
* [Reset LLM Provider Mutation](./reset-llm-provider-owner-mutation.md)
* [Available Models Query](./available-models-query)
* [Create LLM Provider](./create-llm-provider)
* [LLM Providers by Organization](./llm-providers-by-organization)
* [All LLM Providers by Organization](./all-llm-providers-by-organization)
* [Update LLM Provider](./update-llm-provider)
* [Delete LLM Provider](./delete-llm-provider)
* [Provider Dependencies](./provider-dependencies)
* [Set LLM Provider Active Status](./set-llm-provider-active-status)
* [Create Knowledge Base Document](./create-knowledge-base-document-mutation)
* [Update Knowledge Base Document](./update-knowledge-base-document-mutation)
* [Delete Knowledge Base Document](./delete-knowledge-base-document-mutation)
* [Create Assistant Knowledge Base Document](./create-assistant-knowledge-base-document-mutation)
* [Update Assistant Knowledge Base Document](./update-assistant-knowledge-base-document-mutation)
* [Delete Assistant Knowledge Base Document](./delete-assistant-knowledge-base-document-mutation)
* [Create Knowledge Base Data Lookup](./create-knowledge-base-data-lookup-mutation)
* [Update Knowledge Base Data Lookup](./update-knowledge-base-data-lookup-mutation)
* [Delete Knowledge Base Data Lookup](./delete-knowledge-base-data-lookup-mutation)
* [Create Knowledge Base Plain Text](./create-knowledge-base-plain-text-mutation)
* [Update Knowledge Base Plain Text](./update-knowledge-base-plain-text-mutation)
* [Delete Knowledge Base Plain Text](./delete-knowledge-base-plain-text-mutation)
* [List Knowledge Base Items](./list-knowledge-bases-query)
* [Get Knowledge Base Document](./get-knowledge-base-document-query)
* [Get Knowledge Base Plain Text](./get-knowledge-base-plain-text-query)
* [Get Knowledge Base Data Lookup](./get-knowledge-base-data-lookup-query)
* [List Assistant Knowledge Base Items](./list-assistant-knowledge-bases-query)
* [Get Assistant Knowledge Base Document](./get-assistant-knowledge-base-document-query)
* [Retrieve AI Agent Log Node Details](./ai-agent-log-node-details-query)

### 2. Automation

* [Automation](./automation)
* [Create automation](./automation-creation)
* [Update automation](./automation-update)
* [Delete automation](./automation-deletion)
* [Automation actions](./automation-actions)
* [Automation events](./automation-events)
* [Automations usage details query](./automations-usage-details-query)
* [Retrieve automations](./retrieve-automations)
* [Retrieve automation logs](./automation-logs)
* [Retrieve automation logs by repo](./automation-logs-by-repo)
* [Get Automation Initial Values](./automation-initial-values)
* [Get Automation Event Attributes](./automation-event-attributes)
* [List Automated Formula Operations](./automated-formula-operations)
* [Export Automation Jobs](./export-automation-jobs)
* [Simulate Automation Execution](./automation-simulation)

### 3. Card and Field

* [Add attachments to a card or field](./add-attachments-to-a-card-or-field)
* [Create a card with required fields](./create-a-card-with-the-required-fields-fulfilled)
* [Create fields in a phase](./create-fields-in-a-phase)
* [Move card to a different phase](./move-card-to-a-different-phase)
* [Create connected cards](./create-connected-cards)
* [List a card's activities](./list-card-activities)

### 4. Email and Communication

* [Create and send an email through a card](./create-and-send-an-email-through-a-card)
* [Create and send an inbox email in one request](./create-and-send-inbox-email-in-one-request)
* [List emails from a card](./list-emails-from-a-card)
* [Get a single inbox email](./get-a-single-inbox-email)
* [Get a parsed email template](./parsed-email-template-query)
* [Get an email template by ID](./email-template-query)
* [List email templates for a pipe](./email-templates-query)

### 5. Field

* [Search for field dependencies](./search-for-field-dependencies)

### 6. Form and Configuration

* [Configure a start form on existing pipe](./configure-a-start-form-on-existing-pipe)
* [Create a pipe with start form configured](./create-a-pipe-with-start-form-configured)

### 7. Organization

* [Organization usage stats](./organization-usage-stats)
* [Retrieve organization settings](./retrieve-organization-settings)
* [Track active users in your organization](./track-active-users-in-your-organization)

### 8. Phase

* [Create fields in a phase](./create-fields-in-phase)
* [Move card to a different phase](./move-a-card-to-a-different-phase)
* [Reorder phase fields](./reorder-phase-fields)
* [Update phase settings](./update-phase-settings)

### 9. Pipe

* [Create a pipe with start form configured](./create-pipe-with-start-form-configured)
* [Get pipe flow (phases with related AI agents and automations)](./pipe-flow-query)
* [List pipes with the integrations app active](./pipes-with-active-integrations-query)
* [Update repo preferences](./update-repo-preferences)

### 10. Query Tips

* [Get resource IDs](./get-resource-ids)
* [Pagination basics](./pagination-basics)
* [Run multiple queries or mutations in a single request](./run-multiple-queries-or-mutations-in-a-single-request)

### 11. Report

* [Get reports](./get-reports)
* [Get organization report](./get-organization-report)
* [Get organization reports](./get-organization-reports)
* [Create organization report](./create-organization-report)
* [Update organization report](./update-organization-report)
* [Delete organization report](./delete-organization-report)
* [Export organization report](./export-organization-report)
* [Get pipe reports](./get-pipe-reports)
* [Create pipe report](./create-pipe-report)
* [Update pipe report](./update-pipe-report)
* [Delete pipe report](./delete-pipe-report)
* [Get pipe report columns](./get-pipe-report-columns)
* [Get pipe report filterable fields](./get-pipe-report-filterable-fields)

### 12. Roles

* [Create Custom Roles](./create-custom-roles)
* [Delete Custom Roles](./delete-custom-roles)

### 13. SMTP Configuration

* [Create SMTP Configuration](./creat-smtp-configuration)
* [List SMTP Configurations](./list-smtp-configurations)
* [Update SMTP Configuration](./update-smtp-configuration)
* [Delete SMTP Configuration](./delete-smtp-configuration)

### 14. SMTP Custom email

* [Create SMTP Custom Email with Configuration](./create-smtp-custom-email-with-configuration)
* [Get SMTP Custom Email](./get-smtp-custom-email)
* [Create an SMTP Custom Email](./create-smtp-custom-email)
* [Update an SMTP Custom Email](./update-smtp-custom-email)
* [Delete an SMTP Custom Email](./delete-smtp-custom-email)
* [Set the Default Organization SMTP Custom Email](./set-default-organization-smtp-custom-email)
* [List SMTP Custom Emails](./list-smtp-custom-emails)
* [List Organization SMTP Custom Emails (paginated)](./list-organization-smtp-custom-emails)

### 15. Tag

* [Add tags to resource](./add-tags-to-resource)
* [Remove tags from a resource](./remove-tags-from-resource)
* [Create tags in bulk](./create-tags-in-bulk)
* [Retrieve Tag Categories of an Organization](./tag-categories)
* [Tags by category](./tags-by-category)
* [Tags by category on resource](./tags-by-category-on-resource)
* [Update tag category](./update-tag-category)
* [Create Tag](./create-tag)
* [Update tag](./update-tag)
* [Update tags visibility by category](./update-tags-visibility)

### 16. Ticket

* [See tickets](./see-tickets)

### 17. Usage Stats

* [List organizations with usage stats access](./my-usage-stats-organizations-query)
* [Agents usage details query](./agent-usage-details-query)
* [Automation usage details query](./automations-usage-details-query)
* [Organization usage stats](./organization-usage-stats-query)
* [API usage stats query](./api-usage-stats-query)
* [API usage stats daily query](./api-usage-stats-daily-query)
* [Combined API usage stats query](./api-usage-stats-combined-query)
* [Combined AI credit usage stats query](./ai-credit-usage-stats-combined-query)
* [Integrations usage stats query](./integrations-usage-stats-query)
* [Integrations usage details query](./integrations-usage-details-query)
* [Create multi-org usage report export](./create-multi-org-usage-report-export-mutation)
* [Create multi-org users report export](./create-multi-org-users-report-export-mutation)

### 18. User

* [Set user favorite pipes](./set-user-favorite-pipes)
* [Set user roles via GraphQL mutation](./set-user-roles-via-graphql-mutation)
* [See users suggestions](./set-users-suggestions)
* [Export organization members](./export-organization-members)

### 19. Integrations

* [Create an integrations project](./integration-examples/01-create-integrations-project.md)

### 20. Platform Apps

* [Attach URL card (Platform App)](./platform-examples/00-attach-url-card-platform-app)
* [Enable a Platform App](./enable-platform-app)

### 21. Activities

* [Export pipe activities report](./report-examples/07-export-pipe-audit-logs-report)
* [Export org activities report](./report-examples/08-export-org-audit-logs-report)

### 22. Tasks

* [Get a phase task by card and phase](./task-examples/00-get-phase-task)
* [List My Tasks in an Organization](./tasks)
* [Create a task on a card](./task-examples/01-create-task)

### 23. Records

* [List Records of a Pipe or Database](./list-records)

### 24. Group

* [List Organization Groups](./group-examples/00-list-organization-groups)
* [Retrieve a Group, Its Owners, Users, and Available Interfaces](./group-examples/01-retrieve-group-details-and-members)

## About These Examples

These use cases demonstrate common integration scenarios and best practices when working with the Pipefy API. Each example includes:

* A detailed description of the use case
* Required API permissions
* Example GraphQL queries or mutations
* Sample responses
* Implementation notes and considerations

Whether you're building a new integration or looking to enhance existing functionality, these examples provide practical guidance for working with the Pipefy API.