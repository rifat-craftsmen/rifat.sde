import { useState } from "react";
import "./App.css";

const STATUS = { idle: "idle", sending: "sending", ok: "ok", err: "err" };

export default function App() {
  const [form, setForm] = useState({ id: "", content: "", type: "good" });
  const [status, setStatus] = useState(STATUS.idle);
  const [detail, setDetail] = useState("");

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const id = parseInt(form.id, 10);
    if (!id || !form.content.trim()) return;

    setStatus(STATUS.sending);
    setDetail("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: form.content.trim(), type: form.type }),
      });

      const text = await res.text();
      if (res.ok) {
        setStatus(STATUS.ok);
        setDetail(`Message queued (HTTP ${res.status})`);
        setForm({ id: "", content: "", type: "good" });
      } else {
        setStatus(STATUS.err);
        setDetail(`HTTP ${res.status}: ${text}`);
      }
    } catch (err) {
      setStatus(STATUS.err);
      setDetail(err.message);
    }
  }

  const banner =
    status === STATUS.ok
      ? { cls: "banner ok", msg: `✓ ${detail}` }
      : status === STATUS.err
      ? { cls: "banner err", msg: `✗ ${detail}` }
      : null;

  return (
    <div className="page">
      <div className="card">
        <h1>Message Queue</h1>
        <p className="subtitle">
          Send a message through CloudFront → API Gateway → SQS
        </p>

        <form onSubmit={onSubmit}>
          <label>
            ID
            <input
              name="id"
              type="number"
              min="1"
              value={form.id}
              onChange={onChange}
              placeholder="e.g. 42"
              required
            />
          </label>

          <label>
            Content
            <textarea
              name="content"
              value={form.content}
              onChange={onChange}
              placeholder="Your message…"
              rows={4}
              required
            />
          </label>

          <label>Type</label>
          <div className="radio-group">
            {["good", "bad"].map((t) => (
              <label key={t} className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={onChange}
                />
                <span className={`badge ${t}`}>{t}</span>
              </label>
            ))}
          </div>

          <button type="submit" disabled={status === STATUS.sending}>
            {status === STATUS.sending ? "Sending…" : "Send Message"}
          </button>
        </form>

        {banner && <div className={banner.cls}>{banner.msg}</div>}

        <details className="info">
          <summary>How it works</summary>
          <ul>
            <li>
              <code>type=good</code> → stored in DynamoDB
            </li>
            <li>
              <code>type=bad</code> → email alert via SNS
            </li>
            <li>
              Requests go <code>/api/messages</code> → CloudFront → API Gateway
              → SQS
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
