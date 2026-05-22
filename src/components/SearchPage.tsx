import { ClientScript } from './ClientScript.js'
import { Layout } from './Layout.js'

export function SearchPage() {
  return (
    <Layout>
      <header>
        <div className="container">
          <h1>Inbox Graph</h1>
          <div>
            <span id="auth-status" className="auth-status">
              Checking...
            </span>
            <a href="/auth/google" className="btn btn-primary" style={{ marginLeft: '12px' }}>
              Login with Gmail
            </a>
          </div>
        </div>
      </header>
      <div className="container">
        <div className="search-bar">
          <input
            type="text"
            id="search-input"
            className="search-input"
            placeholder="Search emails or enter an email address..."
            autoFocus={true}
          />
        </div>
        <div id="results" />
        <div id="thread-view" className="hidden" />
      </div>
      <ClientScript />
    </Layout>
  )
}
