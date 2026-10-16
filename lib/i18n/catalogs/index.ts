import { adminEn } from "@/lib/i18n/catalogs/admin";
import { chromeEn } from "@/lib/i18n/catalogs/chrome";
import { eventsEn } from "@/lib/i18n/catalogs/events";
import { financeEn } from "@/lib/i18n/catalogs/finance";
import { inboxEn } from "@/lib/i18n/catalogs/inbox";
import { inventoryEn } from "@/lib/i18n/catalogs/inventory";
import { orgEn } from "@/lib/i18n/catalogs/org";
import { salesEn } from "@/lib/i18n/catalogs/sales";

/** English lookup. Indonesian source string is the key. Later spreads override earlier ones. */
export const enCatalog: Record<string, string> = {
  ...chromeEn,
  ...inboxEn,
  ...salesEn,
  ...inventoryEn,
  ...financeEn,
  ...eventsEn,
  ...orgEn,
  ...adminEn,
};
