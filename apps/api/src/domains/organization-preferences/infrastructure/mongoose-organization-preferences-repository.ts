import type { OrganizationPreferencesRepository } from "../domain/organization-preferences-repository.js";
import { OrganizationPreferences } from "../domain/organization-preferences.js";
import {
  OrganizationPreferencesModel,
  type OrganizationPreferencesDoc,
} from "./organization-preferences-schema.js";

export class MongooseOrganizationPreferencesRepository
  implements OrganizationPreferencesRepository
{
  async findByOrg(
    organizationId: string,
  ): Promise<OrganizationPreferences | null> {
    const doc = await OrganizationPreferencesModel.findOne({
      organizationId,
    })
      .lean<OrganizationPreferencesDoc>()
      .exec();
    if (!doc) return null;
    return OrganizationPreferences.restore({
      organizationId: doc.organizationId,
      matriculaScope: doc.matriculaScope,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async save(prefs: OrganizationPreferences): Promise<void> {
    await OrganizationPreferencesModel.updateOne(
      { _id: prefs.organizationId },
      {
        $set: {
          organizationId: prefs.organizationId,
          matriculaScope: prefs.matriculaScope,
        },
        $setOnInsert: { _id: prefs.organizationId },
      },
      { upsert: true },
    );
  }
}
