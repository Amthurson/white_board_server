import Link from "next/link";

const sampleBoards = [
  { id: "product-roadmap", name: "产品路线图", updatedAt: "刚刚" },
  { id: "system-design", name: "系统架构", updatedAt: "今天" },
  { id: "meeting-notes", name: "会议白板", updatedAt: "昨天" },
];

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-header">
        <div>
          <p className="eyebrow">Whiteboard Service</p>
          <h1>团队白板</h1>
          <p className="subtitle">
            Next.js 负责产品页面、权限和存储，Excalidraw 提供编辑器能力，实时协作连接独立 room 服务。
          </p>
        </div>
        <Link className="primary-action" href="/board/new">
          新建白板
        </Link>
      </section>

      <section className="board-list" aria-label="白板列表">
        {sampleBoards.map((board) => (
          <Link className="board-row" href={`/board/${board.id}`} key={board.id}>
            <span>
              <strong>{board.name}</strong>
              <small>/{board.id}</small>
            </span>
            <time>{board.updatedAt}</time>
          </Link>
        ))}
      </section>
    </main>
  );
}
