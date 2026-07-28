# Cards Importer

Mutation to create multiple cards in a pipe from a xlsx spreadsheet.

[block:html]
{
  "html": "<p>In the tab <strong>cardsImporter</strong> (bellow) you can see an <ins>example</ins> mutation. Once you change the query to your variables, send it to <em>https://api.pipefy.com/graphql</em> and cards will be created with the information of your spreadsheet. <br />\nIn the tab <strong>Structure</strong> you can have a better view of the  query and you can use this format in our IDE: <a href=\"https://app.pipefy.com/graphiql\" target=\"_blank\">pipefy.com/graphiql</a></p>"
}
[/block]

```json cardsImporter
  {
    "query": "mutation { cardsImporter(input: {pipeId: \"219739\", url: \"https://docs.google.com/spreadsheets/d/13sohSO0eGjgZYqQSFyp0LUFwZhktiU9t3BX6Sgnb_yk/export?format=xlsx\", assigneesColumn: \"a\", labelsColumn: \"b\", dueDateColumn: \"c\", currentPhaseColumn: \"d\", fieldValuesColumns: [{column: \"e\", fieldId: \"company_name\"}, {column: \"f\", fieldId: \"contact_email\"}, {column: \"g\", fieldId: \"deal_value\"}]}) { cardsImportation { id } } }"
  }
```

```graphql Structure
  {
    mutation {
      cardsImporter(
        input: {
          pipeId: "219739",
          url: "https://docs.google.com/spreadsheets/d/13sohSO0eGjgZYqQSFyp0LUFwZhktiU9t3BX6Sgnb_yk/export?format=xlsx",
          assigneesColumn: "a",
          labelsColumn: "b",
          dueDateColumn: "c",
          currentPhaseColumn: "d",
          fieldValuesColumns: [
            {column: "e", fieldId: "company_name"},
            {column: "f", fieldId: "contact_email"},
            {column: "g", fieldId: "deal_value"}
          ]
        }) {
        cardsImportation {
          id
        }
      }
    }
  }
```

[block:parameters]
{
  "data": {
    "h-0": "Input fields",
    "h-1": "Description",
    "h-2": "Details",
    "0-0": "**pipeId (required)**",
    "0-1": "Represents the pipe ID.",
    "0-2": "You can find the pipe ID in the URL of the pipe.",
    "1-0": "**url (required)**",
    "1-1": "Represents the spreadsheet URL.",
    "1-2": "Sheet file must be public.",
    "2-0": "**assigneesColumn (optional)**",
    "2-1": "Represents column's letter or number where the assignee are represented.",
    "2-2": "In the sheet, the cell should contain the `user's full name` or the `user's email`. Each assignee must be separated by commas.",
    "3-0": "**labelsColumn (optional)**",
    "3-1": "Represents column's letter or number where the labels are represented.",
    "3-2": "In the sheet, the cell should contain the `label's title`. Each label must be separated by commas.",
    "4-0": "**dueDateColumn (optional)**",
    "4-1": "Represents column's letter or number where the due date is represented.",
    "4-2": "In the sheet, this column must be formatted as `date time`.",
    "5-0": "**currentPhaseColumn (optional)**",
    "5-1": "Represents column's letter or number where the current phase is represented.",
    "5-2": "In the sheet, the cell should contain the `phase's name`. Use this field if you need to create a card in different phase. If not supplied, the cards will be created in the first phase.",
    "6-0": "**fieldValuesColumns (optional)**",
    "6-1": "Represents column's letter or number where the field's value are represented and the field ID where it should be sent to.",
    "6-2": "To get the fields IDs of a pipe, you can  use this query:  \n  \n`{ \"query\": \"query { pipe(id: your_pipe_id) { table_fields { id } } } \" }`"
  },
  "cols": 3,
  "rows": 7,
  "align": [
    "left",
    "left",
    "left"
  ]
}
[/block]

> 📘 URL
>
> If you are using google spreadsheet, change the end of the URL from `/edit#gid=1144534632` to `/export?format=xlsx`.

[block:html]
{
  "html": "<h2>Response</h2>\n<p>After sending the query to Pipefy, you will recieve a response in your email when the importation proccess its done!</p>"
}
[/block]

[block:parameters]
{
  "data": {
    "h-0": "Case",
    "h-1": "Details",
    "0-0": "**Success**",
    "0-1": "In case of success, an email will be sent to let you know the pipe and how many cards were created.",
    "1-0": "**Partially Imported**",
    "1-1": "In this case, not all cards were created. In the email, will be attached a file with the inconsistent lines and the details about the errors (in the last column). Update the lines and use this file to send another mutation to create the remaining cards.",
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