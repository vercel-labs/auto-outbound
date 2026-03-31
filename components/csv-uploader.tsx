'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseCsv, type CsvContact } from '@/lib/csv';
import { addAndProcessContacts } from '@/services/contacts';
import { queryKeys } from '@/lib/query-keys';

interface CsvUploaderProps {
  campaignId: number;
}

export function CsvUploader({ campaignId }: CsvUploaderProps) {
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<CsvContact[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: (contacts: CsvContact[]) =>
      addAndProcessContacts(campaignId, contacts),
    onSuccess: () => {
      setParsed(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.contacts(campaignId),
      });
    },
  });

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCsv(text);
      setParsed(result.contacts);
      setErrors(result.errors);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  function handleUpload() {
    if (!parsed || parsed.length === 0) return;
    uploadMutation.mutate(parsed);
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/30'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop CSV file here'
            : 'Drag and drop a CSV file, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Required columns: email, firstName, company. Optional: lastName,
          title, notes
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Validation errors:
          </p>
          <ul className="text-sm text-destructive mt-1 list-disc list-inside">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed && parsed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {parsed.length} contact{parsed.length !== 1 ? 's' : ''} ready to
            upload
          </p>
          <div className="border rounded-md overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-1.5 text-left">Email</th>
                  <th className="px-3 py-1.5 text-left">Name</th>
                  <th className="px-3 py-1.5 text-left">Company</th>
                  <th className="px-3 py-1.5 text-left">Title</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5">{c.email}</td>
                    <td className="px-3 py-1.5">
                      {c.firstName} {c.lastName || ''}
                    </td>
                    <td className="px-3 py-1.5">{c.company}</td>
                    <td className="px-3 py-1.5">{c.title || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 10 && (
              <p className="text-xs text-muted-foreground p-2 text-center">
                ...and {parsed.length - 10} more
              </p>
            )}
          </div>
          <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending
              ? 'Uploading...'
              : `Upload ${parsed.length} contacts`}
          </Button>
        </div>
      )}
    </div>
  );
}
