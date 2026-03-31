'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import type { Contact } from '@/db/schema';

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  researching: 'secondary',
  generating: 'secondary',
  sending: 'secondary',
  completed: 'default',
  failed: 'destructive',
};

interface ContactTableProps {
  contacts: Contact[];
}

export function ContactTable({ contacts }: ContactTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No contacts yet. Upload a CSV to get started.
      </p>
    );
  }

  return (
    <div className="border rounded-md overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 w-8" />
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Email</th>
            <th className="px-3 py-2 text-left font-medium">Company</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const isExpanded = expandedId === contact.id;
            const isClickable =
              contact.status === 'completed' || contact.status === 'failed';

            return (
              <ContactRow
                key={contact.id}
                contact={contact}
                isExpanded={isExpanded}
                isClickable={isClickable}
                onToggle={() =>
                  setExpandedId(isExpanded ? null : contact.id)
                }
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ContactRow({
  contact,
  isExpanded,
  isClickable,
  onToggle,
}: {
  contact: Contact;
  isExpanded: boolean;
  isClickable: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-t ${isClickable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={isClickable ? onToggle : undefined}
      >
        <td className="px-3 py-2 text-muted-foreground">
          {isClickable &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ))}
        </td>
        <td className="px-3 py-2">
          {contact.firstName} {contact.lastName || ''}
        </td>
        <td className="px-3 py-2 text-muted-foreground">{contact.email}</td>
        <td className="px-3 py-2">{contact.company}</td>
        <td className="px-3 py-2">
          <Badge variant={statusVariant[contact.status] || 'outline'}>
            {contact.status}
          </Badge>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t">
          <td colSpan={5} className="p-0">
            <ContactDetail contact={contact} />
          </td>
        </tr>
      )}
    </>
  );
}

function ContactDetail({ contact }: { contact: Contact }) {
  if (contact.status === 'failed') {
    return <FailedDetail contact={contact} />;
  }

  if (contact.status === 'completed') {
    return <CompletedDetail contact={contact} />;
  }

  return null;
}

function FailedDetail({ contact }: { contact: Contact }) {
  const errorData = (contact.data as Record<string, unknown>)?.error as
    | { message?: string; failedAt?: string }
    | undefined;

  return (
    <div className="bg-destructive/5 px-6 py-4 space-y-2">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Processing Failed</span>
      </div>
      <p className="text-sm text-destructive/90">
        {contact.errorMessage || 'Unknown error'}
      </p>
      {errorData?.failedAt && (
        <p className="text-xs text-muted-foreground">
          Failed at {new Date(errorData.failedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function CompletedDetail({ contact }: { contact: Contact }) {
  const bodies = [
    contact.generatedBody1,
    contact.generatedBody2,
    contact.generatedBody3,
  ].filter(Boolean);

  return (
    <div className="bg-muted/30 px-6 py-4 space-y-4">
      {contact.generatedSubject && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Subject
          </p>
          <p className="text-sm font-medium">{contact.generatedSubject}</p>
        </div>
      )}

      {bodies.map((body, i) => (
        <div key={i}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Email {i + 1}
          </p>
          <div
            className="text-sm prose prose-sm max-w-none border rounded-md p-3 bg-background"
            dangerouslySetInnerHTML={{ __html: body! }}
          />
        </div>
      ))}

      {contact.outreachProspectId && (
        <p className="text-xs text-muted-foreground">
          Outreach Prospect ID: {contact.outreachProspectId}
        </p>
      )}

      {bodies.length === 0 && !contact.generatedSubject && (
        <p className="text-sm text-muted-foreground">
          No generated emails available.
        </p>
      )}
    </div>
  );
}
