import { CampaignForm } from '@/components/campaign-form';

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your email campaign
        </p>
      </div>
      <CampaignForm />
    </div>
  );
}
