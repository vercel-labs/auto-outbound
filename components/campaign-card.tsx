import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Campaign } from '@/db/schema';

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  paused: 'outline',
  archived: 'outline',
};

interface CampaignCardProps {
  campaign: Campaign;
  contactCount?: number;
}

export function CampaignCard({ campaign, contactCount }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <Badge variant={statusColors[campaign.status] || 'secondary'}>
              {campaign.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            {campaign.description && <p>{campaign.description}</p>}
            <div className="flex gap-4 text-xs pt-2">
              <span>
                {contactCount !== undefined
                  ? `${contactCount} contacts`
                  : '...'}
              </span>
              <span>
                {campaign.numberOfFollowUps} follow-up
                {campaign.numberOfFollowUps !== 1 ? 's' : ''}
              </span>
              {campaign.researchEnabled && <span>Research on</span>}
              {campaign.outreachSequenceId && <span>Outreach linked</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
