import React from "react";

interface Props {
  content: string;
  className?: string;
}

/** Renders a subset of markdown: ### headings, **bold**, - bullets, numbered lists. */
export default function MarkdownRenderer({ content, className = "" }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${listKey++}`} className="space-y-1 my-2 pl-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-gray-400 mt-0.5 shrink-0">•</span>
            <span>{boldify(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    if (line.startsWith("### ")) {
      flushList();
      const text = line.slice(4).replace(/\*\*/g, "");
      elements.push(
        <h3 key={i} className="font-semibold text-gray-800 text-sm mt-4 mb-1">
          {text}
        </h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      const text = line.slice(3).replace(/\*\*/g, "");
      elements.push(
        <h2 key={i} className="font-semibold text-gray-800 text-base mt-4 mb-1">
          {text}
        </h2>
      );
      return;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
      return;
    }

    if (/^\d+\.\s/.test(line)) {
      listBuffer.push(line.replace(/^\d+\.\s*/, ""));
      return;
    }

    flushList();
    elements.push(
      <p key={i} className="text-sm text-gray-700 leading-relaxed">
        {boldify(line)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

function boldify(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-gray-800">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
