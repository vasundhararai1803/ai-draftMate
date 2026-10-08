'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { useCompletion } from '@ai-sdk/react';

interface DocumentItem {
  id: string;
  title: string;
  isFavorite?: boolean;
  content: string;
  updatedAt: number;
}

const initialDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Product launch notes",
    isFavorite: true,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    content: `<h2>Why we built DraftMate</h2>
<p>Writing is often interrupted by the tools we use to improve it.</p>
<p>You write in one app, copy your text, open an AI assistant, paste it, explain what you need, and then bring the result back.</p>
<p>DraftMate keeps that loop inside the editor.</p>
<h2>The idea</h2>
<p>Highlight a sentence or paragraph and choose an AI action.</p>
<p>Your result appears instantly beside the original text, so you can compare, edit, and keep writing without leaving the page.</p>`
  },
  {
    id: "doc-2",
    title: "Blog draft",
    isFavorite: false,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    content: `<h2>Unlocking Focus in Modern Writing</h2>
<p>Deep work is becoming a rare superpower in today's hyper-connected environment.</p>
<p>Every notification, window switch, and external AI tab fragments our train of thought.</p>
<p>When you keep your workflow continuous, creative momentum compounds exponentially.</p>
<p>DraftMate lets you stay in the flow state while drafting and editing seamlessly.</p>`
  },
  {
    id: "doc-3",
    title: "Essay — AI in education",
    isFavorite: true,
    updatedAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
    content: `<h2>The Evolution of Interactive Learning</h2>
<p>Artificial intelligence is shifting education from passive consumption to active inquiry.</p>
<p>Rather than replacing critical thinking, intelligent assistants act as personalized sounding boards.</p>
<p>Students can clarify difficult concepts instantly without losing the flow of studying.</p>
<p>The key to effective technology is augmenting human creativity rather than overshadowing it.</p>`
  }
];

const MAIN_ACTIONS = [
  { id: "summarize", label: "Summarize" },
  { id: "simplify", label: "Explain simply" },
  { id: "fix", label: "Fix tone" },
];

const QUICK_ACTIONS = [
  { id: "shorter", label: "Make shorter" },
  { id: "friendly", label: "More friendly" },
  { id: "formal", label: "More formal" },
];

