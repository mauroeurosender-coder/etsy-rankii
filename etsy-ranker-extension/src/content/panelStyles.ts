export const PANEL_STYLES = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

/* Positioned relative to the zero-size host div (see content.tsx), not the
   viewport directly — see the comment there for why. */
.wrap {
  position: absolute;
  bottom: 20px;
  right: 20px;
  pointer-events: auto;
  width: 340px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.collapsed { width: auto; }

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #f97316;
  color: #fff;
  cursor: pointer;
  user-select: none;
}
.header .dot { width: 8px; height: 8px; border-radius: 999px; background: #fff; opacity: 0.9; }
.header .title { font-size: 13px; font-weight: 700; flex: 1; }
.header .chevron { font-size: 12px; opacity: 0.9; }

.tabs { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.tab-btn {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  cursor: pointer;
}
.tab-btn.active { color: #f97316; border-bottom-color: #f97316; background: #fff; }
.tab-btn:hover:not(.active) { color: #64748b; }

.listing-title { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.4; margin: 0 0 8px; }

.tag-copy-box {
  margin-top: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.body {
  padding: 14px;
  overflow-y: auto;
  color: #1e293b;
  font-size: 13px;
  line-height: 1.5;
}

.section { margin-bottom: 14px; }
.section:last-child { margin-bottom: 0; }
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin-bottom: 6px;
}

.fact-row { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
.fact-row:last-child { border-bottom: none; }
.fact-label { color: #64748b; }
.fact-value { font-weight: 600; color: #0f172a; text-align: right; }

.price { font-size: 20px; font-weight: 800; color: #0f172a; }
.sale-price { font-size: 12px; color: #ef4444; text-decoration: line-through; margin-left: 6px; font-weight: 500; }

.badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #ede9fe; color: #6d28d9; }

.activity { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 600; }
.no-activity { color: #94a3b8; font-size: 12px; font-style: italic; }

.caveat { font-size: 11px; color: #94a3b8; margin-top: 4px; }

button.primary {
  width: 100%;
  padding: 10px;
  background: #f97316;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
button.primary:disabled { background: #cbd5e1; cursor: not-allowed; }
button.primary:hover:not(:disabled) { background: #ea580c; }

.link-btn { background: none; border: none; color: #f97316; font-weight: 700; font-size: 12px; cursor: pointer; padding: 0; text-decoration: underline; }
.link-btn:disabled { color: #cbd5e1; cursor: not-allowed; text-decoration: none; }

.error-box { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 8px 10px; font-size: 12px; }

.score-row { display: flex; align-items: baseline; gap: 4px; }
.score-value { font-size: 24px; font-weight: 800; }
.score-max { font-size: 12px; color: #94a3b8; }

.kw-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
.kw-name { color: #334155; }
.kw-meta { color: #94a3b8; }

.tag-pill { display: inline-block; background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin: 2px 4px 2px 0; }

.spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
  border-radius: 50%; display: inline-block; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;
