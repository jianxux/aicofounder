import {
  INTAKE_ATTACHMENT_POLICY,
  type IntakeAttachmentPolicy,
  summarizeIntakeAttachmentPolicy,
  validateIntakeAttachments,
} from "@/lib/intake-attachment-policy";

const ENABLED_POLICY: IntakeAttachmentPolicy = {
  ...INTAKE_ATTACHMENT_POLICY,
  uploadsEnabled: true,
};

describe("intake attachment policy", () => {
  it("accepts conservative intake file types within size limits", () => {
    const result = validateIntakeAttachments(
      [
        {
          name: "brief.pdf",
          sizeBytes: 1024,
          mimeType: "application/pdf",
        },
        {
          name: "screenshot.PNG",
          sizeBytes: 2048,
          mimeType: "image/png",
        },
        {
          name: "notes.txt",
          sizeBytes: 512,
          mimeType: "",
        },
      ],
      ENABLED_POLICY,
    );

    expect(result).toEqual({
      isValid: true,
      normalizedAttachments: [
        {
          name: "brief.pdf",
          sizeBytes: 1024,
          mimeType: "application/pdf",
          fileClass: "pdf",
        },
        {
          name: "screenshot.PNG",
          sizeBytes: 2048,
          mimeType: "image/png",
          fileClass: "image",
        },
        {
          name: "notes.txt",
          sizeBytes: 512,
          mimeType: "text/plain",
          fileClass: "text",
        },
      ],
      errors: [],
    });
  });

  it("rejects blocked or unsupported file classes", () => {
    const result = validateIntakeAttachments(
      [
        {
          name: "evidence.zip",
          sizeBytes: 1024,
          mimeType: "application/zip",
        },
      ],
      ENABLED_POLICY,
    );

    expect(result.isValid).toBe(false);
    expect(result.normalizedAttachments).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "unsupported_type",
        attachmentIndex: 0,
      }),
    ]);
  });

  it("handles filenames without extensions when future metadata is incomplete", () => {
    const accepted = validateIntakeAttachments(
      [
        {
          name: "intake-brief",
          sizeBytes: 2048,
          mimeType: "application/pdf",
        },
      ],
      ENABLED_POLICY,
    );
    const rejected = validateIntakeAttachments(
      [
        {
          name: "mystery-file",
          sizeBytes: 2048,
          mimeType: "",
        },
      ],
      ENABLED_POLICY,
    );

    expect(accepted).toEqual({
      isValid: true,
      normalizedAttachments: [
        {
          name: "intake-brief",
          sizeBytes: 2048,
          mimeType: "application/pdf",
          fileClass: "pdf",
        },
      ],
      errors: [],
    });
    expect(rejected.isValid).toBe(false);
    expect(rejected.errors).toEqual([
      expect.objectContaining({
        code: "unsupported_type",
        attachmentIndex: 0,
      }),
    ]);
  });

  it("rejects selections that exceed file count and total size limits", () => {
    const result = validateIntakeAttachments(
      [
        { name: "one.pdf", sizeBytes: 4 * 1024 * 1024, mimeType: "application/pdf" },
        { name: "two.pdf", sizeBytes: 4 * 1024 * 1024, mimeType: "application/pdf" },
        { name: "three.pdf", sizeBytes: 3 * 1024 * 1024, mimeType: "application/pdf" },
        { name: "four.pdf", sizeBytes: 1024, mimeType: "application/pdf" },
      ],
      ENABLED_POLICY,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "too_many_files" }),
        expect.objectContaining({ code: "total_size_exceeded" }),
      ]),
    );
  });

  it("rejects files that exceed the per-file size limit", () => {
    const result = validateIntakeAttachments(
      [
        {
          name: "oversized.jpg",
          sizeBytes: INTAKE_ATTACHMENT_POLICY.maxSizePerFileBytes + 1,
          mimeType: "image/jpeg",
        },
      ],
      ENABLED_POLICY,
    );

    expect(result.isValid).toBe(false);
    expect(result.normalizedAttachments).toEqual([
      expect.objectContaining({
        name: "oversized.jpg",
        fileClass: "image",
      }),
    ]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "file_too_large",
        attachmentIndex: 0,
      }),
    ]);
  });

  it("stays resilient to missing or invalid future metadata", () => {
    const invalidSelection = validateIntakeAttachments("not-an-array");
    const invalidMetadata = validateIntakeAttachments(
      [
        null,
        { name: "", sizeBytes: 100, mimeType: "application/pdf" },
        { name: "brief.pdf", sizeBytes: -10, mimeType: "application/pdf" },
      ],
      ENABLED_POLICY,
    );

    expect(invalidSelection).toEqual({
      isValid: false,
      normalizedAttachments: [],
      errors: [
        {
          code: "invalid_selection",
          message: "Attachment selection must be provided as a list.",
        },
      ],
    });
    expect(invalidMetadata.isValid).toBe(false);
    expect(invalidMetadata.normalizedAttachments).toEqual([]);
    expect(invalidMetadata.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_metadata", attachmentIndex: 0 }),
        expect.objectContaining({ code: "invalid_metadata", attachmentIndex: 1 }),
        expect.objectContaining({ code: "invalid_metadata", attachmentIndex: 2 }),
      ]),
    );
  });

  it("rejects non-empty selections when uploads are disabled and allows empty arrays", () => {
    const accepted = validateIntakeAttachments([]);
    const rejected = validateIntakeAttachments([
      {
        name: "brief.pdf",
        sizeBytes: 1024,
        mimeType: "application/pdf",
      },
    ]);

    expect(accepted).toEqual({
      isValid: true,
      normalizedAttachments: [],
      errors: [],
    });
    expect(rejected).toEqual({
      isValid: false,
      normalizedAttachments: [],
      errors: [
        {
          code: "invalid_selection",
          message: "Attachments are currently disabled for intake. Remove the selected files and try again.",
        },
      ],
    });
  });

  it("rejects MIME and extension mismatches that spoof allowed types", () => {
    const result = validateIntakeAttachments(
      [
        {
          name: "virus.exe",
          sizeBytes: 4096,
          mimeType: "image/png",
        },
      ],
      ENABLED_POLICY,
    );

    expect(result).toEqual({
      isValid: false,
      normalizedAttachments: [],
      errors: [
        expect.objectContaining({
          code: "unsupported_type",
          attachmentIndex: 0,
        }),
      ],
    });
  });

  it("summarizes limits, blocked classes, and privacy guidance for UI copy", () => {
    expect(summarizeIntakeAttachmentPolicy()).toEqual([
      "Attachments are coming soon for first-run intake. Uploads are not enabled yet.",
      "Plan for up to 3 files, 5 MB each, and 10 MB total.",
      "When intake uploads launch, accepted files will stay conservative: PDFs, PNG or JPEG images, Plain text notes.",
      "Blocked for intake: archives and compressed bundles; executables, scripts, and installers; audio or video recordings; spreadsheets, slide decks, and rich office documents; password-protected or encrypted files; secrets, credentials, or regulated personal data.",
      "Use only what helps intake: Share only source material needed to frame the project brief.",
      "Do not include secrets or sensitive data: Keep out credentials, financial records, health data, and unnecessary personal information.",
      "Storage will stay limited: When uploads launch, files should be stored only to support intake review and removed on a short retention schedule.",
    ]);
  });
});
