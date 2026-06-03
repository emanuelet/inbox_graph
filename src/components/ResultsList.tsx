import { MessageCard, type MessageData } from './MessageCard.js'
import { PersonCard } from './PersonCard.js'

interface ResultsListProps {
  messages: MessageData[]
  person?: { name: string; email: string; _key: string }
  stats?: { sent: number; received: number; threads: number }
}

export function ResultsList({ messages, person, stats }: ResultsListProps) {
  if (messages.length === 0) {
    return <div className="empty">No results found</div>
  }
  return (
    <>
      {person && stats ? <PersonCard data={{ person, stats }} /> : null}
      {messages.map((m) => (
        <MessageCard key={m._key} message={m} />
      ))}
    </>
  )
}
