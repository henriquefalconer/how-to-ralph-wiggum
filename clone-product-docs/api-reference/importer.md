# Importing

Create cards or records from a xlsx spreadsheet.

[block:html]
{
  "html": "<p>If you have a spreadsheet with important information and wish to create cards or records with that data, it is possible with our API. Each line of the sheet will be converted to a card/record.</p>\n<p>This mutation copy the data from your sheet and creates multiple cards in a pipe or records in a database table.</p>"
}
[/block]

> 🚧 Permission
>
> You MUST be the pipe or table Admin!

[block:html]
{
  "html": "<h2>Spreadsheet</h2>"
}
[/block]

> 🚧 Make sure the sheet is Public!
>
> To send the information to Pipefy, the XSLX's URL file must be public.

[block:html]
{
  "html": "<h3>How to set up the sheet?</h3>\n\n<p>The column represent a field on Pipefy and the line represent a card/record. Example:</p>"
}
[/block]

> ❗️ First line
>
> We ignore the first line of the sheet, so use it as a place to put the title of each column.

| Short Text field | Email field        | Phone field     | Short Text field              | Long Text field               |
| :--------------- | :----------------- | :-------------- | :---------------------------- | :---------------------------- |
| Card/Record #1   | <email1@email.com> | +1 202 555-0123 | shot text from card/record #1 | long text from card/record #1 |
| Card/Record #2   | <email2@email.com> | +1 202 555-4567 | shot text from card/record #2 | long text from card/record #2 |
| Card/Record #3   | <email3@email.com> | +1 202 555-8901 | shot text from card/record #3 | long text from card/record #3 |

[block:html]
{
  "html": "<h2>How should I configure the information of each column regarding the field type?</h2>\n<p>The information sent to pipefy must follow a pattern. The content should match exactly the fields configuration on Pipefy!</p>"
}
[/block]

[block:parameters]
{
  "data": {
    "h-0": "Field",
    "h-1": "Detail",
    "0-0": "**Assignee**",
    "0-1": "The users' emails or the users' names separated by commas and formatted as Plain Text.",
    "1-0": "**Attachment**",
    "1-1": "Not supported.",
    "2-0": "**Vertical/Horizontal Checklist**",
    "2-1": "The text of the checklist options separated by commas and formatted as Plain Text.",
    "3-0": "**CPF**",
    "3-1": "Eleven numbers following the pattern `000.000.000-00` formatted as Plain Text.",
    "4-0": "**CNPJ**",
    "4-1": "Fourteen numbers following the pattern `000.000.00/0000-00` formatted as Plain Text.",
    "5-0": "**Date**",
    "5-1": "The value formatted as a date.",
    "6-0": "**Date Time and Due Date**",
    "6-1": "The value formatted as a Date time.",
    "7-0": "**Currency**",
    "7-1": "The value formatted as Currency.",
    "8-0": "**Label Select**",
    "8-1": "The text of the labels' names separated by commas and formatted as Plain Text.",
    "9-0": "**Email**",
    "9-1": "The email formatted as Plain Text.",
    "10-0": "**Number**",
    "10-1": "The number formatted as Plain Text.",
    "11-0": "**Short/Long Text**",
    "11-1": "The text formatted as Plain Text.",
    "12-0": "**Vertical/Horizontal Radio**",
    "12-1": "The text of the selected option formatted as Plain Text.",
    "13-0": "**Phone**",
    "13-1": "Numbers in the format of phone numbers of the country you want. Brazil: `+ 55 41 1234-5678`.  \n(use a single quotation mark before the plus sign)",
    "14-0": "**Statement**",
    "14-1": "Not supported.",
    "15-0": "**Select**",
    "15-1": "The text of the selected option formatted as Plain Text.",
    "16-0": "**Time**",
    "16-1": "The value formatted as Time.",
    "17-0": "**ID** ",
    "17-1": "Not supported.",
    "18-0": "**Connection Field** ",
    "18-1": "The card's ID or record's ID formatted as Plain Text."
  },
  "cols": 2,
  "rows": 19,
  "align": [
    "left",
    "left"
  ]
}
[/block]