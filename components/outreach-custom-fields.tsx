import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

const FIELD_MAPPINGS = [
  { field: 'custom92', label: 'Subject line' },
  { field: 'custom93', label: 'Email body 1 (initial)' },
  { field: 'custom94', label: 'Email body 2 (follow-up 1)' },
  { field: 'custom95', label: 'Email body 3 (follow-up 2)' },
];

export function OutreachCustomFields() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outreach Custom Fields</CardTitle>
        <CardDescription>
          Generated email content is stored on each prospect using these custom
          fields. Make sure they exist in your Outreach account and are
          referenced in your sequence templates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Field</th>
                <th className="px-3 py-2 text-left font-medium">Content</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_MAPPINGS.map(({ field, label }) => (
                <tr key={field} className="border-t">
                  <td className="px-3 py-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {`{{${field}}}`}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
