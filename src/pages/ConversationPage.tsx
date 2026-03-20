import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribe, getState, setPage, toggleMic, clearConversation } from '../store';
import { useFriday } from '../hooks/useFriday';
import { Page } from 'even-toolkit/web/page';
import { Button } from 'even-toolkit/web/button';
import { Badge } from 'even-toolkit/web/badge';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { ChatContainer, ChatInput, type ChatMessage } from 'even-toolkit/web/chat';
import { VoiceInput } from 'even-toolkit/web/voice-input';

export function ConversationPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const { sendMessage } = useFriday();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setPage('conversation');
  }, []);

  const { entries, isProcessing, micOn } = state.conversation;

  // Convert ConversationEntry[] to ChatMessage[]
  const messages: ChatMessage[] = entries.map((entry) => ({
    id: entry.timestamp,
    role: entry.role === 'friday' ? 'assistant' : 'user',
    content: entry.text,
    timestamp: Date.parse(entry.timestamp),
  }));

  // Add a streaming indicator when processing
  if (isProcessing) {
    messages.push({
      id: 'processing',
      role: 'assistant',
      content: 'Thinking...',
      isStreaming: true,
    });
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isProcessing) return;
    setInputValue('');
    await sendMessage(text);
  }

  function handleVoiceTranscript(text: string) {
    if (!text.trim()) return;
    setInputValue((prev) => (prev ? prev + ' ' + text : text));
  }

  function handleClear() {
    clearConversation();
    setInputValue('');
  }

  const micStatus = micOn ? 'Mic On' : 'Mic Off';

  const chatInput = (
    <div className="flex items-end gap-2 w-full">
      <div className="flex-1">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          placeholder="Ask Friday anything..."
          disabled={isProcessing}
        />
      </div>
      <VoiceInput
        onTranscript={handleVoiceTranscript}
        className="shrink-0"
      />
    </div>
  );

  return (
    <Page className="flex flex-col h-[100dvh]">
      <ScreenHeader
        title="Conversation"
        subtitle={micStatus}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={micOn ? 'positive' : 'neutral'}>
              {micStatus}
            </Badge>
            <Button variant="ghost" size="sm" onClick={toggleMic}>
              {micOn ? 'Mute' : 'Unmute'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 mt-2">
        <ChatContainer messages={messages} input={chatInput} />
      </div>
    </Page>
  );
}
