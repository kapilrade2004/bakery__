import { Bot, CheckCheck, User } from "lucide-react";

export default function ChatMessage({ message }) {
  const { sender, text, timestamp, isAI } = message;
  const isOutgoing = sender === "agent" || sender === "me" || isAI;

  return (
    <div className={`message-row ${isOutgoing ? "outgoing" : "incoming"}`}>
      {!isOutgoing && (
        <div className="avatar-chat customer-avatar">
          <User size={14} />
        </div>
      )}

      <div className="message-bubble">
        {isAI && (
          <div className="ai-tag">
            <Bot size={12} /> AI Agent Reply
          </div>
        )}
        <div className="message-text">{text}</div>
        <div className="message-meta">
          <span className="timestamp">{timestamp || "Just now"}</span>
          {isOutgoing && (
            <span className="read-receipt">
              <CheckCheck size={14} color="#34d399" />
            </span>
          )}
        </div>
      </div>

      {isOutgoing && (
        <div className="avatar-chat agent-avatar">
          {isAI ? <Bot size={14} /> : <User size={14} />}
        </div>
      )}

      <style>{`
        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .message-row.outgoing {
          justify-content: flex-end;
        }

        .message-row.incoming {
          justify-content: flex-start;
        }

        .avatar-chat {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .customer-avatar {
          background: #e2e8f0;
          color: #475569;
        }

        .agent-avatar {
          background: #16a34a;
          color: white;
        }

        .message-bubble {
          max-width: 70%;
          padding: 0.65rem 0.85rem;
          border-radius: 12px;
          font-size: 0.875rem;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          word-break: break-word;
        }

        .incoming .message-bubble {
          background: #ffffff;
          color: #0f172a;
          border-bottom-left-radius: 2px;
          border: 1px solid var(--border-color);
        }

        .outgoing .message-bubble {
          background: #dcfce7;
          color: #064e3b;
          border-bottom-right-radius: 2px;
          border: 1px solid #bbf7d0;
        }

        .ai-tag {
          font-size: 0.68rem;
          font-weight: 700;
          color: #15803d;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
          background: rgba(22, 163, 74, 0.12);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .message-text {
          white-space: pre-line;
          line-height: 1.45;
        }

        .message-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
        }

        .timestamp {
          font-size: 0.68rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
