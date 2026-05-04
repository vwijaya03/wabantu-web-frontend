import type { BusinessProfile } from "@/lib/api/business";

function filled(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * True when every field shown in AI Settings → “Profil bisnis” has non-empty
 * content (nama bisnis minimal 2 karakter, selaras validasi form).
 */
export function isBusinessProfileCardComplete(
  profile: BusinessProfile | null,
): boolean {
  if (!profile) return false;
  if (profile.businessName.trim().length < 2) return false;
  return (
    filled(profile.description) &&
    filled(profile.address) &&
    filled(profile.openingHours) &&
    filled(profile.productsServices) &&
    filled(profile.basePricing) &&
    filled(profile.deliveryArea)
  );
}
