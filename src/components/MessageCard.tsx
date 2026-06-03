export interface MessageData {
  _key: string
  subject?: string
  snippet?: string
  internalDate?: string
  threadId: string
  gmailUrl?: string
  score?: number
  direction?: string
  sender?: { name: string; email: string }
}

export function MessageCard({ message }: { message: MessageData }) {
  const sender = message.sender?.name || message.sender?.email
  return (
    <div className="message-card" data-thread={message.threadId}>
      <div className="message-subject">
        {sender ? <>{sender} — </> : null}
        {message.subject || '(no subject)'}
        {message.direction ? (
          <span style={{ color: '#888', fontSize: '12px' }}> ({message.direction})</span>
        ) : null}
      </div>
      <div className="message-snippet">{message.snippet || ''}</div>
      <div className="message-meta">
        <span>
          {message.internalDate
            ? new Date(parseInt(message.internalDate, 10)).toLocaleString()
            : ''}
        </span>
        {message.score ? <span className="message-score">{message.score.toFixed(2)}</span> : null}
      </div>
    </div>
  )
}
