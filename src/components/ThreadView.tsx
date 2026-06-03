interface ThreadMessageData {
  _key: string
  subject?: string
  snippet?: string
  internalDate?: string
  sender: { name: string; email: string }
  recipients: Array<{ name: string; email: string }>
}

export function ThreadMessage({ message }: { message: ThreadMessageData }) {
  const from = message.sender?.name || message.sender?.email || 'Unknown'
  const recipients = message.recipients?.map((r) => r.name || r.email).join(', ')
  return (
    <div className="thread-message">
      <div className="thread-message-header">
        <span className="thread-message-from">{from}</span>
        <span className="thread-message-date">
          {message.internalDate
            ? new Date(parseInt(message.internalDate, 10)).toLocaleString()
            : ''}
        </span>
      </div>
      {recipients ? <div className="thread-message-recipients">To: {recipients}</div> : null}
      <div className="thread-message-snippet">{message.snippet || ''}</div>
    </div>
  )
}

interface ThreadViewProps {
  thread: { _key: string; updatedAt?: number }
  messages: ThreadMessageData[]
}

export function ThreadView(props: ThreadViewProps) {
  const { messages } = props
  const subject = messages[0]?.subject || '(no subject)'
  return (
    <div className="thread-view">
      <div className="thread-header">
        <h2>Thread: {subject}</h2>
        <button id="back-btn" type="button" className="btn btn-secondary">
          Back
        </button>
      </div>
      {messages.map((m) => (
        <ThreadMessage key={m._key} message={m} />
      ))}
    </div>
  )
}
