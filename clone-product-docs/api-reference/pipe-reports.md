# Pipe Reports

## Definition

Pipefy allows you to set up reports for the pipes within your organization. The reports can be used to gather information regarding the cards within your process, based on the filters and conditions you've configured

## Hierarchy and Relations

**Accessible through:** [`Pipes`](https://developers.pipefy.com/reference/pipes)

## Phases in our API

Through our API you can fetch information about a pipe's reports using a query.

### Report Query

This is an example of a query which retrieves information about a report. Replace '12345' with the ID of the pipe containing the reports you'd like to query for. The pipe `ID` can be retrieved on the interface by looking at the URL of the pipe's page.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/ce278d4-pipe_id_in_url.png",
        "pipe_id_in_url.png",
        378
      ],
      "align": "center",
      "caption": "Where to find a pipe's ID"
    }
  ]
}
[/block]

If you need to know more attributes regarding a pipe, you can fetch them with a pipe query. Check our [GraphQL Console](https://developers.pipefy.com/graphql) to see what other attributes are available.

```graphql Pipe Reports
{
  pipe(id: 12345) {
    reports {
      id
      name
    }
  }
}
```

### Export Report

To get the link to download the report in .xlsx format, the following steps are required:

* exportPipeReport mutation to create the export object.
* pipeReportExport query to get the url to download the file.

#### exportPipeReport mutation

Replace '1' and '2' with the ID of the pipe and report respectively.

```graphql
mutation {
  exportPipeReport(input: {pipeId: 1, pipeReportId: 2}) {
    pipeReportExport {
      id
    }
  }
}
```

#### pipeReportExport query

Replace '20' with the ID returned by the exportPipeReport mutation.

```graphql
{
  pipeReportExport(id: 20) {
    fileURL
    state
    startedAt
    requestedBy {
      id
    }
  }
}
```

## Rate Limits

Pipe Reports exportation feature relies on Rate Limits, which is a common technique to ensure security, reliability and a consistent developer experience, by limiting the number of requests in a time interval.

For Pipe Reports Export the **rate limit is 50 requests in 24 hours, for each pipe.**

In case of reaching this limit, you must wait for 24 hours from the time the last request was made. Any request in this time interval won't be processed and will contain a rate limit reached message displayed on "errors" in the response payload.

## Testing our API

When querying for reports, there's much more information available than the ones in the examples of the query shown in the **Reports Query** section.
Also, keep in mind that our API has a lot of queries and mutations available, not just regarding phases.

For a full list of our GraphQL capabilities, you can access our [GraphQL playground](https://developers.pipefy.com/graphql) and play around with it.