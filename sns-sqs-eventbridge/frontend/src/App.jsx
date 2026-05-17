import { useState } from "react";
import "./App.css";

const STATUS = { idle: "idle", sending: "sending", ok: "ok", err: "err" };

const DEFAULT_BODY = JSON.stringify({ id: 1, content: "hello world" }, null, 2);

const SCENARIOS = [
  {
    type: "good",
    label: "good",
    hint: "Stored in DynamoDB",
    color: "green",
  },
  {
    type: "bad",
    label: "bad",
    hint: "Email alert via SNS",
    color: "red",
  },
  {
    type: "custom",
    label: "other",
    hint: "Invalid/unknown type → email alert via SNS",
    color: "yellow",
  },
];

export default function App() {
  const [body, setBody] = useState(DEFAULT_BODY);
  const [typeChoice, setTypeChoice] = useState("good");
  const [customType, setCustomType] = useState("invalid");
  const [status, setStatus] = useState(STATUS.idle);
  const [detail, setDetail] = useState("");

  const effectiveType = typeChoice === "custom" ? customType : typeChoice;

  async function onSubmit(e) {
    e.preventDefault();
    setStatus(STATUS.sending);
    setDetail("");

    try {
      const res = await fetch(`/api/messages?type=${encodeURIComponent(effectiveType)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      const text = await res.text();
      if (res.ok) {
        setStatus(STATUS.ok);
        setDetail(`Queued with type="${effectiveType}" (HTTP ${res.status})`);
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
          CloudFront → API Gateway → SQS → Step Function
        </p>

        <form onSubmit={onSubmit}>
          {/* ── Type (SQS message attribute) ── */}
          <div className="field">
            <label className="field-label">
              Message type
              <span className="field-note">SQS message attribute</span>
            </label>
            <div className="type-grid">
              {SCENARIOS.map((s) => (
                <label
                  key={s.type}
                  className={`type-card ${s.color} ${typeChoice === s.type ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="typeChoice"
                    value={s.type}
                    checked={typeChoice === s.type}
                    onChange={(e) => setTypeChoice(e.target.value)}
                  />
                  <span className="type-name">{s.label}</span>
                  <span className="type-hint">{s.hint}</span>
                </label>
              ))}
            </div>

            {typeChoice === "custom" && (
              <input
                className="custom-type-input"
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Type any string (or leave blank to omit)"
              />
            )}
          </div>

          {/* ── Body ── */}
          <div className="field">
            <label className="field-label">
              Message body
              <span className="field-note">
                Edit freely — use invalid JSON to trigger DLQ retry
              </span>
            </label>
            <textarea
              className="body-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              spellCheck={false}
            />
          </div>

          <button type="submit" disabled={status === STATUS.sending}>
            {status === STATUS.sending ? "Sending…" : "Send to SQS"}
          </button>
        </form>

        {banner && <div className={banner.cls}>{banner.msg}</div>}

        {/* ── Scenario guide ── */}
        <div className="scenarios">
          <p className="scenarios-title">Test scenarios</p>
          <div className="scenario-row">
            <span className="pill green">type=good</span>
            <span>+ valid JSON body → stored in DynamoDB</span>
          </div>
          <div className="scenario-row">
            <span className="pill red">type=bad</span>
            <span>+ any body → email alert via SNS</span>
          </div>
          <div className="scenario-row">
            <span className="pill yellow">type=other</span>
            <span>+ any body → email alert via SNS (invalid type path)</span>
          </div>
          <div className="scenario-row">
            <span className="pill green">type=good</span>
            <span>
              + <strong>invalid JSON body</strong> → Step Function fails → retried
              2× → DLQ → email (~60s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
