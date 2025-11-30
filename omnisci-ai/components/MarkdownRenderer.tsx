import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body text-sm md:text-base leading-relaxed break-words">
      <ReactMarkdown
        components={{
          ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-3 pb-1 border-b border-slate-700" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold my-2" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold my-2" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-500 pl-3 italic my-2 text-slate-400" {...props} />,
          a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-700 border border-slate-700" {...props} /></div>,
          th: ({node, ...props}) => <th className="px-3 py-2 bg-slate-800 text-left text-xs font-medium text-slate-300 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-300 border-t border-slate-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};