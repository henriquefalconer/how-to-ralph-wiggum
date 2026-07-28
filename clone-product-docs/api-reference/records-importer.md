# Records Importer

Mutation to create multiple records in a database table from a xlsx spreadsheet.

In the tab **recordsImporter** (bellow) you can see an **example mutation**. Once you change the query to your variables, send it to *api.pipefy.com/graphql* and records will be created with the information of your spreadsheet.

In the tab **Structure** you can have a better view of the  query and you can use this format in our IDE: [pipefy.com/graphiql](https://app.pipefy.com/graphiql)

```json recordsImporter
  {
    "query": "mutation { recordsImporter(input: {tableId: \"p0A_JWST\", url: \"https://docs.google.com/spreadsheets/d/13sohSO0eGjgZYqQSFyp0LUFwZhktiU9t3BX6Sgnb_yk/export?format=xlsx\", statusColumn: \"d\", fieldValuesColumns: [{column: \"e\", fieldId: \"company_name\"}, {column: \"f\", fieldId: \"contact_email\"}]}) { recordsImportation { id } } }"
  }
```

```graphql Structure
mutation {
  recordsImporter(input: {
    tableId: "p0A_JWST",
    url: "https://docs.google.com/spreadsheets/d/13sohSO0eGjgZYqQSFyp0LUFwZhktiU9t3BX6Sgnb_yk/export?format=xlsx",
    statusColumn: "d",
    fieldValuesColumns: [
      {column: "e", fieldId: "company_name"},
      {column: "f", fieldId: "contact_email"}
    ]})
  {
    recordsImportation {
      id
    }
  }
}
```

[block:parameters]
{
  "data": {
    "h-0": "",
    "h-1": "",
    "h-2": "",
    "0-0": "**tableId (required)**",
    "0-1": "Represents the table ID.",
    "0-2": "You can find the table ID in the URL of the table.",
    "1-0": "**url (required)**",
    "1-1": "Represents the spreadsheet URL.",
    "1-2": "Sheet file must be public.",
    "2-0": "**statusColumn (optional)**",
    "2-1": "Represents column's letter or number where the status phase is represented.",
    "2-2": "In the sheet, the cell should contain the `status` of the record.",
    "3-0": "**fieldValuesColumns (optional)**",
    "3-1": "Represents column's letter or number where the field's value are represented and the field ID where it should be sent to.",
    "3-2": "To get the fields IDs of a table, you can  use this query:  \n  \n`{ \"query\": \"query { table(id: your_table_id) { table_fields { id } } }\" }`"
  },
  "cols": 3,
  "rows": 4,
  "align": [
    "left",
    "left",
    "left"
  ]
}
[/block]

> 📘 URL
>
> If you are using google spreadsheet, change the end of the URL from `/edit#gid=1144534632` to `/export?format=xlsx`

## Response

After sending the query to Pipefy, you will receive a response in your email when the importation process is done!

[block:parameters]
{
  "data": {
    "h-0": "",
    "h-1": "",
    "0-0": "**Success**",
    "0-1": "In case of success, an email will be sent to let you know the pipe and how many records were created.",
    "1-0": "**Partially Imported**",
    "1-1": "In this case, not all records were created. In the email, will be attached a file with the inconsistent lines and the details about the errors (in the last column). Update the lines and use this file to send another mutation to create the remaining records.",
    "2-0": "**Error 1**",
    "2-1": "Selected fields couldn’t be found. Maybe you type the wrong column position or field ID.",
    "3-0": "**Error 2**",
    "3-1": "File format was invalid. Spreadsheet is not Public or the file is not .xlsx format.",
    "4-0": "**Error 3**",
    "4-1": "File format was invalid. Spreadsheet is not Public, the file is not .xlsx format or the cell input was not in the demanded format (in this documentation you can  find how you should  \n configure the information of each column regarding the field type.)"
  },
  "cols": 2,
  "rows": 5,
  "align": [
    "left",
    "left"
  ]
}
[/block]