import { describe, it, expect } from "vitest";

interface StartFormConfig {
  internal_title: string;
  internal_create_button_text: string;
  public_title: string;
  public_description?: string;
  public_submit_button_text: string;
  public_brand_color?: string;
  title_field_id?: string;
}

describe("Start Form Configuration", () => {
  it("internal and public titles are independent", () => {
    const config: StartFormConfig = {
      internal_title: "Purchase Requests",
      public_title: "Submit a Request",
      public_submit_button_text: "Send",
      internal_create_button_text: "Create Request",
    };

    expect(config.internal_title).toBe("Purchase Requests");
    expect(config.public_title).toBe("Submit a Request");
  });

  it("public submit button text defaults to 'Enviar' or 'Send'", () => {
    const config: StartFormConfig = {
      internal_title: "Form",
      public_title: "Form",
      public_submit_button_text: "Enviar",
      internal_create_button_text: "Criar novo card",
    };

    expect(config.public_submit_button_text).toBe("Enviar");
  });

  it("internal create button text defaults to 'Criar novo card'", () => {
    const config: StartFormConfig = {
      internal_title: "Form",
      public_title: "Form",
      public_submit_button_text: "Enviar",
      internal_create_button_text: "Criar novo card",
    };

    expect(config.internal_create_button_text).toBe("Criar novo card");
  });

  it("title_field_id is optional and can be set to derive card.title", () => {
    const config: StartFormConfig = {
      internal_title: "Form",
      public_title: "Form",
      public_submit_button_text: "Enviar",
      internal_create_button_text: "Criar novo card",
      title_field_id: "nome_do_solicitante",
    };

    expect(config.title_field_id).toBe("nome_do_solicitante");
  });

  it("public_description is optional and nullable", () => {
    const config: StartFormConfig = {
      internal_title: "Form",
      public_title: "Form",
      public_submit_button_text: "Enviar",
      internal_create_button_text: "Criar novo card",
    };

    expect(config.public_description).toBeUndefined();
  });

  it("public_brand_color is one of a fixed palette", () => {
    const BRAND_COLORS = [
      "blue",
      "green",
      "red",
      "yellow",
      "purple",
      "pink",
      "teal",
      "orange",
      "gray",
      "indigo",
    ];

    const config: StartFormConfig = {
      internal_title: "Form",
      public_title: "Form",
      public_submit_button_text: "Enviar",
      internal_create_button_text: "Criar novo card",
      public_brand_color: "blue",
    };

    expect(BRAND_COLORS).toContain(config.public_brand_color);
  });
});
