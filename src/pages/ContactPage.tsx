import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribe, getState, setPage, setContact } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { Input } from 'even-toolkit/web/input';
import { Textarea } from 'even-toolkit/web/textarea';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { SectionHeader } from 'even-toolkit/web/section-header';
import { EmptyState } from 'even-toolkit/web/empty-state';
import { Divider } from 'even-toolkit/web/divider';

export function ContactPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [context, setContext] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');

  useEffect(() => {
    setPage('contact');
  }, []);

  function handleCreate() {
    if (!name.trim()) return;
    const points = talkingPoints
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setContact({
      name: name.trim(),
      title: title.trim(),
      company: company.trim(),
      context: context.trim(),
      talking_points: points,
    });

    resetForm();
  }

  function handleClear() {
    setContact(null);
  }

  function resetForm() {
    setName('');
    setTitle('');
    setCompany('');
    setContext('');
    setTalkingPoints('');
    setShowForm(false);
  }

  const { contact } = state;

  return (
    <Page>
      <ScreenHeader
        title="Contact Card"
        subtitle="Push via POST /api/contact"
      />

      <div className="flex flex-col gap-4 mt-4">
        {contact ? (
          <>
            {/* Contact Display */}
            <Card variant="elevated" padding="lg">
              <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-text m-0">
                  {contact.name}
                </h2>
                {(contact.title || contact.company) && (
                  <p className="text-sm text-text-dim m-0">
                    {contact.title}
                    {contact.title && contact.company ? ' at ' : ''}
                    {contact.company}
                  </p>
                )}

                <Divider variant="spaced" />

                {contact.context && (
                  <div>
                    <SectionHeader title="Context" />
                    <p className="text-sm text-text-dim leading-relaxed m-0 mt-1">
                      {contact.context}
                    </p>
                  </div>
                )}

                {contact.talking_points.length > 0 && (
                  <div>
                    <SectionHeader title="Talking Points" />
                    <ul className="text-sm text-text-dim leading-relaxed m-0 mt-1 pl-4 flex flex-col gap-1">
                      {contact.talking_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Button variant="danger" size="default" onClick={handleClear}>
              Clear Contact
            </Button>
          </>
        ) : (
          <>
            {!showForm && (
              <EmptyState
                title="No contact card"
                description="Friday can push a contact card before your meetings. Create one manually or push via the API."
                action={{
                  label: 'Create Contact',
                  onClick: () => setShowForm(true),
                }}
              />
            )}
          </>
        )}

        {/* Manual Form */}
        {(showForm && !contact) && (
          <>
            <SectionHeader title="Create Contact Card" />
            <Card variant="default" padding="default">
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Job title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <Textarea
                  placeholder="Context (background info, how you know them...)"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                />
                <Textarea
                  placeholder="Talking points (one per line)"
                  value={talkingPoints}
                  onChange={(e) => setTalkingPoints(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    variant="highlight"
                    size="default"
                    onClick={handleCreate}
                    disabled={!name.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* API Info */}
        <Card variant="default" padding="sm">
          <p className="text-xs text-text-muted m-0">
            Push contact cards programmatically:{' '}
            <code className="text-text-dim bg-surface-light px-1 py-0.5 rounded text-xs">
              POST /api/contact
            </code>
          </p>
        </Card>
      </div>
    </Page>
  );
}
