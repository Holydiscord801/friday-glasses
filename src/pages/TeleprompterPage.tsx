import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribe, getState, setTeleprompter, clearTeleprompter, setPage } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { Textarea } from 'even-toolkit/web/textarea';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { SectionHeader } from 'even-toolkit/web/section-header';
import { EmptyState } from 'even-toolkit/web/empty-state';
import { GlassesPreview } from '../components/GlassesPreview';

export function TeleprompterPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState(state.teleprompter.content);

  useEffect(() => {
    setPage('teleprompter');
  }, []);

  // Sync draft when content changes externally (e.g. via API)
  useEffect(() => {
    setDraft(state.teleprompter.content);
  }, [state.teleprompter.content]);

  function handleSend() {
    if (!draft.trim()) return;
    setTeleprompter(draft.trim());
  }

  function handleClear() {
    clearTeleprompter();
    setDraft('');
  }

  return (
    <Page>
      <ScreenHeader title="Teleprompter" subtitle="Push text to your glasses display" />

      <div className="flex flex-col gap-4 mt-4">
        {/* Glasses Preview */}
        <Card variant="elevated" padding="default">
          <GlassesPreview />
        </Card>

        {/* Editor */}
        <SectionHeader title="Content Editor" />
        <Textarea
          placeholder="Enter teleprompter content..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
        />

        <div className="flex gap-2">
          <Button
            variant="highlight"
            size="default"
            onClick={handleSend}
            disabled={!draft.trim()}
          >
            Send to Glasses
          </Button>
          <Button
            variant="ghost"
            size="default"
            onClick={handleClear}
            disabled={!state.teleprompter.content}
          >
            Clear
          </Button>
        </div>

        {/* Current Content Display */}
        <SectionHeader title="Current Content" />
        {state.teleprompter.content ? (
          <Card variant="default" padding="default">
            <pre className="text-sm text-text-dim font-mono whitespace-pre-wrap leading-relaxed m-0">
              {state.teleprompter.content}
            </pre>
          </Card>
        ) : (
          <EmptyState
            title="No content loaded"
            description="Type content above and send it to your glasses, or push content via the API."
          />
        )}

        {/* API Info */}
        <Card variant="default" padding="sm">
          <p className="text-xs text-text-muted m-0">
            Push content programmatically:{' '}
            <code className="text-text-dim bg-surface-light px-1 py-0.5 rounded text-xs">
              POST /api/teleprompter
            </code>
          </p>
        </Card>
      </div>
    </Page>
  );
}
