"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

// Readable code snippet with a Copy button. Used for the console snippets on the import page.
export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is still selectable below.
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3 pr-16 text-xs text-canvas">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-canvas hover:bg-white/20"
      >
        <Icon name={copied ? "check" : "download"} size={14} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
