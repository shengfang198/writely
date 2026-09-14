import { useEffect, useRef, useState } from 'react';
import chatbotGif from '../../assets/chatbot.gif';
import EdgeToggle, { PANEL_SLIDE_CLASS } from './EdgeToggle.jsx';

const GREETINGS = [
  {
    keys: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
    replies: [
      'Hello. I am the Writely agent.',
      'Hi. How can I help with this document?',
      'Hello. Ask me anything about your draft.',
    ],
  },
  {
    keys: ['how are you', 'whats up', "what's up"],
    replies: ['Ready to help with your writing.', 'All set. What should we work on?'],
  },
  {
    keys: ['help', 'what can you do'],
    replies: [
      'I can greet you for now. A full writing agent will connect later.',
      'This is a sample bot. Document help will be wired up next.',
    ],
  },
  {
    keys: ['thanks', 'thank you'],
    replies: ['You are welcome.', 'Glad to help.'],
  },
  {
    keys: ['bye', 'goodbye'],
    replies: ['Goodbye. I will be here when you come back.'],
  },
];

const FALLBACK_REPLIES = [
  'Noted. The writing agent is not connected yet.',
  'I heard you. Sample replies only for now.',
  'Understood. A live agent will connect later.',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function replyTo(text) {
  const q = text.trim().toLowerCase();
  const hit = GREETINGS.find((entry) => entry.keys.some((key) => q.includes(key)));
  return pick(hit ? hit.replies : FALLBACK_REPLIES);
}

function uid() {
  return `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AgentChat({ open, onToggle }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'agent',
      text: 'Hello. I am the Writely agent. This is a sample greetings bot. A live connection will come later.',
    },
  ]);
  const listRef = useRef(null);
  const collapsed = !open;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'user', text },
      { id: uid(), role: 'agent', text: replyTo(text) },
    ]);
  };

  return (
    <div className={PANEL_SLIDE_CLASS} style={{ width: collapsed ? 0 : 320 }}>
      <div className="h-full w-full overflow-hidden" inert={collapsed || undefined}>
        <aside className="flex h-full w-[320px] min-w-0 flex-col overflow-x-hidden overflow-y-hidden border-l border-line bg-panel">
          <div className="flex min-w-0 shrink-0 items-center justify-between overflow-hidden border-b border-line px-4 py-3.5">
            <span className="truncate text-[15px] font-semibold uppercase tracking-wide text-muted">Agent</span>
          </div>
          <div ref={listRef} className="sidebar-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 max-w-[90%] overflow-hidden break-words rounded-lg px-2.5 py-2 text-[13px] leading-snug ${
                  message.role === 'user' ? 'ml-auto bg-accent-soft text-ink' : 'bg-surface text-ink'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <img
              src={chatbotGif}
              alt=""
              className="h-9 w-9 shrink-0 object-contain"
              aria-hidden
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message agent..."
              className="min-w-0 flex-1 rounded-md border border-line px-2.5 py-2 text-[13px] outline-none focus:border-accent"
            />
          </form>
        </aside>
      </div>
      <EdgeToggle
        side="right"
        collapsed={collapsed}
        onToggle={onToggle}
        expandLabel="Expand agent"
        collapseLabel="Collapse agent"
      />
    </div>
  );
}
