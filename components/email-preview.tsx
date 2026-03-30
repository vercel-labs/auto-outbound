import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Contact } from '@/db/schema';

interface EmailPreviewProps {
  contact: Contact;
  onClose: () => void;
}

export function EmailPreview({ contact, onClose }: EmailPreviewProps) {
  const bodies = [
    contact.generatedBody1,
    contact.generatedBody2,
    contact.generatedBody3,
  ].filter(Boolean);

  return (
    <Card className="w-[480px] shrink-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">
            {contact.firstName} {contact.lastName || ''}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {contact.email} - {contact.company}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
              className="text-sm prose prose-sm max-w-none border rounded-md p-3 bg-muted/30"
              dangerouslySetInnerHTML={{ __html: body! }}
            />
          </div>
        ))}

        {contact.outreachProspectId && (
          <p className="text-xs text-muted-foreground">
            Outreach Prospect ID: {contact.outreachProspectId}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
