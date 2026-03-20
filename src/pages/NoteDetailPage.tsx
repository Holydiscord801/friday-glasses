import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useParams, useNavigate } from 'react-router';
import { subscribe, getState, setPage, deleteNote } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { EmptyState } from 'even-toolkit/web/empty-state';

export function NoteDetailPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    setPage('note-detail');
  }, []);

  const note = state.notes.find((n) => n.id === id);

  function handleDelete() {
    if (!note) return;
    deleteNote(note.id);
    navigate('/notes');
  }

  if (!note) {
    return (
      <Page>
        <ScreenHeader title="Note Not Found" />
        <div className="mt-4">
          <EmptyState
            title="Note not found"
            description="This note may have been deleted."
            action={{
              label: 'Back to Notes',
              onClick: () => navigate('/notes'),
            }}
          />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader
        title={note.title}
        subtitle={new Date(note.createdAt).toLocaleString()}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
            Back
          </Button>
        }
      />

      <div className="flex flex-col gap-4 mt-4">
        {/* Note Content */}
        <Card variant="elevated" padding="lg">
          {note.content ? (
            <p className="text-text text-sm leading-relaxed whitespace-pre-wrap m-0">
              {note.content}
            </p>
          ) : (
            <p className="text-text-muted text-sm italic m-0">No content</p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="default"
            onClick={() => navigate('/notes')}
          >
            Back to Notes
          </Button>
          <Button
            variant="danger"
            size="default"
            onClick={handleDelete}
          >
            Delete Note
          </Button>
        </div>
      </div>
    </Page>
  );
}
