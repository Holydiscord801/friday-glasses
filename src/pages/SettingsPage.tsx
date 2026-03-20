import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribe, getState, setPage, updateSettings } from '../store';
import { Page } from 'even-toolkit/web/page';
import { Card } from 'even-toolkit/web/card';
import { Button } from 'even-toolkit/web/button';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { SettingsGroup } from 'even-toolkit/web/settings-group';
import { Toggle } from 'even-toolkit/web/toggle';
import { StatusDot } from 'even-toolkit/web/status-dot';
import { ListItem } from 'even-toolkit/web/list-item';

export function SettingsPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const { settings, glasses } = state;

  useEffect(() => {
    setPage('settings');
  }, []);

  function adjustFontSize(delta: number) {
    const next = Math.max(10, Math.min(32, settings.fontSize + delta));
    updateSettings({ fontSize: next });
  }

  function adjustScrollSpeed(delta: number) {
    const next = Math.max(0.5, Math.min(5, settings.scrollSpeed + delta));
    updateSettings({ scrollSpeed: parseFloat(next.toFixed(1)) });
  }

  return (
    <Page>
      <ScreenHeader title="Settings" />

      <div className="flex flex-col gap-4 mt-4">
        {/* Display Settings */}
        <SettingsGroup label="Display">
          <ListItem
            title="Dark Mode"
            subtitle="Use dark theme throughout the app"
            trailing={
              <Toggle
                checked={settings.darkMode}
                onChange={(checked) => updateSettings({ darkMode: checked })}
              />
            }
          />
          <ListItem
            title="Show Battery"
            subtitle="Display battery level on glasses preview"
            trailing={
              <Toggle
                checked={settings.showBattery}
                onChange={(checked) => updateSettings({ showBattery: checked })}
              />
            }
          />
        </SettingsGroup>

        {/* Teleprompter Settings */}
        <SettingsGroup label="Teleprompter">
          <ListItem
            title="Font Size"
            subtitle={`${settings.fontSize}px`}
            trailing={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => adjustFontSize(-2)}>
                  -
                </Button>
                <span className="text-sm text-text min-w-[2.5rem] text-center">
                  {settings.fontSize}
                </span>
                <Button variant="ghost" size="sm" onClick={() => adjustFontSize(2)}>
                  +
                </Button>
              </div>
            }
          />
          <ListItem
            title="Scroll Speed"
            subtitle={`${settings.scrollSpeed}x`}
            trailing={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => adjustScrollSpeed(-0.5)}>
                  -
                </Button>
                <span className="text-sm text-text min-w-[2.5rem] text-center">
                  {settings.scrollSpeed}x
                </span>
                <Button variant="ghost" size="sm" onClick={() => adjustScrollSpeed(0.5)}>
                  +
                </Button>
              </div>
            }
          />
        </SettingsGroup>

        {/* Connection Info */}
        <SettingsGroup label="Connection">
          <ListItem
            title="Status"
            trailing={
              <div className="flex items-center gap-2">
                <StatusDot connected={glasses.connected} />
                <span className="text-sm text-text-dim">
                  {glasses.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            }
          />
          <ListItem
            title="Battery Level"
            trailing={
              <span className="text-sm text-text-dim">{glasses.battery}%</span>
            }
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup label="About">
          <ListItem
            title="App"
            trailing={
              <span className="text-sm text-text-muted">Friday AI Glasses</span>
            }
          />
          <ListItem
            title="Version"
            trailing={
              <span className="text-sm text-text-muted">1.0.0</span>
            }
          />
        </SettingsGroup>
      </div>
    </Page>
  );
}
