# Orchestrating Agents with Pipefy

Orchestrate interconnected AI agents to execute end-to-end workflows.

## Bridge the gap between raw AI power and enterprise-grade process control

Pipefy is the command center for your intelligent workforce. By orchestrating external agents alongside Pipefy’s native agents, you create resilient, self-correcting workflows that navigate ambiguity with human-like reasoning and machine-speed efficiency.

***

## Requirements

To start orchestrating, you will need:

* An active Pipefy iPaaS account
* API access to your chosen external LLM (OpenAI, Google, Anthropic, etc.)
* A defined process (Pipe) where the orchestration will live

***

# Step 1: Building the Orchestration Recipe

The foundation of agentic orchestration is the [Pipefy iPaaS](https://help.pipefy.com/en/articles/12589348-getting-started-with-pipefy-s-ipaas). It acts as the nervous system, sending signals between your process and external brains.

## 1.1 Set the Trigger

Start by creating a new flow in Pipefy iPaaS. Use the **"Card created"** trigger to initiate the agentic chain every time a request enters your system.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/bc2c74040e1329dac94b5bb9ba3f7d15989d53cc02016d5342273166fb4ee329-01.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/9ad998b1f9ffa1c33efeb4725c9beb29fa42933ba77edff753c7710d1615b76f-2.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

> **Note:** You will need a Pipefy [Service Account](https://help.pipefy.com/en/articles/9027789-service-accounts) for that.

***

## 1.2 Context Gathering

Before calling an agent, you must fetch all relevant card data. This ensures the agent has the full context (**Requestor, Department, Amount, Description**) to make an informed decision.

Use the **“Get card by id”** step to retrieve this information.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/4e5f1449efdeac278b156beb2f027d2c597bbc8fbffc2bc630083af7814f14fb-3.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

***

## 1.3 The External Brain Integration (The Core)

This is where the orchestration happens.

Insert a step to call your external agent (e.g., OpenAI Assistants API or any other). This is particularly useful if you already have an external agent configured with your company’s **Knowledge Base (RAG or System Prompt)**.

In the screenshots referenced above, step 3 uses a **“Custom API Call”** to the OpenAI Responses API, sending:

* Dynamic data from the card created in previous steps
* The identifiers of your external agent

You can find these identifiers in your external agent platform.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/74e2098cf3d896fc6a6f15f730b2d7131969334b7a64e1ee369222b565798ebd-4.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/114daa2db03b0c19c925a19ceaaf7b97cb5f186c5213fd56bb9ae187dc6e618a-5.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

**Dynamic Inputs:**\
Place them into your JSON request body using the iPaaS interface.

> **Security note:** Use the secure **“Connection”** input configuration for your API keys.

***

## 1.4 Capturing and Storing the Intelligence

The final piece of the recipe is bringing the external agent's response back into your process’s source of truth using the **“Update card”** step. The iPaaS will take the raw output from the AI and map it back to a pipe field. You can choose to place the full output into a field or to perform a parsing here.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/30fc49a40dfe08b4e4550ea6da411c927091794e91ca0c93ee677548479a2973-06.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

### Creating the Audit Trail

Beyond just the "Decision," we recommend getting some extra information, such as the Model, Token Usage, among others, into fields or a "Metadata" section to ensure future cost and performance audits. In the example, a specific phase called “External Agent details” was used:

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/2fdf2f67ad844816d09f29cb98a1072ea19188a327bded3c3fc5330d407ce3cb-7.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

***

# Step 2: Closing the Loop with Internal Agents

Once the external agent returns a decision, your [Pipefy Internal Agents](https://help.pipefy.com/en/articles/12526171-ai-agent-2-0-create-the-new-ai-agent) take over to execute the business logic.

Pipefy agents can:

* **Structure Data:** Transform raw AI text into structured Pipefy fields
* **Execute Actions:** Automatically move the card to “Manager Approval” or “Security Review” based on the AI’s verdict
* **Human-in-the-loop:** Draft a tailored email to the requester explaining the decision, leaving it ready for a human to hit “Send”

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/c4a6f2910a88bb4c43687da797e2e52df8fca5661b7daf50d516ffeba09d7bad-12.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

***

# Step 3: Enterprise-Grade Observability

Don’t let your AI become a black box. For IT and Finance teams to trust autonomous agents, transparency is essential.

By mapping metadata from your external agent back into Pipefy, you can track:

* **Reasoning Traces:** Why the agent made a specific decision
* **Resource Usage:** Token consumption and inference costs per request
* **Model Governance:** Which model version was used for each specific card

Below you can see a Pipefy Card with a dedicated “External Agent details” phase for AI Governance, filled with logs, model, token counts, and Reasoning.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/ef762a4bbaf68a993f50584b76e4b978a6cbac3bf8b4ca8dd42ad4f1d86aa809-8.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/ccf9fde97ca6d27ceae20352b7c909f6c6afb3ff72c151bfb235eba8e006fd9a-9.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

***

<br />

## Pro-Tip: The Observability Dashboard

Take it a step further by using Pipefy Interfaces to build a centralized AI Command Center. Monitor the performance, accuracy, and ROI of all your agents, internal and external, in one place.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/632b1022bc23ba9b2cb209e0e80a6d79c42a5a03f0a81c6ba7d283646b38ae96-10.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/5910867a7f8e61a4754b793b4da6bbc146dfca3b107587388bd7408ee371d21e-11b.png",
        "",
        ""
      ],
      "align": "center"
    }
  ]
}
[/block]

***

<br />

## Example in Action: Procurement Use Case

We tested and demonstrated this orchestration using a Purchase Policy scenario. In short:

* **The Request:** A user asked for a "Samsung Laptop" (violating the "Dell/Apple only" policy).
* **The External Agent:** Instantly identified the violation and cited the Procurement Policy.
* **The Result:** Pipefy automatically flagged the card, logged the reasoning, and notified the requester.

***

## Ready to orchestrate your controlled autonomous workforce?

<https://www.pipefy.com/>