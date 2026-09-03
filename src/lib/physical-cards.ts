export interface PhysicalCardProduct {
  id: string;
  name: string;
  name_ar: string;
  variant: string;
  variant_ar: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  description_ar: string;
  isAvailable: boolean;
}

export const PHYSICAL_CARD_PRODUCTS: PhysicalCardProduct[] = [
  {
    id: "pvc_matte_black",
    name: "JustTap Matte Card",
    name_ar: "بطاقة JustTap الذكية (مطفي)",
    variant: "Matte Black PVC",
    variant_ar: "أسود مطفي",
    sku: "JT-NFC-PVC-BLK",
    price: 149.0, // Authoritative catalog price (149 SAR)
    currency: "SAR",
    description: "Premium matte finish with embedded high-frequency NFC chip & QR code.",
    description_ar: "مظهر مطفي فاخر مع شريحة NFC مدمجة ورمز QR عالي الدقة.",
    isAvailable: true,
  },
];

export const DEFAULT_PHYSICAL_CARD_PRODUCT = PHYSICAL_CARD_PRODUCTS[0];

export function getProductBySku(sku: string): PhysicalCardProduct | undefined {
  return PHYSICAL_CARD_PRODUCTS.find((p) => p.sku === sku || p.id === sku);
}
