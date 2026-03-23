import { useSyncExternalStore } from 'react';
import { subscribe, getState } from '../store';
import { toDisplayData } from '../glasses-display';
import type { GlassNavState } from 'even-toolkit/types';

export function GlassesPreview() {
  const state = useSyncExternalStore(subscribe, getState);

  const nav: GlassNavState = { screen: state.currentPage, highlightedIndex: 0 };
  const data = toDisplayData(state, nav);

  return (
    <div className="g2-display">
      {data.lines.map((ln, i) => {
        if (ln.style === 'separator') {
          return <div key={i} className="g2-sep" />;
        }
        const cls = ln.inverted
          ? 'g2-line g2-inv'
          : ln.style === 'meta'
            ? 'g2-line g2-meta'
            : 'g2-line';
        return (
          <div key={i} className={cls}>
            {ln.text || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
}
