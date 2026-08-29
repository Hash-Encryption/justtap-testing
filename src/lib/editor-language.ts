import type { Card } from "./card";

export type BilingualFieldKey = "full_name" | "title" | "bio";
export type LocalizedCardKey =
  "full_name" | "full_name_ar" | "title" | "title_ar" | "bio" | "bio_ar";

export type EditorLanguageGroup = {
  lang: "en" | "ar";
  dir: "ltr" | "rtl";
  fields: {
    fullName: "full_name" | "full_name_ar";
    title: "title" | "title_ar";
    bio: "bio" | "bio_ar";
  };
  placeholders: {
    fullNameKey: "placeholderFullNameEn" | "placeholderFullNameAr";
    jobTitleKey: "placeholderJobTitleEn" | "placeholderJobTitleAr";
    bioKey: "placeholderBioEn" | "placeholderBioAr";
  };
};

export type EditorLanguageConfig = {
  primary: EditorLanguageGroup;
  secondary: EditorLanguageGroup;
};

/**
 * Maps primary and bilingual/secondary card editor fields based on current JustTap app locale.
 * - In English UI: primary edits English (full_name, title, bio), secondary edits Arabic (full_name_ar, title_ar, bio_ar).
 * - In Arabic UI: primary edits Arabic (full_name_ar, title_ar, bio_ar), secondary edits English (full_name, title, bio).
 * Database values keep their semantic meaning and are NEVER swapped.
 */
export function getEditorLanguageConfig(appLocale: "en" | "ar"): EditorLanguageConfig {
  if (appLocale === "ar") {
    return {
      primary: {
        lang: "ar",
        dir: "rtl",
        fields: {
          fullName: "full_name_ar",
          title: "title_ar",
          bio: "bio_ar",
        },
        placeholders: {
          fullNameKey: "placeholderFullNameAr",
          jobTitleKey: "placeholderJobTitleAr",
          bioKey: "placeholderBioAr",
        },
      },
      secondary: {
        lang: "en",
        dir: "ltr",
        fields: {
          fullName: "full_name",
          title: "title",
          bio: "bio",
        },
        placeholders: {
          fullNameKey: "placeholderFullNameEn",
          jobTitleKey: "placeholderJobTitleEn",
          bioKey: "placeholderBioEn",
        },
      },
    };
  }

  return {
    primary: {
      lang: "en",
      dir: "ltr",
      fields: {
        fullName: "full_name",
        title: "title",
        bio: "bio",
      },
      placeholders: {
        fullNameKey: "placeholderFullNameEn",
        jobTitleKey: "placeholderJobTitleEn",
        bioKey: "placeholderBioEn",
      },
    },
    secondary: {
      lang: "ar",
      dir: "rtl",
      fields: {
        fullName: "full_name_ar",
        title: "title_ar",
        bio: "bio_ar",
      },
      placeholders: {
        fullNameKey: "placeholderFullNameAr",
        jobTitleKey: "placeholderJobTitleAr",
        bioKey: "placeholderBioAr",
      },
    },
  };
}

/**
 * Safe accessor for localized fields on a Card draft without fallback contamination.
 */
export function getLocalizedCardValue(draft: Partial<Card>, key: LocalizedCardKey): string {
  return draft[key] ?? "";
}
