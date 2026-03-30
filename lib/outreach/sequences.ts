import { outreachFetch } from './client';

const CUSTOM_FIELD_SUBJECT = 92;
const CUSTOM_FIELD_BODIES = [93, 94, 95] as const;

export interface ScaffoldSequenceParams {
  name: string;
  numberOfFollowUps: number;
  intervalDays?: number;
  firstEmailManual?: boolean;
}

export interface ScaffoldSequenceResult {
  sequenceId: number;
  stepIds: number[];
  templateIds: number[];
}

export async function scaffoldOutreachSequence(
  params: ScaffoldSequenceParams,
): Promise<ScaffoldSequenceResult> {
  const totalEmails = params.numberOfFollowUps + 1;
  const intervalDays = params.intervalDays ?? 3;
  const firstEmailManual = params.firstEmailManual ?? true;

  if (totalEmails > CUSTOM_FIELD_BODIES.length) {
    throw new Error(
      `Cannot create ${totalEmails} emails: max ${CUSTOM_FIELD_BODIES.length} supported`,
    );
  }

  // 1. Create sequence
  const seqRes = (await outreachFetch('/api/v2/sequences', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'sequence',
        attributes: {
          name: params.name,
          sequenceType: 'interval',
        },
      },
    }),
  })) as { data: { id: number } };

  const sequenceId = seqRes.data.id;

  // 2. Create steps
  const stepIds: number[] = [];
  for (let i = 0; i < totalEmails; i++) {
    const isFirst = i === 0;
    const stepType =
      isFirst && firstEmailManual ? 'manual_email' : 'auto_email';
    const intervalMinutes = isFirst ? 0 : intervalDays * 1440 * i;

    const stepRes = (await outreachFetch('/api/v2/sequenceSteps', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'sequenceStep',
          attributes: {
            stepType,
            interval: intervalMinutes,
            order: i + 1,
          },
          relationships: {
            sequence: { data: { type: 'sequence', id: sequenceId } },
          },
        },
      }),
    })) as { data: { id: number } };

    stepIds.push(stepRes.data.id);
  }

  // 3. Create templates
  const templateIds: number[] = [];
  for (let i = 0; i < totalEmails; i++) {
    const bodyField = CUSTOM_FIELD_BODIES[i];
    const tplRes = (await outreachFetch('/api/v2/templates', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'template',
          attributes: {
            name: `${params.name} - Email ${i + 1}`,
            subject: `{{custom${CUSTOM_FIELD_SUBJECT}}}`,
            bodyHtml: `Hi {{#if first_name}}{{first_name}}{{else}}there{{/if}},<br><br>{{{custom${bodyField}}}}<br><br>{{sender.first_name}}`,
            toRecipients: ['{{email}}'],
          },
        },
      }),
    })) as { data: { id: number } };

    templateIds.push(tplRes.data.id);
  }

  // 4. Link templates to steps
  for (let i = 0; i < stepIds.length; i++) {
    const stepId = stepIds[i];
    const templateId = templateIds[i];
    if (stepId === undefined || templateId === undefined) continue;

    await outreachFetch('/api/v2/sequenceTemplates', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'sequenceTemplate',
          attributes: { isReply: false },
          relationships: {
            sequenceStep: { data: { type: 'sequenceStep', id: stepId } },
            template: { data: { type: 'template', id: templateId } },
          },
        },
      }),
    });
  }

  return { sequenceId, stepIds, templateIds };
}
