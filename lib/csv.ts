import { parse } from 'csv-parse/sync';

export interface CsvContact {
  email: string;
  firstName: string;
  lastName?: string;
  company: string;
  title?: string;
  notes?: string;
}

const REQUIRED_COLUMNS = ['email', 'firstName', 'company'] as const;

const COLUMN_ALIASES: Record<string, string> = {
  email: 'email',
  email_address: 'email',
  emailaddress: 'email',
  firstname: 'firstName',
  first_name: 'firstName',
  first: 'firstName',
  lastname: 'lastName',
  last_name: 'lastName',
  last: 'lastName',
  company: 'company',
  company_name: 'company',
  companyname: 'company',
  organization: 'company',
  title: 'title',
  job_title: 'title',
  jobtitle: 'title',
  role: 'title',
  notes: 'notes',
  note: 'notes',
  context: 'notes',
};

export function parseCsv(csvText: string): {
  contacts: CsvContact[];
  errors: string[];
} {
  const errors: string[] = [];

  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (e) {
    return { contacts: [], errors: [`CSV parse error: ${e}`] };
  }

  if (records.length === 0) {
    return { contacts: [], errors: ['CSV file is empty'] };
  }

  // Map headers to normalized field names
  const rawHeaders = Object.keys(records[0]!);
  const headerMap: Record<string, string> = {};
  for (const header of rawHeaders) {
    const normalized = header.toLowerCase().replace(/[^a-z_]/g, '');
    if (COLUMN_ALIASES[normalized]) {
      headerMap[header] = COLUMN_ALIASES[normalized];
    }
  }

  // Validate required columns
  const mappedFields = new Set(Object.values(headerMap));
  for (const required of REQUIRED_COLUMNS) {
    if (!mappedFields.has(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  if (errors.length > 0) {
    return { contacts: [], errors };
  }

  const contacts: CsvContact[] = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i]!;
    const mapped: Record<string, string> = {};

    for (const [rawHeader, fieldName] of Object.entries(headerMap)) {
      if (row[rawHeader]) {
        mapped[fieldName] = row[rawHeader];
      }
    }

    if (!mapped.email || !mapped.firstName || !mapped.company) {
      errors.push(
        `Row ${i + 2}: missing required fields (email, firstName, company)`,
      );
      continue;
    }

    contacts.push({
      email: mapped.email,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      company: mapped.company,
      title: mapped.title,
      notes: mapped.notes,
    });
  }

  return { contacts, errors };
}
