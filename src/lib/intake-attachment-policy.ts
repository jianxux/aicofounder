export type IntakeAttachmentClass = "pdf" | "image" | "text";

export type IntakeAttachmentTypeRule = {
  fileClass: IntakeAttachmentClass;
  label: string;
  mimeTypes: readonly string[];
  extensions: readonly string[];
};

export type IntakeAttachmentPrivacyRule = {
  label: string;
  detail: string;
};

export type IntakeAttachmentPolicy = {
  uploadsEnabled: boolean;
  status: "coming_soon";
  maxFileCount: number;
  maxSizePerFileBytes: number;
  maxTotalUploadBytes: number;
  allowedTypes: readonly IntakeAttachmentTypeRule[];
  blockedContentClasses: readonly string[];
  privacyRules: readonly IntakeAttachmentPrivacyRule[];
};

export type ProposedIntakeAttachment = {
  name?: unknown;
  sizeBytes?: unknown;
  mimeType?: unknown;
};

export type IntakeAttachmentValidationErrorCode =
  | "invalid_selection"
  | "invalid_metadata"
  | "too_many_files"
  | "file_too_large"
  | "total_size_exceeded"
  | "unsupported_type";

export type IntakeAttachmentValidationError = {
  code: IntakeAttachmentValidationErrorCode;
  message: string;
  attachmentIndex?: number;
};

export type NormalizedIntakeAttachment = {
  name: string;
  sizeBytes: number;
  mimeType: string;
  fileClass: IntakeAttachmentClass;
};

export type IntakeAttachmentValidationResult = {
  isValid: boolean;
  normalizedAttachments: NormalizedIntakeAttachment[];
  errors: IntakeAttachmentValidationError[];
};

export const INTAKE_ATTACHMENT_POLICY: IntakeAttachmentPolicy = {
  uploadsEnabled: false,
  status: "coming_soon",
  maxFileCount: 3,
  maxSizePerFileBytes: 5 * 1024 * 1024,
  maxTotalUploadBytes: 10 * 1024 * 1024,
  allowedTypes: [
    {
      fileClass: "pdf",
      label: "PDFs",
      mimeTypes: ["application/pdf"],
      extensions: [".pdf"],
    },
    {
      fileClass: "image",
      label: "PNG or JPEG images",
      mimeTypes: ["image/png", "image/jpeg"],
      extensions: [".png", ".jpg", ".jpeg"],
    },
    {
      fileClass: "text",
      label: "Plain text notes",
      mimeTypes: ["text/plain"],
      extensions: [".txt"],
    },
  ] as const,
  blockedContentClasses: [
    "archives and compressed bundles",
    "executables, scripts, and installers",
    "audio or video recordings",
    "spreadsheets, slide decks, and rich office documents",
    "password-protected or encrypted files",
    "secrets, credentials, or regulated personal data",
  ] as const,
  privacyRules: [
    {
      label: "Use only what helps intake",
      detail: "Share only source material needed to frame the project brief.",
    },
    {
      label: "Do not include secrets or sensitive data",
      detail: "Keep out credentials, financial records, health data, and unnecessary personal information.",
    },
    {
      label: "Storage will stay limited",
      detail: "When uploads launch, files should be stored only to support intake review and removed on a short retention schedule.",
    },
  ] as const,
};

function formatBytes(bytes: number) {
  const sizeInMb = bytes / (1024 * 1024);
  return `${Number.isInteger(sizeInMb) ? sizeInMb : sizeInMb.toFixed(1)} MB`;
}

function getExtension(name: string) {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex < 0) {
    return "";
  }

  return name.slice(lastDotIndex).toLowerCase();
}

function findAllowedTypeRuleByMimeType(
  policy: IntakeAttachmentPolicy,
  mimeType: string,
) {
  return policy.allowedTypes.find((rule) => rule.mimeTypes.includes(mimeType));
}

function findAllowedTypeRuleByExtension(
  policy: IntakeAttachmentPolicy,
  extension: string,
) {
  return policy.allowedTypes.find((rule) => rule.extensions.includes(extension));
}

function findAllowedTypeRule(
  policy: IntakeAttachmentPolicy,
  mimeType: string,
  extension: string,
) {
  const matchedMimeTypeRule = mimeType ? findAllowedTypeRuleByMimeType(policy, mimeType) : undefined;
  const matchedExtensionRule = extension ? findAllowedTypeRuleByExtension(policy, extension) : undefined;

  if (mimeType && extension) {
    if (!matchedMimeTypeRule || !matchedExtensionRule) {
      return undefined;
    }

    return matchedMimeTypeRule.fileClass === matchedExtensionRule.fileClass
      ? matchedMimeTypeRule
      : undefined;
  }

  return matchedMimeTypeRule ?? matchedExtensionRule;
}

