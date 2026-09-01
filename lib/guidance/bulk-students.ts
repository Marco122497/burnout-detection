export type BulkStudentDraft = {
  rowNumber: number;
  student_number: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  year_level: number;
  section: string | null;
  program: string | null;
  errors: string[];
};

const HEADER_ALIASES: Record<string, keyof BulkStudentDraft | "name" | "skip"> = {
  "student no": "student_number",
  "student no.": "student_number",
  "student number": "student_number",
  studentno: "student_number",
  student: "name",
  name: "name",
  email: "email",
  "academic level": "year_level",
  "year level": "year_level",
  year: "year_level",
  section: "section",
  program: "program",
  course: "program",
  status: "skip",
  "enrolled at": "skip",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(sample: string) {
  const firstLine = sample.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs >= commas && tabs > 0 ? "\t" : ",";
}

/** "Longcob, Cressyl Jane Navasca" → last / first / middle */
export function parseStudentName(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      first_name: "",
      middle_name: null as string | null,
      last_name: "",
      suffix: null as string | null,
    };
  }

  if (trimmed.includes(",")) {
    const [lastPart, rest] = trimmed.split(",", 2).map((part) => part.trim());
    const nameParts = (rest ?? "").split(/\s+/).filter(Boolean);
    return {
      first_name: nameParts[0] ?? "",
      middle_name:
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
      last_name: lastPart,
      suffix: null,
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      first_name: parts[0],
      middle_name: null,
      last_name: parts[0],
      suffix: null,
    };
  }

  return {
    first_name: parts[0],
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(" ") : null,
    last_name: parts[parts.length - 1],
    suffix: null,
  };
}

export function parseYearLevel(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return NaN;

  const digitMatch = value.match(/(\d)/);
  if (digitMatch) {
    const level = Number(digitMatch[1]);
    if (level >= 1 && level <= 4) return level;
  }

  if (value.includes("first") || value === "1") return 1;
  if (value.includes("second") || value === "2") return 2;
  if (value.includes("third") || value === "3") return 3;
  if (value.includes("fourth") || value === "4") return 4;

  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 4
    ? asNumber
    : NaN;
}

function mapHeaders(headers: string[]) {
  const mapping: Partial<Record<number, keyof BulkStudentDraft | "name">> = {};

  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (!key || key === "skip") return;
    mapping[index] = key;
  });

  return mapping;
}

function validateDraft(draft: BulkStudentDraft): BulkStudentDraft {
  const errors = [...draft.errors];

  if (!draft.student_number) errors.push("Student number is required.");
  if (!draft.email) errors.push("Email is required.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    errors.push("Email format is invalid.");
  }
  if (!draft.first_name || !draft.last_name) {
    errors.push("Student name could not be parsed.");
  }
  if (Number.isNaN(draft.year_level)) {
    errors.push("Academic level is invalid.");
  }

  return { ...draft, errors };
}

export function parseBulkStudentText(text: string): BulkStudentDraft[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const delimiter = detectDelimiter(trimmed);
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstCells = parseDelimitedLine(lines[0], delimiter);
  const headerMapping = mapHeaders(firstCells);
  const hasHeader = Object.keys(headerMapping).length >= 3;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const cells = parseDelimitedLine(line, delimiter);
    const draft: BulkStudentDraft = {
      rowNumber: hasHeader ? index + 2 : index + 1,
      student_number: "",
      email: "",
      first_name: "",
      middle_name: null,
      last_name: "",
      suffix: null,
      year_level: NaN,
      section: null,
      program: null,
      errors: [],
    };

    if (hasHeader) {
      for (const [cellIndex, field] of Object.entries(headerMapping)) {
        const value = cells[Number(cellIndex)] ?? "";
        if (field === "name") {
          const parsed = parseStudentName(value);
          draft.first_name = parsed.first_name;
          draft.middle_name = parsed.middle_name;
          draft.last_name = parsed.last_name;
          draft.suffix = parsed.suffix;
        } else if (field === "year_level") {
          draft.year_level = parseYearLevel(value);
        } else if (field === "student_number") {
          draft.student_number = value.trim();
        } else if (field === "email") {
          draft.email = value.trim().toLowerCase();
        } else if (field === "section") {
          draft.section = value.trim() || null;
        } else if (field === "program") {
          draft.program = value.trim() || null;
        }
      }
    } else {
      draft.student_number = (cells[0] ?? "").trim();
      const parsed = parseStudentName(cells[1] ?? "");
      draft.first_name = parsed.first_name;
      draft.middle_name = parsed.middle_name;
      draft.last_name = parsed.last_name;
      draft.email = (cells[2] ?? "").trim().toLowerCase();
      draft.year_level = parseYearLevel(cells[3] ?? "");
      draft.section = (cells[4] ?? "").trim() || null;
      draft.program = (cells[5] ?? "").trim() || null;
    }

    return validateDraft(draft);
  });
}

const EXISTING_EMAIL_ERROR = "Email already registered.";
const EXISTING_STUDENT_NUMBER_ERROR = "Student number already registered.";
const DUPLICATE_EMAIL_ERROR = "Duplicate email in this paste.";
const DUPLICATE_STUDENT_NUMBER_ERROR = "Duplicate student number in this paste.";

export function isSkippableBulkConflict(error: string) {
  return (
    error === EXISTING_EMAIL_ERROR || error === EXISTING_STUDENT_NUMBER_ERROR
  );
}

export function enrichBulkDrafts(
  drafts: BulkStudentDraft[],
  options?: {
    existingEmails?: Iterable<string>;
    existingStudentNumbers?: Iterable<string>;
  }
): BulkStudentDraft[] {
  const existingEmails = new Set(
    [...(options?.existingEmails ?? [])].map((email) => email.toLowerCase())
  );
  const existingStudentNumbers = new Set(options?.existingStudentNumbers ?? []);

  const emailCounts = new Map<string, number>();
  const studentNumberCounts = new Map<string, number>();

  for (const draft of drafts) {
    if (draft.email) {
      emailCounts.set(draft.email, (emailCounts.get(draft.email) ?? 0) + 1);
    }
    if (draft.student_number) {
      studentNumberCounts.set(
        draft.student_number,
        (studentNumberCounts.get(draft.student_number) ?? 0) + 1
      );
    }
  }

  return drafts.map((draft) => {
    const errors = [...draft.errors];

    if (draft.email && (emailCounts.get(draft.email) ?? 0) > 1) {
      errors.push(DUPLICATE_EMAIL_ERROR);
    }
    if (
      draft.student_number &&
      (studentNumberCounts.get(draft.student_number) ?? 0) > 1
    ) {
      errors.push(DUPLICATE_STUDENT_NUMBER_ERROR);
    }
    if (draft.email && existingEmails.has(draft.email)) {
      errors.push(EXISTING_EMAIL_ERROR);
    }
    if (
      draft.student_number &&
      existingStudentNumbers.has(draft.student_number)
    ) {
      errors.push(EXISTING_STUDENT_NUMBER_ERROR);
    }

    return { ...draft, errors: [...new Set(errors)] };
  });
}

export function getImportableBulkDrafts(
  drafts: BulkStudentDraft[],
  skipExisting: boolean
) {
  return drafts.filter((row) => {
    const blockingErrors = skipExisting
      ? row.errors.filter((error) => !isSkippableBulkConflict(error))
      : row.errors;
    return blockingErrors.length === 0;
  });
}
