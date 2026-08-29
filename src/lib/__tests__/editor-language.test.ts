import { describe, expect, it } from "vitest";
import {
  getEditorLanguageConfig,
  getLocalizedCardValue,
  type LocalizedCardKey,
} from "../editor-language";
import { emptyCard, type Card } from "../card";

describe("Dynamic Primary / Bilingual Language Mapping Unit Suite", () => {
  describe("English application locale", () => {
    const config = getEditorLanguageConfig("en");

    it("maps primary fields to English and secondary fields to Arabic", () => {
      // Primary fields map to English
      expect(config.primary.lang).toBe("en");
      expect(config.primary.dir).toBe("ltr");
      expect(config.primary.fields.fullName).toBe("full_name");
      expect(config.primary.fields.title).toBe("title");
      expect(config.primary.fields.bio).toBe("bio");

      // Secondary fields map to Arabic
      expect(config.secondary.lang).toBe("ar");
      expect(config.secondary.dir).toBe("rtl");
      expect(config.secondary.fields.fullName).toBe("full_name_ar");
      expect(config.secondary.fields.title).toBe("title_ar");
      expect(config.secondary.fields.bio).toBe("bio_ar");
    });

    it("assigns appropriate placeholders for English primary and Arabic secondary", () => {
      expect(config.primary.placeholders.fullNameKey).toBe("placeholderFullNameEn");
      expect(config.primary.placeholders.jobTitleKey).toBe("placeholderJobTitleEn");
      expect(config.primary.placeholders.bioKey).toBe("placeholderBioEn");

      expect(config.secondary.placeholders.fullNameKey).toBe("placeholderFullNameAr");
      expect(config.secondary.placeholders.jobTitleKey).toBe("placeholderJobTitleAr");
      expect(config.secondary.placeholders.bioKey).toBe("placeholderBioAr");
    });
  });

  describe("Arabic application locale", () => {
    const config = getEditorLanguageConfig("ar");

    it("maps primary fields to Arabic and secondary fields to English", () => {
      // Primary fields map to Arabic
      expect(config.primary.lang).toBe("ar");
      expect(config.primary.dir).toBe("rtl");
      expect(config.primary.fields.fullName).toBe("full_name_ar");
      expect(config.primary.fields.title).toBe("title_ar");
      expect(config.primary.fields.bio).toBe("bio_ar");

      // Secondary fields map to English
      expect(config.secondary.lang).toBe("en");
      expect(config.secondary.dir).toBe("ltr");
      expect(config.secondary.fields.fullName).toBe("full_name");
      expect(config.secondary.fields.title).toBe("title");
      expect(config.secondary.fields.bio).toBe("bio");
    });

    it("assigns appropriate placeholders for Arabic primary and English secondary", () => {
      expect(config.primary.placeholders.fullNameKey).toBe("placeholderFullNameAr");
      expect(config.primary.placeholders.jobTitleKey).toBe("placeholderJobTitleAr");
      expect(config.primary.placeholders.bioKey).toBe("placeholderBioAr");

      expect(config.secondary.placeholders.fullNameKey).toBe("placeholderFullNameEn");
      expect(config.secondary.placeholders.jobTitleKey).toBe("placeholderJobTitleEn");
      expect(config.secondary.placeholders.bioKey).toBe("placeholderBioEn");
    });
  });

  describe("Existing card safety and bilingual values preservation", () => {
    const existingBilingualCard: Card = {
      ...emptyCard,
      id: "card-bilingual-1",
      slug: "ahmed-ali",
      full_name: "Ahmed Ali",
      full_name_ar: "أحمد علي",
      title: "Founder",
      title_ar: "المؤسس",
      bio: "Building modern products",
      bio_ar: "أبني منتجات حديثة",
      enable_arabic: true,
    };

    it("reads populated fields correctly in English UI without data mutation", () => {
      const enConfig = getEditorLanguageConfig("en");

      const primaryName = getLocalizedCardValue(
        existingBilingualCard,
        enConfig.primary.fields.fullName,
      );
      const secondaryName = getLocalizedCardValue(
        existingBilingualCard,
        enConfig.secondary.fields.fullName,
      );
      const primaryTitle = getLocalizedCardValue(
        existingBilingualCard,
        enConfig.primary.fields.title,
      );
      const secondaryTitle = getLocalizedCardValue(
        existingBilingualCard,
        enConfig.secondary.fields.title,
      );
      const primaryBio = getLocalizedCardValue(existingBilingualCard, enConfig.primary.fields.bio);
      const secondaryBio = getLocalizedCardValue(
        existingBilingualCard,
        enConfig.secondary.fields.bio,
      );

      expect(primaryName).toBe("Ahmed Ali");
      expect(secondaryName).toBe("أحمد علي");
      expect(primaryTitle).toBe("Founder");
      expect(secondaryTitle).toBe("المؤسس");
      expect(primaryBio).toBe("Building modern products");
      expect(secondaryBio).toBe("أبني منتجات حديثة");
    });

    it("reads populated fields correctly in Arabic UI without data mutation", () => {
      const arConfig = getEditorLanguageConfig("ar");

      const primaryName = getLocalizedCardValue(
        existingBilingualCard,
        arConfig.primary.fields.fullName,
      );
      const secondaryName = getLocalizedCardValue(
        existingBilingualCard,
        arConfig.secondary.fields.fullName,
      );
      const primaryTitle = getLocalizedCardValue(
        existingBilingualCard,
        arConfig.primary.fields.title,
      );
      const secondaryTitle = getLocalizedCardValue(
        existingBilingualCard,
        arConfig.secondary.fields.title,
      );
      const primaryBio = getLocalizedCardValue(existingBilingualCard, arConfig.primary.fields.bio);
      const secondaryBio = getLocalizedCardValue(
        existingBilingualCard,
        arConfig.secondary.fields.bio,
      );

      expect(primaryName).toBe("أحمد علي");
      expect(secondaryName).toBe("Ahmed Ali");
      expect(primaryTitle).toBe("المؤسس");
      expect(secondaryTitle).toBe("Founder");
      expect(primaryBio).toBe("أبني منتجات حديثة");
      expect(secondaryBio).toBe("Building modern products");
    });

    it("preserves unsaved edits across locale toggles without value swapping", () => {
      let draft = { ...existingBilingualCard };

      // 1. In English UI, user updates English primary name
      const enConfig = getEditorLanguageConfig("en");
      draft = {
        ...draft,
        [enConfig.primary.fields.fullName]: "Ahmed Ali Updated",
      };
      expect(draft.full_name).toBe("Ahmed Ali Updated");
      expect(draft.full_name_ar).toBe("أحمد علي");

      // 2. User toggles UI to Arabic WITHOUT saving
      const arConfig = getEditorLanguageConfig("ar");
      expect(getLocalizedCardValue(draft, arConfig.primary.fields.fullName)).toBe("أحمد علي");
      expect(getLocalizedCardValue(draft, arConfig.secondary.fields.fullName)).toBe(
        "Ahmed Ali Updated",
      );

      // 3. User updates Arabic primary name in Arabic UI
      draft = {
        ...draft,
        [arConfig.primary.fields.fullName]: "أحمد محمد",
      };
      expect(draft.full_name_ar).toBe("أحمد محمد");
      expect(draft.full_name).toBe("Ahmed Ali Updated");

      // 4. User toggles back to English UI
      expect(getLocalizedCardValue(draft, enConfig.primary.fields.fullName)).toBe(
        "Ahmed Ali Updated",
      );
      expect(getLocalizedCardValue(draft, enConfig.secondary.fields.fullName)).toBe("أحمد محمد");

      // Semantic database fields remain fixed: full_name is English, full_name_ar is Arabic
      expect(draft.full_name).toBe("Ahmed Ali Updated");
      expect(draft.full_name_ar).toBe("أحمد محمد");
    });
  });

  describe("Empty and partial localized data handling", () => {
    it("does NOT silently fall back or contaminate empty Arabic fields in Arabic UI", () => {
      const englishOnlyCard: Card = {
        ...emptyCard,
        full_name: "Sarah Connor",
        full_name_ar: null,
        title: "Engineer",
        title_ar: null,
        bio: "Autonomous systems specialist",
        bio_ar: null,
      };

      const arConfig = getEditorLanguageConfig("ar");

      // In Arabic UI, primary (Arabic) must be blank, NOT falling back to English
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.primary.fields.fullName)).toBe("");
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.primary.fields.title)).toBe("");
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.primary.fields.bio)).toBe("");

      // Secondary (English) must show the English values
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.secondary.fields.fullName)).toBe(
        "Sarah Connor",
      );
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.secondary.fields.title)).toBe(
        "Engineer",
      );
      expect(getLocalizedCardValue(englishOnlyCard, arConfig.secondary.fields.bio)).toBe(
        "Autonomous systems specialist",
      );
    });

    it("does NOT silently fall back or contaminate empty English fields in English UI", () => {
      const arabicOnlyCard: Card = {
        ...emptyCard,
        full_name: "",
        full_name_ar: "سارة كونور",
        title: null,
        title_ar: "مهندسة",
        bio: null,
        bio_ar: "متخصصة في الأنظمة المستقلة",
      };

      const enConfig = getEditorLanguageConfig("en");

      // In English UI, primary (English) must be blank
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.primary.fields.fullName)).toBe("");
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.primary.fields.title)).toBe("");
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.primary.fields.bio)).toBe("");

      // Secondary (Arabic) must show the Arabic values
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.secondary.fields.fullName)).toBe(
        "سارة كونور",
      );
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.secondary.fields.title)).toBe("مهندسة");
      expect(getLocalizedCardValue(arabicOnlyCard, enConfig.secondary.fields.bio)).toBe(
        "متخصصة في الأنظمة المستقلة",
      );
    });

    it("handles partial bilingual fields without cross-field contamination", () => {
      const partialCard: Card = {
        ...emptyCard,
        full_name: "Ahmed",
        full_name_ar: "أحمد",
        title: "Founder",
        title_ar: null,
        bio: null,
        bio_ar: "نبذة",
      };

      const arConfig = getEditorLanguageConfig("ar");

      // Primary (Arabic)
      expect(getLocalizedCardValue(partialCard, arConfig.primary.fields.fullName)).toBe("أحمد");
      expect(getLocalizedCardValue(partialCard, arConfig.primary.fields.title)).toBe("");
      expect(getLocalizedCardValue(partialCard, arConfig.primary.fields.bio)).toBe("نبذة");

      // Secondary (English)
      expect(getLocalizedCardValue(partialCard, arConfig.secondary.fields.fullName)).toBe("Ahmed");
      expect(getLocalizedCardValue(partialCard, arConfig.secondary.fields.title)).toBe("Founder");
      expect(getLocalizedCardValue(partialCard, arConfig.secondary.fields.bio)).toBe("");
    });
  });
});