function normalizeAttachment(
  attachment: ProposedIntakeAttachment,
  policy: IntakeAttachmentPolicy,
  attachmentIndex: number,
) {
  const name = typeof attachment.name === "string" ? attachment.name.trim() : "";
  const sizeBytes = typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : Number.NaN;
  const mimeType = typeof attachment.mimeType === "string" ? attachment.mimeType.trim().toLowerCase() : "";

  if (!name || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return {
      errors: [
        {
          code: "invalid_metadata" as const,
          message: "Each attachment needs a filename and non-negative file size.",
          attachmentIndex,
        },
      ],
    };
  }

  const matchedRule = findAllowedTypeRule(policy, mimeType, getExtension(name));

  if (!matchedRule) {
    return {
      errors: [
        {
          code: "unsupported_type" as const,
          message: "Only PDF, PNG/JPEG, or plain text files are allowed for intake.",
          attachmentIndex,
        },
      ],
    };
  }

  const errors: IntakeAttachmentValidationError[] = [];

  if (sizeBytes > policy.maxSizePerFileBytes) {
    errors.push({
      code: "file_too_large",
      message: `Each file must be ${formatBytes(policy.maxSizePerFileBytes)} or smaller.`,
      attachmentIndex,
    });
  }

  return {
    normalizedAttachment: {
      name,
      sizeBytes,
      mimeType: mimeType || matchedRule.mimeTypes[0],
      fileClass: matchedRule.fileClass,
    },
    errors,
  };
}

export function validateIntakeAttachments(
  attachments: unknown,
  policy: IntakeAttachmentPolicy = INTAKE_ATTACHMENT_POLICY,
): IntakeAttachmentValidationResult {
  if (!Array.isArray(attachments)) {
    return {
      isValid: false,
      normalizedAttachments: [],
      errors: [
        {
          code: "invalid_selection",
          message: "Attachment selection must be provided as a list.",
        },
      ],
    };
  }

  const errors: IntakeAttachmentValidationError[] = [];
  const normalizedAttachments: NormalizedIntakeAttachment[] = [];

  if (!policy.uploadsEnabled) {
    return {
      isValid: attachments.length === 0,
      normalizedAttachments: [],
      errors:
        attachments.length === 0
          ? []
          : [
              {
                code: "invalid_selection",
                message: "Attachments are currently disabled for intake. Remove the selected files and try again.",
              },
            ],
    };
  }

  if (attachments.length > policy.maxFileCount) {
    errors.push({
      code: "too_many_files",
      message: `Select up to ${policy.maxFileCount} files for intake.`,
    });
  }

  attachments.forEach((attachment, attachmentIndex) => {
    if (!attachment || typeof attachment !== "object") {
      errors.push({
        code: "invalid_metadata",
        message: "Each attachment needs valid metadata before it can be checked.",
        attachmentIndex,
      });
      return;
    }

    const result = normalizeAttachment(
      attachment as ProposedIntakeAttachment,
      policy,
      attachmentIndex,
    );

    if (result.normalizedAttachment) {
      normalizedAttachments.push(result.normalizedAttachment);
    }

    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  });

  const totalSizeBytes = normalizedAttachments.reduce((total, attachment) => {
    return total + attachment.sizeBytes;
  }, 0);

  if (totalSizeBytes > policy.maxTotalUploadBytes) {
    errors.push({
      code: "total_size_exceeded",
      message: `Total attachments must stay within ${formatBytes(policy.maxTotalUploadBytes)}.`,
    });
  }

  return {
    isValid: errors.length === 0,
    normalizedAttachments,
    errors,
  };
}

export function summarizeIntakeAttachmentPolicy(
  policy: IntakeAttachmentPolicy = INTAKE_ATTACHMENT_POLICY,
) {
  const allowedTypes = policy.allowedTypes.map((rule) => rule.label).join(", ");

  return [
    "Attachments are coming soon for first-run intake. Uploads are not enabled yet.",
    `Plan for up to ${policy.maxFileCount} files, ${formatBytes(policy.maxSizePerFileBytes)} each, and ${formatBytes(policy.maxTotalUploadBytes)} total.`,
    `When intake uploads launch, accepted files will stay conservative: ${allowedTypes}.`,
    `Blocked for intake: ${policy.blockedContentClasses.join("; ")}.`,
    ...policy.privacyRules.map((rule) => `${rule.label}: ${rule.detail}`),
  ];
}
