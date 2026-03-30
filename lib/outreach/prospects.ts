import { outreachFetch } from './client';

interface UpsertProspectParams {
  email: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  company?: string;
}

export async function upsertProspect(
  params: UpsertProspectParams,
): Promise<number> {
  // Try to find existing prospect by email
  const searchRes = (await outreachFetch(
    `/api/v2/prospects?filter[emails]=${encodeURIComponent(params.email)}`,
  )) as { data: { id: number }[] };

  if (searchRes.data?.length > 0) {
    return searchRes.data[0]!.id;
  }

  // Create new prospect
  const createRes = (await outreachFetch('/api/v2/prospects', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'prospect',
        attributes: {
          emails: [params.email],
          firstName: params.firstName,
          lastName: params.lastName || undefined,
          title: params.title || undefined,
          company: params.company || undefined,
        },
      },
    }),
  })) as { data: { id: number } };

  return createRes.data.id;
}

export async function addProspectToSequence(params: {
  prospectId: number;
  sequenceId: number;
  mailboxId?: number | null;
}): Promise<number> {
  const relationships: Record<string, unknown> = {
    prospect: { data: { type: 'prospect', id: params.prospectId } },
    sequence: { data: { type: 'sequence', id: params.sequenceId } },
  };

  if (params.mailboxId) {
    relationships.mailbox = {
      data: { type: 'mailbox', id: params.mailboxId },
    };
  }

  const res = (await outreachFetch('/api/v2/sequenceStates', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'sequenceState',
        relationships,
      },
    }),
  })) as { data: { id: number } };

  return res.data.id;
}

const CUSTOM_FIELD_SUBJECT = 92;
const CUSTOM_FIELD_BODIES = [93, 94, 95] as const;

export async function setProspectCustomFields(params: {
  prospectId: number;
  subject: string;
  bodies: string[];
}): Promise<void> {
  const customFields: Record<string, string> = {
    [`custom${CUSTOM_FIELD_SUBJECT}`]: params.subject,
  };

  params.bodies.forEach((body, i) => {
    const field = CUSTOM_FIELD_BODIES[i];
    if (field !== undefined) {
      customFields[`custom${field}`] = body;
    }
  });

  await outreachFetch(`/api/v2/prospects/${params.prospectId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'prospect',
        id: params.prospectId,
        attributes: customFields,
      },
    }),
  });
}
