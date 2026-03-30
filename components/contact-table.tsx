'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailPreview } from '@/components/email-preview';
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No contacts yet. Upload a CSV to get started.
      </p>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 border rounded-md overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Company</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t hover:bg-muted/50">
                <td className="px-3 py-2">
                  {contact.firstName} {contact.lastName || ''}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {contact.email}
                </td>
                <td className="px-3 py-2">{contact.company}</td>
                <td className="px-3 py-2">
                  <Badge variant={statusVariant[contact.status] || 'outline'}>
                    {contact.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {contact.generatedSubject && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContact(contact)}
                    >
                      View email
                    </Button>
                  )}
                  {contact.errorMessage && (
                    <span
                      className="text-xs text-destructive cursor-help"
                      title={contact.errorMessage}
                    >
                      Error
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedContact && (
        <EmailPreview
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
