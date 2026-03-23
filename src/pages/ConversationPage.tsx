import { useState, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { subscribe, getState, setPage, clearConversation } from '../store';
import { useFriday } from '../hooks/useFriday';
import { Page } from 'even-toolkit/web/page';
import { Button } from 'even-toolkit/web/button';
import { Badge } from 'even-toolkit/web/badge';
import { ScreenHeader } from 'even-toolkit/web/screen-header';
import { ChatContainer, ChatInput, type ChatMessage } from 'even-toolkit/web/chat';

export function ConversationPage() {
  const state = useSyncExternalStore(subscribe, getState);
  const { sendMessage } = useFriday();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setPage('conversation');
  }, []);

  const { entries, isProcessing } = state.conversation;

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

  function handleClear() {
    clearConversation();
    setInputValue('');
  }

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
    </div>
  );

  return (
    <Page className="flex flex-col h-[100dvh]">
      <ScreenHeader
        title="Conversation"
        subtitle="Type below to talk to Friday"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              Mic Coming Soon
            </Badge>
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
