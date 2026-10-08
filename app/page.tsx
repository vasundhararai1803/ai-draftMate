'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { useCompletion } from '@ai-sdk/react';

interface DocumentItem {
  id: string;
  title: string;
  category: 'all' | 'recent' | 'favorites';
  isFavorite?: boolean;
  content: string;
}

const initialDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Product launch notes",
    category: "recent",
    isFavorite: true,
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
    category: "recent",
    isFavorite: false,
    content: `<h2>Unlocking Focus in Modern Writing</h2>
<p>Deep work is becoming a rare superpower in today's hyper-connected environment.</p>
<p>Every notification, window switch, and external AI tab fragments our train of thought.</p>
<p>When you keep your workflow continuous, creative momentum compounds exponentially.</p>
<p>DraftMate lets you stay in the flow state while drafting and editing seamlessly.</p>`
  },
  {
    id: "doc-3",
    title: "Essay — AI in education",
    category: "all",
    isFavorite: true,
    content: `<h2>The Evolution of Interactive Learning</h2>
<p>Artificial intelligence is shifting education from passive consumption to active inquiry.</p>
<p>Rather than replacing critical thinking, intelligent assistants act as personalized sounding boards.</p>
<p>Students can clarify difficult concepts instantly without losing the flow of studying.</p>
<p>The key to effective technology is augmenting human creativity rather than overshadowing it.</p>`
  }
];

export default function Editor() {
  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [activeDocId, setActiveDocId] = useState<string>("doc-1");
  const [activeNav, setActiveNav] = useState<string>("All documents");
  const [activeAction, setActiveAction] = useState<string>("Explain simply");
  const [notice, setNotice] = useState<string>("");
  const [wordCount, setWordCount] = useState<number>(0);
  const [selectedFont, setSelectedFont] = useState<string>("Arial");

  const editorRef = useRef<HTMLDivElement>(null);
  const documentCopyRef = useRef<HTMLElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastTargetTextRef = useRef<string>("");
  const lastActionRef = useRef<string>("simplify");

  const currentDoc = docs.find((d) => d.id === activeDocId) || docs[0];

  const { completion, complete, isLoading, stop, error } = useCompletion({
    api: '/api/ai',
    streamProtocol: 'text',
    onError: (err) => {
      showNotice("AI Error: " + (err.message || "Failed to generate"));
    }
  });

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
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
    if (documentCopyRef.current && currentDoc) {
      documentCopyRef.current.innerHTML = currentDoc.content;
      updateWordCount();
    }
  }, [activeDocId]);

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
        prev.map((d) => (d.id === activeDocId ? { ...d, content: newHtml } : d))
      );
    }
  };

  const runAction = async (actionLabel: string) => {
    setActiveAction(actionLabel);

    // Determine target text from active selection or full document
    let targetText = "";
    const selection = window.getSelection()?.toString().trim();

    if (selection) {
      targetText = selection;
      if (window.getSelection()?.rangeCount) {
        savedRangeRef.current = window.getSelection()!.getRangeAt(0).cloneRange();
      }
    } else if (documentCopyRef.current) {
      targetText = documentCopyRef.current.innerText.trim();
    }

    if (!targetText) {
      showNotice("Please write or highlight some text to process.");
      return;
    }

    let aiAction = "improve";
    const labelLower = actionLabel.toLowerCase();

    if (labelLower.includes("summarize")) aiAction = "summarize";
    else if (labelLower.includes("explain") || labelLower.includes("simply") || labelLower.includes("ask")) aiAction = "simplify";
    else if (labelLower.includes("tone") || labelLower.includes("fix")) aiAction = "fix";
    else if (labelLower.includes("shorter")) aiAction = "shorter";
    else if (labelLower.includes("friendly")) aiAction = "friendly";
    else if (labelLower.includes("formal")) aiAction = "formal";
    else if (labelLower.includes("improve")) aiAction = "improve";

    lastTargetTextRef.current = targetText;
    lastActionRef.current = aiAction;

    try {
      await complete(targetText, { body: { action: aiAction } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerate = () => {
    if (lastTargetTextRef.current) {
      complete(lastTargetTextRef.current, { body: { action: lastActionRef.current } });
    } else {
      runAction(activeAction);
    }
  };

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

    // Append to document if no specific range selected
    if (documentCopyRef.current) {
      const p = document.createElement("p");
      p.textContent = completion;
      documentCopyRef.current.appendChild(p);
      handleEditorInput();
      showNotice("Suggestion added to draft");
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
      category: "recent",
      isFavorite: false,
      content: `<h2>Untitled draft</h2><p>Start writing here, or select an AI action to help draft your ideas...</p>`
    };
    setDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newId);
    showNotice("New document created");
  };

  const filteredDocs = docs.filter((doc) => {
    if (activeNav === "Recent") return doc.category === "recent";
    if (activeNav === "Favorites") return doc.isFavorite;
    return true;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand">DraftMate</span>
          <button
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
            <strong>Vasundhara Rai</strong>
            <small>Free plan</small>
          </span>
        </div>
      </aside>

      <main className="workspace">
        <header className="page-header" style={{ minHeight: 'auto', marginBottom: '24px' }}>
          <div>
            <p className="breadcrumb">My documents / {currentDoc?.title}</p>
            <h1>{currentDoc?.title}</h1>
            <p className="edited">Edited just now</p>
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
              onMouseUp={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onInput={handleEditorInput}
            >
              <div className="ai-actions" contentEditable={false}>
                <span className="eyebrow purple">AI actions</span>
                <div className="action-buttons">
                  {["Summarize", "Explain simply", "Fix tone"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={isLoading}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runAction(action)}
                    >
                      {action}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="improve"
                    disabled={isLoading}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runAction("Improve all")}
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
              <span className={`online ${isLoading ? 'animate-pulse' : ''}`} aria-label="Online" title="Ollama llama3.2 connected" />
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
              
              <div className="suggestion">
                {isLoading && !completion ? (
                  <p style={{ color: '#9297a7', fontStyle: 'italic', margin: 0 }}>Thinking with Ollama...</p>
                ) : completion ? (
                  completion.split('\n').map((paragraph, i) => (
                    paragraph.trim() ? <p key={i}>{paragraph}</p> : <br key={i} />
                  ))
                ) : error ? (
                  <p style={{ color: '#dc2626', margin: 0 }}>Error: {error.message || "Failed to reach AI service"}</p>
                ) : (
                  <p style={{ color: '#9297a7', fontStyle: 'italic', margin: 0 }}>Highlight text in the editor or click an AI action to get instant suggestions.</p>
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
                  disabled={isLoading || (!completion && !lastTargetTextRef.current)}
                  onClick={handleRegenerate}
                >
                  Regenerate
                </button>
              </div>

              <div className="quick-prompts">
                <span className="eyebrow">Quick prompts</span>
                <div>
                  {["Make shorter", "More friendly", "More formal"].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isLoading}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runAction(prompt)}
                    >
                      {prompt}
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
