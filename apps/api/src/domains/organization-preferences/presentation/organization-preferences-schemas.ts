import { z } from "zod";
import { MATRICULA_SCOPES } from "../domain/matricula-scope.js";

export const matriculaScopeEnum = z.enum(MATRICULA_SCOPES);

export const updateOrganizationPreferencesBody = z
  .object({
    matriculaScope: matriculaScopeEnum.optional(),
  })
  .refine((v) => v.matriculaScope !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export type UpdateOrganizationPreferencesBody = z.infer<
  typeof updateOrganizationPreferencesBody
>;
