# Fields

## Definition

The field is the object used by Pipefy to collect and store the smallest pieces of information.

Each phase can have many fields and they play a fundamental role when it comes to managing a process.

Let's say we have a purchase process in which each card represent an item to be purchased. The item is likely to go through a few phases to complete the process. In this case, in each phase the item must contain some information in order for it to be useful to the process.

If we're talking about a phase that is intended to analyse if the item is necessary to be bought, we need to know what item is being requested, the following fields can help us:

* Name
* Vendor
* Category
* Purpose
* Price

Next, we might need a phase for a manager to approve or decline this purchase, in this case some possible necessary fields would be:

* Manager responsible
* Approved ?
* Quantity

and so on.

## Hierarchy and Relations

**Accessible through:** [`Phases`](https://developers.pipefy.com/reference/fields#phase-fields), [`Pipes`](https://developers.pipefy.com/reference/fields#start-form-fields), [`Tables`](https://developers.pipefy.com/reference/tables#table-query), depending on where the field is situated. *See links for more information*
**Objects fields can access directly:** [`Phases`](https://developers.pipefy.com/reference/phases), [`Card Field Values`](https://developers.pipefy.com/reference/fields#card-field-values) through [`Cards`](https://developers.pipefy.com/reference/cards) *(see how [here](https://developers.pipefy.com/reference/fields#card-field-values))*

## Fields in our API

### Field Queries

Before diving into examples in our API, there are a few things that need to be explained.

#### Finding the Field ID

The first thing to know is how we define the **field ids**, used to identify each field. In Pipefy, the `field_id` is a unique string that represents a field. Pipefy generates a new immutable *id* (also may be referred to as *`field_id`* or *`slug`*) using the field name whenever a field is created.
It's generation is expected to be based on the field's lower-cased name, with spaces and special characters being replaced by underscores. Example:
*For a field with a field name of "*Long Text Fiéld*" its `field_id` will be "*long\_text\_fi\_ld*"*

The `field_id` is important to know because some queries and mutations require it in order to be able interact with that given field. Below are examples of queries that find the `field_id` of fields in different locations.

##### Start form fields

The first tab demonstrates the query used for finding fields in the start form. Because the start form is an entity directly attributed to a pipe, it belongs to the `pipe` object.

##### Phase fields

The second and third tabs demonstrate queries for finding fields in all phases of a pipe, and finding fields of a specific phase, respectively.

##### Table fields

The fourth tab demonstrates a query for finding fields in a given Database Table.

```graphql Start Form Fields
{
  pipe(id: 123) {
    start_form_fields {
      id
      label
    }
  }
}
```

```graphql All Phase's Fields
{
  pipe(id: 123){
    phases{
      name
      fields{
        id
        label
      }
    }
  }
}
```

```graphql Specific Phase's Fields
{
  phase(id:123456){
    name
    fields{
      id
      label
    }
  }
}
```

```graphql Table Fields
{
  table(id:"WMWIUdCc"){
    table_fields{
      id
      label
    }
  }
}
```

##### Observation

It's not possible to query for a singular field using it's ID. As mentioned in the *[Hierarchy and relations](https://developers.pipefy.com/reference/fields#hierarchy-and-relations)* section, fields belong to phases, and you'll need to look for the field's properties via a phase. See *[Phase fields](https://developers.pipefy.com/reference/fields#phase-fields)* section.

Another thing about fields is that we can't query for them alone, as they are part of a `phase` and their values are stored using inside of the `card` object. It's dependent of these objects to be able to fetch the fields related to them.

#### Card Field Values

Phases within Pipefy only hold the attributes of the fields within their respective phases (see [here](https://developers.pipefy.com/reference/fields#phase-fields), but not the values you see after creating or updating a card.

The actual value that is stored on a given field is held within the `card` object. The moment a card has a field filled in is when you give it a new value. This sort of action creates a **Card Field Value**.

Take a look at some queries examples below:

```graphql Card's Field Values
{
  card(id: 12345) {
    fields {
      name
      value
      filled_at
    }
  }
}
```

#### Table Record Fields

The `record_fields` refers to fields inside of Pipefy's Database Tables. We have a whole section explaining what these are. You can read more about tables [here](https://developers.pipefy.com/reference/table-records).

Here we're going to show how to interact with the record's fields and values through our API.

Below are some queries to retrieve information about the field of these records.

```graphql Table's Record Field
{
  table_record(id: 123) {
    id
    title
    record_fields {
      date_value
      datetime_value
      filled_at
      float_value
      indexName
      name
      native_value
      report_value
      required
      updated_at
      value
    }
  }
}
```

```graphql Table's Records Fields
{
  table_records(table_id: "xxxxxxxx") {
    edges {
      node {
        record_fields {
          date_value
          datetime_value
          filled_at
          float_value
          indexName
          name
          native_value
          report_value
          required
          updated_at
          value
        }
      }
    }
  }
}
```

```graphql Find Table's Records
{
  findRecords(tableId: "xxxxxxxx", search: {fieldId: "field_id", fieldValue: "Field value"}) {
    edges {
      node {
        id
        title
        fields {
          date_value
          datetime_value
          filled_at
          float_value
          indexName
          name
          native_value
          report_value
          updated_at
          value
        }
      }
    }
  }
}
```

##### Observations

* For the `table_record` query, you just have to provide the record's ID. We have a whole section explaining about this and how to get this value, you can learn more about table records [here](https://developers.pipefy.com/reference/table-record).

* For the `table_records`, you have to provide the table id. The `table_id` is a bit different from most other IDs, as it is an alphanumeric id. To get this value, check out the *[Database Tables](https://developers.pipefy.com/reference/tables)* section.

### Field Mutations

Similarly to the queries, the mutations interacting with fields are also going to involve the other objects.
As mentioned previously, phases hold the definition of the fields. Below are a few example of common field mutations:

#### Create Phase Field

* In the first tab, a field of type *Horizontal Radio Select* with two options is being created in the phase with ID of *123*.

#### Update Phase Field

* In the second tab, the name of a field is being changed to  *New Name For Field* and it's `required` property is being set to `true`.

#### Delete Phase Field

* In the third tab, a field in the pipe with `UUID` of  *0000000-aaaa-2222-3333-bbbbb* and `ID` of *existing\_radio\_select\_field*. (You can find the pipe's uuid using a [`Pipe`](https://developers.pipefy.com/reference/pipes#pipe-queries) query).

You can check all possible field types in the [Field Types](https://developers.pipefy.com/reference/fields#field-types) section.

```graphql createPhaseField
mutation {
  createPhaseField(input: {
    phase_id: 123,
    label: "New Radio Select Field",
    type: "radio_horizontal",
    options: ["option 1", "option 2"]}) {
    phase_field {
      id
      label
    }
  }
}
```

```graphql updatePhaseField
mutation {
  updatePhaseField(input: {
    id: "existing_radio_select_field",
    label: "New Name For Field",
    required: true}) {
    phase_field {
      label
      id
    }
  }
}
```

```graphql deletePhaseField
mutation {
  deletePhaseField(input: {
    pipeUuid: "0000000-aaaa-2222-3333-bbbbb",
    id: "existing_radio_select_field"}) {
    success
  }
}
```

The mutations above are to create/delete/update the definition of a field, so it won't affect actual *Card Field Value*.

##### Updating fields values

Now let's take a look at the mutations to change the actual *Card Field Value* of the fields.

```graphql updateCardField
mutation {
  updateCardField(input: {
    card_id: 123,
    field_id: "new_radio_select_field",
    new_value: "option 1"
  }) {
    card {
      fields {
        value
        field {
          label
          id
        }
      }
    }
    success
  }
}
```

```graphql updateFieldsValues
mutation {
  updateFieldsValues(input: {
    nodeId: 123,
    values: [
      {fieldId: "new_radio_select_field", value: "option 2"},
      {fieldId: "test_field_2", value: "value 2"}
    ]
  }) {
    success
  }
}
```

The `updateFieldsValues` mutation allows you to change multiple field values at once.

###### Note

* The `nodeId` used in `updateFieldsValues` is the card's ID

Let's take a look at some mutations to create/delete/update new fields:

```graphql createTableField
mutation {
  createTableField(input: {
    table_id: "xxxxxxxx",
    label: "Field Name",
    type: "short_text"}) {
    table_field {
      id
      label
    }
  }
}
```

```graphql deleteTableField
mutation {
  deleteTableField(input: {table_id: "xxxxxxxx", id: "field_id"}) {
    success
  }
}
```

```graphql updateTableField
mutation {
  updateTableField(input: {
    table_id: "xxxxxxxx",
    id: "field_id",
    label: "New label"}) {
    table_field {
      id
      label
    }
  }
}
```

And now, the mutation to actually change the fields values:

```graphql setTableRecordFieldValue
mutation {
  setTableRecordFieldValue(input: {
    table_record_id: 123,
    field_id: "field_id",
    value: "new value"}) {
    table_record {
      id
      title
    }
    table_record_field {
      date_value
      datetime_value
      filled_at
      float_value
      indexName
      name
      native_value
      report_value
      required
      updated_at
      value
    }
  }
}
```

## Field Types

[block:parameters]
{
  "data": {
    "h-0": "TYPE",
    "h-1": "EXPECTED PARAMETERS TO BE ABLE TO CREATE FIELD",
    "h-2": "EXPECTED VALUE TO UPDATE A FIELD'S VALUE",
    "0-0": "assignee_select",
    "0-1": "-",
    "0-2": "The assignee's ID (if there's more than one it must be in an array with the values comma separated).  \nObs: The user(s) added as the assignee(s) must have a role/permission within the pipe.",
    "1-0": "attachment",
    "1-1": "-",
    "1-2": "Click [here](https://developers.pipefy.com/reference/add-attachments-to-a-card-or-field) to learn more",
    "2-0": "checklist_horizontal",
    "2-1": "**options** - an array that must contain the values of the possible options, the values must be a string and they have to be comma separated. Example:  \n`options:[\"option 1\", \"option 2\"]`",
    "2-2": "The exact values of one or more existing options (if it's more than one it must be in an array comma separated, with each string containing the option value). Example:  \n`options:[\"option 1\", \"option 2\"]`",
    "3-0": "checklist_vertical",
    "3-1": "**options** - an array that must contain the values of the possible options, the values must be a string and they have to be comma separated. Example:  \n`options:[\"option 1\", \"option 2\"]`",
    "3-2": "The exact values of one or more existing options (if it's more than one it must be in an array comma separated, with each string containing the option value). Example:  \n`options:[\"option 1\", \"option 2\"]`",
    "4-0": "cnpj",
    "4-1": "-",
    "4-2": "A valid CNPJ (it's not mandatory to add the '/' character).",
    "5-0": "connector",
    "5-1": "**connectedRepoId** - The pipe or table you want to connect to  \n**canCreateNewConnected** - A boolean that indicates if you can create a new connected item  \n**canConnectExisting** - A boolean that indicates if you can connect to an already existing item  \n**canConnectMultiples** - A boolean that indicates if you can connect to multiple items",
    "5-2": "The card_id of the card you want to connect to (if it's more than one it must be in an array with the values comma separated).  \nObs: The card to be added must already exist.",
    "6-0": "cpf",
    "6-1": "-",
    "6-2": "A valid CPF (it's not mandatory to add the '.' or '-' characters).",
    "7-0": "currency",
    "7-1": "-",
    "7-2": "Numbers. If the user executing the command has their language configuration set to PT-BR, it is necessary to use a comma to separate cents (`,`). If the setting is set to any other language, you should separate the cents using a dot (`.`).  \n_Portuguese_: \"11,99\"  \n_English_: \"11.99\"",
    "8-0": "date",
    "8-1": "-",
    "8-2": "The date value must be in the DD/MM/YYYY format.",
    "9-0": "datetime",
    "9-1": "-",
    "9-2": "The `datetime` field works the same way as the date field, the time can be both using the 24 hours standard or the AM/PM.  \n  \n_01/01/1911 16:00_ and _01/01/1911 4:00 PM_ are both valid.",
    "10-0": "due_date",
    "10-1": "-",
    "10-2": "The `due_date` field works the same way as the date field, the time can be both using the 24 hours standard or the AM/PM.  \n  \n_01/01/1911 16:00_and _01/01/1911 4:00 PM_are both valid.",
    "11-0": "email",
    "11-1": "-",
    "11-2": "A valid email format. Ex:  \n_[user1@email.com](mailto:user1@email.com)_",
    "12-0": "id",
    "12-1": "-",
    "12-2": "ID fields have no values so they are not update-able.",
    "13-0": "label_select",
    "13-1": "-",
    "13-2": "The label's id. (If it's more than one it must be in an array with the values comma separated).  \nObs: The label to be added must already exist.",
    "14-0": "long_text",
    "14-1": "-",
    "14-2": "Text",
    "15-0": "number",
    "15-1": "-",
    "15-2": "Numbers",
    "16-0": "phone",
    "16-1": "-",
    "16-2": "Pipefy has a flag that represents the country based on the country code. The default value is the US flag.  \nIn order to change it, insert the phone number with the country code.  \nEx:  \n+55\\<your_number> will show the Brazilian flag and phone number format.",
    "17-0": "radio_horizontal",
    "17-1": "**options** - it's an array that must contain the value of _one_ of the possible options. The values must be a string and they have to be comma separated.",
    "17-2": "The exact value of _one_ existing option.  \nObs: The `radio` field accepts only one value. If you need to select more than one, you should go with the `checklist_horizontal` or `checklist_vertical` field.",
    "18-0": "radio_vertical",
    "18-1": "**options** - it's an array that must contain the value of _one_ of the possible options. The values must be a string and they have to be comma separated.",
    "18-2": "The exact value of _one_ existing option.  \nObs: The `radio` field accepts only one value. If you need to select more than one, you should go with the `checklist_horizontal` or `checklist_vertical` field.",
    "19-0": "select",
    "19-1": "**options** - an array that must contain the values of the possible options, the values must be a string and they have to be comma separated. Example:  \n`options:[\"option 1\", \"option 2\"]`",
    "19-2": "The exact value of _one_ existing option.  \nObs: The `radio` field accepts only one value. If you need to select more than one, you should go with the `checklist_horizontal` or `checklist_vertical` field.",
    "20-0": "short_text",
    "20-1": "-",
    "20-2": "Text with up to 255 characters.",
    "21-0": "statement",
    "21-1": "-",
    "21-2": "Statement fields have no values so they are not update-able.",
    "22-0": "time",
    "22-1": "-",
    "22-2": "The time can be both using the 24 hours standard or the AM/PM.  \n_16:00_ or _4:00 PM_ are both valid values."
  },
  "cols": 3,
  "rows": 22,
  "align": [
    "left",
    "left",
    "left"
  ]
}
[/block]

Obs: Most of the fields have the following options:
**required** - A boolean that indicates if the field is mandatory.
**help** - A string that, if present, creates a clickable icon containing text that will pop up on the screen.
**description** - A string that adds additional explanation about the field right below the field name.
**editable** - A boolean that indicates if this field's value can be edited while a card is in another phases.
**minimal\_view** - A boolean that indicates if this field is minimal, which means that the field is collapsed and must be clicked to expand.

> 🚧 Be aware that running a mutation in our playground will change the Data inside Pipefy.