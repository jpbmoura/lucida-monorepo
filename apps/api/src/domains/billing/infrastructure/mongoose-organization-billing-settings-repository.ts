import type { OrganizationBillingSettingsRepository } from "../domain/organization-billing-settings-repository.js";
import { OrganizationBillingSettings } from "../domain/organization-billing-settings.js";
import {
  OrganizationBillingSettingsModel,
  type OrganizationBillingSettingsDoc,
} from "./organization-billing-settings-schema.js";

export class MongooseOrganizationBillingSettingsRepository
  implements OrganizationBillingSettingsRepository
{
  async findByOrg(
    organizationId: string,
  ): Promise<OrganizationBillingSettings | null> {
    const doc = await OrganizationBillingSettingsModel.findOne({
      organizationId,
    })
      .lean<OrganizationBillingSettingsDoc>()
      .exec();
    if (!doc) return null;
    return OrganizationBillingSettings.restore({
      organizationId: doc.organizationId,
      billingMode: doc.billingMode,
      perTeacherLimit: doc.perTeacherLimit,
      billingCycle: doc.billingCycle,
      stripeSubscriptionId: doc.stripeSubscriptionId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async save(settings: OrganizationBillingSettings): Promise<void> {
    await OrganizationBillingSettingsModel.updateOne(
      { _id: settings.organizationId },
      {
        $set: {
          organizationId: settings.organizationId,
          billingMode: settings.billingMode,
          perTeacherLimit: settings.perTeacherLimit,
          billingCycle: settings.billingCycle,
          stripeSubscriptionId: settings.stripeSubscriptionId,
        },
        $setOnInsert: { _id: settings.organizationId },
      },
      { upsert: true },
    );
  }
}
