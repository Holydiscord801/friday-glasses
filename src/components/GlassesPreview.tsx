import { useSyncExternalStore } from 'react';
import { subscribe, getState } from '../store';

/**
 * GlassesPreview - a visual representation of what's currently
 * being displayed on the Even G2 glasses. Renders a small
 * "screen" preview matching the 576x288 display.
 */
export function GlassesPreview() {
  const state = useSyncExternalStore(subscribe, getState);
  const { currentPage, teleprompter, contact, conversation, glasses } = state;

  function renderContent() {
    switch (currentPage) {
      case 'teleprompter':
        return (
          <div className="text-[8px] leading-tight font-mono whitespace-pre-wrap overflow-hidden">
            {teleprompter.content || 'No content loaded'}
          </div>
        );

      case 'conversation': {
        const lastEntries = conversation.entries.slice(-3);
        return (
          <div className="flex flex-col gap-0.5 text-[7px] leading-tight">
            {lastEntries.length === 0 && (
              <span className="text-text-muted">Listening...</span>
            )}
            {lastEntries.map((entry, i) => (
              <div key={i} className={entry.role === 'friday' ? 'text-positive' : 'text-text-dim'}>
                <span className="font-bold">{entry.role === 'friday' ? 'F' : 'U'}:</span>{' '}
                {entry.text.slice(0, 80)}
              </div>
            ))}
            {conversation.isProcessing && (
              <div className="text-accent animate-pulse-dot">Thinking...</div>
            )}
          </div>
        );
      }

      case 'contact':
        return contact ? (
          <div className="text-[7px] leading-tight">
            <div className="font-bold text-[9px]">{contact.name}</div>
            <div className="text-text-dim">{contact.title} @ {contact.company}</div>
            {contact.talking_points.length > 0 && (
              <div className="mt-1 text-text-muted">
                {contact.talking_points.slice(0, 2).map((tp, i) => (
                  <div key={i}>- {tp.slice(0, 40)}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[8px] text-text-muted">No contact loaded</div>
        );

      case 'notes':
        return (
          <div className="text-[8px] text-text-muted">Notes view active</div>
        );

      default:
        return (
          <div className="text-[8px] leading-tight">
            <div className="font-bold text-[9px] text-positive">FRIDAY ONLINE</div>
            <div className="text-text-dim mt-0.5">
              {glasses.connected ? 'Connected' : 'Disconnected'}
              {glasses.wearing ? ' - Wearing' : ''}
            </div>
          </div>
        );
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div
        className="relative w-full max-w-[320px] rounded-lg border border-border bg-black overflow-hidden"
        style={{ aspectRatio: '2 / 1' }}
      >
        {/* Glasses frame decoration */}
        <div className="absolute inset-0 rounded-lg border border-border-light opacity-30 pointer-events-none" />

        {/* Screen content */}
        <div className="absolute inset-2 flex flex-col justify-center text-text">
          {renderContent()}
        </div>

        {/* Status indicators */}
        <div className="absolute top-1 right-1.5 flex items-center gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${glasses.connected ? 'bg-positive' : 'bg-negative'}`}
          />
          {state.settings.showBattery && (
            <span className="text-[6px] text-text-muted">{glasses.battery}%</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-text-muted tracking-wide uppercase">Glasses Preview</span>
    </div>
  );
}
