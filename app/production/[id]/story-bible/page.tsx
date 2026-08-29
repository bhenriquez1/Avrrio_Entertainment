"use client";
import { use } from "react";

export default function StoryBiblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-xl font-bold text-zinc-50 mb-2">Story Bible</h1>
      <p className="text-sm text-zinc-400 mb-6">Import source documents to extract and build your canon database.</p>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
        <p className="text-sm text-zinc-400">
          Use the <a href={`/production/${id}/canon`} className="text-zinc-200 underline">Canon → Import Document</a> workflow to paste story documents. OpenAI extracts structured canon proposals; Claude reviews for continuity. You approve or reject each fact.
        </p>
      </div>
    </main>
  );
}
