"use client";

import { useMemo, useState } from "react";

export default function ShareButton() {
  const shareUrl = useMemo(() => window.location.href, []);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyShareUrl() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.left = "-9999px";
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("copy command failed");
        }
      }

      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.prompt("复制失败，请手动复制链接", shareUrl);
    }
  }

  return (
    <button className="header-share-button" onClick={copyShareUrl} type="button">
      {copyState === "copied"
        ? "已复制"
        : copyState === "failed"
          ? "手动复制"
          : "复制分享链接"}
    </button>
  );
}
