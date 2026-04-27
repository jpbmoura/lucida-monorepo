import mongoose, { Schema, type Model } from "mongoose";
import {
  DEFAULT_MATRICULA_SCOPE,
  MATRICULA_SCOPES,
  type MatriculaScope,
} from "../domain/matricula-scope.js";

export interface OrganizationPreferencesDoc {
  _id: string; // = organizationId
  organizationId: string;
  matriculaScope: MatriculaScope;
  createdAt: Date;
  updatedAt: Date;
}

const organizationPreferencesSchema = new Schema<OrganizationPreferencesDoc>(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    matriculaScope: {
      type: String,
      required: true,
      enum: MATRICULA_SCOPES,
      default: DEFAULT_MATRICULA_SCOPE,
    },
  },
  {
    collection: "organization_preferences",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

export const OrganizationPreferencesModel: Model<OrganizationPreferencesDoc> =
  (mongoose.models.OrganizationPreferences as
    | Model<OrganizationPreferencesDoc>
    | undefined) ??
  mongoose.model<OrganizationPreferencesDoc>(
    "OrganizationPreferences",
    organizationPreferencesSchema,
  );
