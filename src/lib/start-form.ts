import { db } from "@/lib/db";
import { pipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface StartFormConfig {
  internal_title?: string;
  internal_create_button_text?: string;
  public_title?: string;
  public_description?: string;
  public_submit_button_text?: string;
  public_brand_color?: string;
  public_logo_file_id?: string;
}

export async function getStartFormConfig(
  pipeId: string,
): Promise<StartFormConfig> {
  const pipe = await db.query.pipes.findFirst({
    where: eq(pipes.id, pipeId),
    columns: {
      startFormInternalTitle: true,
      startFormInternalCreateButtonText: true,
      startFormPublicTitle: true,
      startFormPublicDescription: true,
      startFormPublicSubmitButtonText: true,
      startFormPublicBrandColor: true,
      startFormPublicLogoFileId: true,
    },
  });

  if (!pipe) {
    throw new Error(`Pipe not found: ${pipeId}`);
  }

  return {
    internal_title: pipe.startFormInternalTitle ?? undefined,
    internal_create_button_text:
      pipe.startFormInternalCreateButtonText ?? undefined,
    public_title: pipe.startFormPublicTitle ?? undefined,
    public_description: pipe.startFormPublicDescription ?? undefined,
    public_submit_button_text: pipe.startFormPublicSubmitButtonText ?? undefined,
    public_brand_color: pipe.startFormPublicBrandColor ?? undefined,
    public_logo_file_id: pipe.startFormPublicLogoFileId ?? undefined,
  };
}

export async function updateStartFormConfig(
  pipeId: string,
  config: StartFormConfig,
): Promise<void> {
  await db
    .update(pipes)
    .set({
      startFormInternalTitle: config.internal_title,
      startFormInternalCreateButtonText:
        config.internal_create_button_text,
      startFormPublicTitle: config.public_title,
      startFormPublicDescription: config.public_description,
      startFormPublicSubmitButtonText: config.public_submit_button_text,
      startFormPublicBrandColor: config.public_brand_color as any,
      startFormPublicLogoFileId: config.public_logo_file_id,
    })
    .where(eq(pipes.id, pipeId));
}
