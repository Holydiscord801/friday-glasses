import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { subscribe, getState, setPage } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { Badge } from 'even-toolkit/web/badge';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { SectionHeader } from 'even-toolkit/web/section-header';
import { StatusDot } from 'even-toolkit/web/status-dot';
import { Divider } from 'even-toolkit/web/divider';
import { GlassesPreview } from '../components/GlassesPreview';
import { useEffect } from 'react';

export function HomePage() {
  const state = useSyncExternalStore(subscribe, getState);
  const navigate = useNavigate();
  const { glasses } = state;

  useEffect(() => {
    setPage('home');
  }, []);

  return (
    <Page>
      <ScreenHeader title="Friday" subtitle="AI Glasses Assistant" />

      <div className="flex flex-col gap-4 mt-4">
        {/* Glasses Preview */}
        <Card variant="elevated" padding="default">
          <GlassesPreview />
        </Card>

        {/* Status Card */}
        <Card variant="default" padding="default">
          <SectionHeader title="Device Status" />
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-text-dim text-sm">Connection</span>
              <div className="flex items-center gap-2">
                <StatusDot connected={glasses.connected} />
                <Badge variant={glasses.connected ? 'positive' : 'negative'}>
                  {glasses.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
            <Divider variant="default" />
            <div className="flex items-center justify-between">
              <span className="text-text-dim text-sm">Battery</span>
              <Badge variant={glasses.battery > 20 ? 'neutral' : 'negative'}>
                {glasses.battery}%
              </Badge>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <div className="flex flex-col gap-2">
          <Button
            variant="highlight"
            size="lg"
            onClick={() => navigate('/conversation')}
          >
            Start Conversation
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => navigate('/teleprompter')}
          >
            Open Teleprompter
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => navigate('/notes')}
          >
            View Notes
          </Button>
        </div>
      </div>
    </Page>
  );
}
