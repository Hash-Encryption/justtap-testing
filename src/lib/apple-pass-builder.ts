import type { Card } from "./card";
import { createZip, type ZipEntry } from "./zip-builder";

/**
 * Converts HEX color (e.g. #2563eb) to RGB string "rgb(37, 99, 235)"
 */
function hexToRgb(hex: string | undefined): string {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return "rgb(37, 99, 235)";
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

/** Compute SHA-1 hex string */
async function sha1Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Transparent 1x1 PNG icon bytes fallback for Apple Wallet Pass icon.png
const DEFAULT_ICON_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x1d, 0x00, 0x00, 0x00, 0x1d, 0x08, 0x06, 0x00, 0x00, 0x00, 0xda, 0x62, 0x7e,
  0x7d, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00,
  0x00, 0x00, 0x04, 0x00, 0x01, 0x3d, 0x3d, 0x3d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

/**
 * Builds a valid Apple Wallet Pass (.pkpass) binary Uint8Array for a digital business card.
 */
export async function buildAppleWalletPass(card: Card, originUrl: string): Promise<Uint8Array> {
  const cardUrl = `${originUrl}/c/${card.slug}`;
  const backgroundColor = hexToRgb(card.accent_color || "#2563eb");

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.justtap.card",
    serialNumber: `card-${card.slug}`,
    teamIdentifier: "JUSTTAP123",
    organizationName: "JustTap Digital NFC",
    description: `Digital Business Card Pass for ${card.full_name}`,
    logoText: "JustTap Pass",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: backgroundColor,
    labelColor: "rgb(226, 232, 240)",
    generic: {
      primaryFields: [
        {
          key: "name",
          label: "CARD OWNER",
          value: card.full_name,
        },
      ],
      secondaryFields: [
        {
          key: "title",
          label: "TITLE / ROLE",
          value: card.title || card.company || "Digital Business Pass",
        },
        {
          key: "company",
          label: "ORGANIZATION",
          value: card.company || "JustTap Member",
        },
      ],
      auxiliaryFields: [
        {
          key: "phone",
          label: "PHONE",
          value: card.phone || "-",
        },
        {
          key: "email",
          label: "EMAIL",
          value: card.email || "-",
        },
      ],
      backFields: [
        {
          key: "card_url",
          label: "Live Digital Business Card Profile",
          value: cardUrl,
        },
        {
          key: "powered",
          label: "Powered By",
          value: "JustTap White-Label NFC Platform",
        },
      ],
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: cardUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
  };

  const encoder = new TextEncoder();
  const passJsonBytes = encoder.encode(JSON.stringify(passJson, null, 2));

  // Compute manifest.json containing SHA-1 hashes
  const passJsonHash = await sha1Hex(passJsonBytes);
  const iconPngHash = await sha1Hex(DEFAULT_ICON_PNG);

  const manifestJson = {
    "pass.json": passJsonHash,
    "icon.png": iconPngHash,
    "icon@2x.png": iconPngHash,
    "logo.png": iconPngHash,
    "logo@2x.png": iconPngHash,
  };

  const manifestJsonBytes = encoder.encode(JSON.stringify(manifestJson, null, 2));

  const entries: ZipEntry[] = [
    { filename: "pass.json", data: passJsonBytes },
    { filename: "manifest.json", data: manifestJsonBytes },
    { filename: "icon.png", data: DEFAULT_ICON_PNG },
    { filename: "icon@2x.png", data: DEFAULT_ICON_PNG },
    { filename: "logo.png", data: DEFAULT_ICON_PNG },
    { filename: "logo@2x.png", data: DEFAULT_ICON_PNG },
  ];

  return createZip(entries);
}
