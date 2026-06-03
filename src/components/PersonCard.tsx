interface PersonData {
  person: { name: string; email: string; _key: string }
  stats: { sent: number; received: number; threads: number }
}

export function PersonCard({ data }: { data: PersonData }) {
  return (
    <div className="person-card">
      <div className="person-name">{data.person.name}</div>
      <div className="person-email">{data.person.email}</div>
      <div className="stats">
        <span>Sent: {data.stats.sent}</span>
        <span>Received: {data.stats.received}</span>
        <span>Threads: {data.stats.threads}</span>
      </div>
    </div>
  )
}
