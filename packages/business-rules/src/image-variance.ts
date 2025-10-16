export const IMAGE_VARIANCE = {
  // Minimum number of image variants per segment
  minVariantsPerSegment: 3,
  
  // Maximum number of image variants per segment
  maxVariantsPerSegment: 8,
  
  // Required aspect ratios for each variant
  requiredAspectRatios: [
    "9:16", // Vertical (Stories, Reels)
    "1:1",  // Square (Feed posts)
    "4:5",  // Portrait (Feed posts)
    "16:9", // Landscape (Stories, ads)
  ] as const,
  
  // Style variance rules
  styleVariance: {
    // Minimum number of different style categories per segment
    minStyleCategories: 2,
    // Maximum number of different style categories per segment
    maxStyleCategories: 4,
    // Allowed style categories
    allowedCategories: [
      "photorealistic",
      "illustration",
      "minimalist",
      "bold",
      "vintage",
      "modern",
      "hand-drawn",
      "geometric",
    ] as const,
  },
  
  // Color variance rules
  colorVariance: {
    // Minimum number of different color schemes per segment
    minColorSchemes: 2,
    // Maximum number of different color schemes per segment
    maxColorSchemes: 3,
    // Allowed color schemes
    allowedSchemes: [
      "monochrome",
      "complementary",
      "analogous",
      "triadic",
      "warm",
      "cool",
      "neutral",
    ] as const,
  },
  
  // Composition variance rules
  compositionVariance: {
    // Minimum number of different compositions per segment
    minCompositions: 2,
    // Maximum number of different compositions per segment
    maxCompositions: 4,
    // Allowed composition types
    allowedCompositions: [
      "centered",
      "rule-of-thirds",
      "diagonal",
      "symmetrical",
      "asymmetrical",
      "layered",
      "minimal",
    ] as const,
  },
  
  // Quality thresholds
  qualityThresholds: {
    // Minimum resolution for each aspect ratio
    minResolution: {
      "9:16": { width: 1080, height: 1920 },
      "1:1": { width: 1080, height: 1080 },
      "4:5": { width: 1080, height: 1350 },
      "16:9": { width: 1920, height: 1080 },
    },
    // Maximum file size per variant (in MB)
    maxFileSize: 10,
    // Minimum file size per variant (in KB)
    minFileSize: 100,
  },
  
  // Content diversity rules
  contentDiversity: {
    // Minimum number of different visual elements per segment
    minVisualElements: 3,
    // Maximum number of different visual elements per segment
    maxVisualElements: 6,
    // Allowed visual elements
    allowedElements: [
      "product",
      "lifestyle",
      "text-overlay",
      "background",
      "foreground",
      "icon",
      "illustration",
      "photograph",
    ] as const,
  },
} as const;