export default function Editor() {
  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [loaded, setLoaded] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string>("doc-1");
  const [activeNav, setActiveNav] = useState<string>("All documents");
  const [activeAction, setActiveAction] = useState<string>("Explain simply");
  const [notice, setNotice] = useState<string>("");
  const [wordCount, setWordCount] = useState<number>(0);
  const [selectedFont, setSelectedFont] = useState<string>("Arial");

  const editorRef = useRef<HTMLDivElement>(null);
  const documentCopyRef = useRef<HTMLElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastActionRef = useRef<string>("simplify");
  const lastTargetTextRef = useRef<string>("");
  const usedSelectionRef = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  const currentDoc = docs.find((d) => d.id === activeDocId) || docs[0];

  const { completion, complete, isLoading, stop, error } = useCompletion({
    api: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/ai`,
    streamProtocol: 'text',
    onError: (err: any) => {
      console.error('Completion error:', err);
      showNotice('AI Error: ' + (err?.message || 'Failed to generate'));
    },
  });

  // FIX 11: Don't lose documents on refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem("draftmate-docs");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure old docs have updatedAt
        const withTimestamps = parsed.map((doc: DocumentItem) => ({
          ...doc,
          updatedAt: doc.updatedAt ?? Date.now(),
        }));
        setDocs(withTimestamps);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("draftmate-docs", JSON.stringify(docs));
  }, [docs, loaded]);

  // FIX 14: Clean up the toast timer
  const showNotice = (message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2500);
  };

  // Recalculate word count from editor content
  const updateWordCount = useCallback(() => {
    if (documentCopyRef.current) {
      const text = documentCopyRef.current.innerText || "";
      const words = text.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
    }
  }, []);

  // Update editor HTML when switching documents
  useEffect(() => {
    if (!loaded) return;
    if (documentCopyRef.current && currentDoc) {
      documentCopyRef.current.innerHTML = currentDoc.content;
      updateWordCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId, loaded]);

  // Track user text selection inside the editor
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const handleEditorInput = () => {
    updateWordCount();
    if (documentCopyRef.current) {
      const newHtml = documentCopyRef.current.innerHTML;
      setDocs((prev) =>
        prev.map((d) => (d.id === activeDocId ? { ...d, content: newHtml, updatedAt: Date.now() } : d))
      );
    }
  };

  // FIX 12: Replace fragile label matching with action IDs
  const runAction = async (actionId: string, label: string) => {
    setActiveAction(label);

    // Determine target text from active selection or full document
    let targetText = "";
    const selection = window.getSelection()?.toString().trim();

    if (selection) {
      targetText = selection;
      usedSelectionRef.current = true;
      if (window.getSelection()?.rangeCount) {
        savedRangeRef.current = window.getSelection()!.getRangeAt(0).cloneRange();
      }
    } else {
      usedSelectionRef.current = false;
      if (documentCopyRef.current) {
        targetText = documentCopyRef.current.innerText.trim();
      }
    }

    if (!targetText) {
      showNotice("Please write or highlight some text to process.");
      return;
    }

    lastTargetTextRef.current = targetText;
    lastActionRef.current = actionId;

    try {
      await complete(targetText, { body: { action: actionId } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerate = () => {
    if (lastTargetTextRef.current) {
      complete(lastTargetTextRef.current, { body: { action: lastActionRef.current } });
    }
  };

  // FIX 13: Stop "Improve all" from duplicating document
  const useSuggestion = () => {
    if (!completion) return;

    // Check if we have a saved range to replace
    const range = savedRangeRef.current;
    if (range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      try {
        range.deleteContents();
        const textNode = document.createTextNode(completion);
        range.insertNode(textNode);

        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(textNode);
          newRange.collapse(false);
          selection.addRange(newRange);
        }
        savedRangeRef.current = null;
        handleEditorInput();
        showNotice("Suggestion applied to selected text");
        return;
      } catch (e) {
        console.warn("Could not replace range, appending instead", e);
      }
    }

    // Append or replace based on action
    if (documentCopyRef.current) {
      const lines = completion.split("\n").filter((l) => l.trim());
      const paragraphs = lines.map((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        return p;
      });
      const replaceAll = ["fix", "improve", "shorter", "friendly", "formal"].includes(lastActionRef.current);
      if (replaceAll) documentCopyRef.current.replaceChildren(...paragraphs);
      else documentCopyRef.current.append(...paragraphs);
      handleEditorInput();
      showNotice(replaceAll ? "Document updated" : "Suggestion added to draft");
    }
  };

  // Text formatting
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleEditorInput();
  };

  const createNewDocument = () => {
    const newId = `doc-${Date.now()}`;
    const newDoc: DocumentItem = {
      id: newId,
      title: "Untitled draft",
      isFavorite: false,
      updatedAt: Date.now(),
      content: `<h2>Untitled draft</h2><p>Start writing here, or select an AI action to help draft your ideas...</p>`
    };
    setDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newId);
    showNotice("New document created");
  };

  const filteredDocs = docs
    .map((doc) => doc)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((doc) => {
      if (activeNav === "Recent") return Date.now() - doc.updatedAt <= 7 * 24 * 60 * 60 * 1000;
      if (activeNav === "Favorites") return doc.isFavorite;
      return true;
    });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand">DraftMate</span>
          <button
            type="button"
            className="new-document"
            aria-label="Create new document"
            title="Create new document"
            onClick={createNewDocument}
          >
            +
          </button>
        </div>

        <nav aria-label="Document navigation">
          <p className="nav-label">Workspace</p>
          {["All documents", "Recent", "Favorites"].map((item) => (
            <button
              type="button"
              className={`nav-item ${activeNav === item ? "active" : ""}`}
              key={item}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}

          <p className="nav-label documents-label">Documents</p>
          {filteredDocs.map((item) => (
            <button
              type="button"
              className={`nav-item document-item ${item.id === activeDocId ? "current-document" : ""}`}
              key={item.id}
              onClick={() => setActiveDocId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </nav>

        <div className="profile">
          <span className="avatar">VR</span>
          <span>
            <strong>Your name</strong>
            <small>Local workspace</small>
          </span>
        </div>
      </aside>

      <main className="workspace">
        <header className="page-header" style={{ minHeight: 'auto', marginBottom: '24px' }}>
          <div>
            <p className="breadcrumb">My documents / {currentDoc?.title}</p>
            <input
              className="title-input"
              value={currentDoc?.title ?? ""}
              aria-label="Document title"
              onChange={(e) =>
                setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, title: e.target.value, updatedAt: Date.now() } : d)))
              }
            />
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, isFavorite: !d.isFavorite, updatedAt: Date.now() } : d)))
              }
            >
              {currentDoc?.isFavorite ? "★ Favorited" : "☆ Favorite"}
            </button>
            <p className="edited">Saved locally</p>
          </div>
        </header>

        <div className="content-grid">
          <section className="editor-card" aria-label="Document editor">
            <div className="toolbar" aria-label="Formatting toolbar">
              <button
                type="button"
                className="format bold"
                title="Bold (Ctrl+B)"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("bold"); }}
              >
                B
              </button>
              <button
                type="button"
                className="format italic"
                title="Italic (Ctrl+I)"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("italic"); }}
              >
                I
              </button>
              <button
                type="button"
                className="format underline"
                title="Underline (Ctrl+U)"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("underline"); }}
              >
                U
              </button>
              <span className="divider" />
              <button
                type="button"
                className="format"
                title="Heading 1"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h1"); }}
              >
                H1
              </button>
              <button
                type="button"
                className="format"
                title="Heading 2"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("formatBlock", "h2"); }}
              >
                H2
              </button>
              <button
                type="button"
                className="format list"
                title="Bulleted List"
                onMouseDown={(e) => { e.preventDefault(); applyFormat("insertUnorderedList"); }}
              >
                • List
              </button>
              <span className="divider" />
              <button
                type="button"
                className="font-select"
                title="Change Font Style"
                onClick={() => {
                  const nextFont = selectedFont === "Arial" ? "Georgia" : selectedFont === "Georgia" ? "Inter" : "Arial";
                  setSelectedFont(nextFont);
                  applyFormat("fontName", nextFont);
                }}
              >
                {selectedFont}
              </button>
            </div>

            <div
              ref={editorRef}
              className="editor-body"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Document editor"
              onMouseUp={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onInput={handleEditorInput}
            >
              <div className="ai-actions" contentEditable={false}>
                <span className="eyebrow purple">AI actions</span>
                <div className="action-buttons">
                  {MAIN_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={isLoading}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runAction(action.id, action.label)}
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="improve"
                    disabled={isLoading}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runAction("improve", "Improve all")}
                  >
                    <span aria-hidden="true">✦</span> Improve all
                  </button>
                </div>
              </div>

              <article ref={documentCopyRef} className="document-copy" />
            </div>
          </section>

          <aside className="ai-panel" aria-label="DraftMate AI assistant">
            <div className="ai-header">
              <span className="ai-logo" aria-hidden="true">✦</span>
              <div>
                <h2>DraftMate AI</h2>
                <p>Writing assistant</p>
              </div>
              <span className={`online ${isLoading ? 'animate-pulse' : ''}`} aria-label="Online" title="AI assistant" />
            </div>

            <div className="ai-content">
              <span className="eyebrow">Action</span>
              <div className="active-action">{activeAction}</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '34px 0 13px' }}>
                <h3 style={{ margin: 0, color: '#343846', fontSize: '12px', fontWeight: 600 }}>
                  AI suggestion
                </h3>
                {isLoading && (
                  <button
                    onClick={stop}
                    type="button"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Stop
                  </button>
                )}
              </div>
              
              <div className="suggestion" aria-live="polite">
                {error ? (
                  <p style={{ color: '#dc2626', margin: 0 }}>Error: {error.message || "Failed to reach AI service"}</p>
                ) : isLoading && !completion ? (
                  <p style={{ color: '#6b7085', fontStyle: 'italic', margin: 0 }}>Thinking...</p>
                ) : completion ? (
                  completion.split('\n').map((paragraph, i) => (
                    paragraph.trim() ? <p key={i}>{paragraph}</p> : <br key={i} />
                  ))
                ) : (
                  <p style={{ color: '#6b7085', fontStyle: 'italic', margin: 0 }}>Highlight text in the editor or click an AI action to get instant suggestions.</p>
                )}
              </div>

              <div className="suggestion-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={isLoading || !completion}
                  onClick={useSuggestion}
                >
                  Use suggestion
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={isLoading || !completion}
                  onClick={handleRegenerate}
                >
                  Regenerate
                </button>
              </div>

              <div className="quick-prompts">
                <span className="eyebrow">Quick prompts</span>
                <div>
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={isLoading}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runAction(action.id, action.label)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer>
          <span>DraftMate • AI-powered writing, without the context switching.</span>
          <span>Words {wordCount}</span>
        </footer>
      </main>

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
