import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { subscribe, getState, setPage } from '../store';
import { GlassesPreview } from '../components/GlassesPreview';

export function HomePage() {
  const state = useSyncExternalStore(subscribe, getState);
  const navigate = useNavigate();
  const { glasses } = state;

  useEffect(() => { setPage('home'); }, []);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-center">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Friday</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>AI Glasses Control Panel</p>
      </div>

      <GlassesPreview />

      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-lg"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: glasses.connected ? 'var(--color-positive)' : 'var(--color-negative)' }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            {glasses.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          Battery {glasses.battery}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/conversation')}
          className="flex flex-col gap-1 p-4 rounded-xl text-left transition-opacity active:opacity-70"
          style={{ background: 'rgba(0,180,80,0.08)', border: '1px solid rgba(0,180,80,0.25)' }}
        >
          <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Chat</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Talk to Friday</span>
        </button>
        <button
          onClick={() => navigate('/teleprompter')}
          className="flex flex-col gap-1 p-4 rounded-xl text-left transition-opacity active:opacity-70"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Teleprompter</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Display text</span>
        </button>
        <button
          onClick={() => navigate('/notes')}
          className="flex flex-col gap-1 p-4 rounded-xl text-left transition-opacity active:opacity-70"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Notes</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {state.notes.length} note{state.notes.length !== 1 ? 's' : ''}
          </span>
        </button>
        <button
          onClick={() => navigate('/contact')}
          className="flex flex-col gap-1 p-4 rounded-xl text-left transition-opacity active:opacity-70"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <span className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Contact</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {state.contact ? state.contact.name : 'No card'}
          </span>
        </button>
      </div>

      <button
        onClick={() => navigate('/settings')}
        className="flex items-center justify-center py-3 rounded-xl transition-opacity active:opacity-70"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Settings</span>
      </button>
    </div>
  );
}
