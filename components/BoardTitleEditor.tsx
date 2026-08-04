"use client";

import { useEffect, useState, useTransition } from "react";
import { updateBoardTitle } from "@/app/actions";

type BoardTitleEditorProps = {
  boardId: string;
  initialTitle: string;
  subtitle?: string;
};

export default function BoardTitleEditor({
  boardId,
  initialTitle,
  subtitle,
}: BoardTitleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    setSavedTitle(initialTitle);
  }, [initialTitle]);

  function saveTitle() {
    const nextTitle = title.trim();

    if (!nextTitle || nextTitle === savedTitle || isPending) {
      setTitle(nextTitle || savedTitle);
      return;
    }

    startTransition(async () => {
      const result = await updateBoardTitle(boardId, nextTitle);

      if (result.ok) {
        const saved = result.title || nextTitle;
        setSavedTitle(saved);
        setTitle(saved);
        setMessage("已保存");
        window.setTimeout(() => setMessage(""), 1200);
      } else {
        setMessage(result.message || "保存失败");
      }
    });
  }

  return (
    <div className="board-title-editor">
      <input
        aria-label="画布名"
        disabled={isPending}
        maxLength={80}
        onBlur={saveTitle}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setTitle(savedTitle);
            event.currentTarget.blur();
          }
        }}
        value={title}
      />
      <span>{message || subtitle}</span>
    </div>
  );
}
