import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { subscribe, getState, setPage, addNote, deleteNote } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { Input } from 'even-toolkit/web/input';
import { Textarea } from 'even-toolkit/web/textarea';
import { ListItem } from 'even-toolkit/web/list-item';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { EmptyState } from 'even-toolkit/web/empty-state';
import { Divider } from 'even-toolkit/web/divider';

export function NotesPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    setPage('notes');
  }, []);

  function handleAddNote() {
    if (!title.trim()) return;
    addNote({
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setTitle('');
    setContent('');
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteNote(id);
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  return (
    <Page>
      <ScreenHeader
        title="Notes"
        subtitle={`${state.notes.length} note${state.notes.length !== 1 ? 's' : ''}`}
        actions={
          <Button
            variant="highlight"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add Note'}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 mt-4">
        {/* Add Note Form */}
        {showForm && (
          <Card variant="elevated" padding="default">
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Note content (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  variant="highlight"
                  size="default"
                  onClick={handleAddNote}
                  disabled={!title.trim()}
                >
                  Save Note
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    setShowForm(false);
                    setTitle('');
                    setContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Notes List */}
        {state.notes.length > 0 ? (
          <Card variant="default" padding="none">
            {state.notes.map((note, index) => (
              <div key={note.id}>
                {index > 0 && <Divider variant="default" />}
                <ListItem
                  title={note.title}
                  subtitle={truncate(note.content || 'No content', 60)}
                  onPress={() => navigate(`/notes/${note.id}`)}
                  onDelete={() => handleDelete(note.id)}
                  trailing={
                    <span className="text-xs text-text-muted">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  }
                />
              </div>
            ))}
          </Card>
        ) : (
          !showForm && (
            <EmptyState
              title="No notes yet"
              description="Add a note manually or push notes via the API."
              action={{
                label: 'Add Note',
                onClick: () => setShowForm(true),
              }}
            />
          )
        )}

        {/* API Info */}
        <Card variant="default" padding="sm">
          <p className="text-xs text-text-muted m-0">
            Push notes programmatically:{' '}
            <code className="text-text-dim bg-surface-light px-1 py-0.5 rounded text-xs">
              POST /api/notes
            </code>
          </p>
        </Card>
      </div>
    </Page>
  );
}
