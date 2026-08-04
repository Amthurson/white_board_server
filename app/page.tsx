import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createBoardSession } from "@/app/actions";
import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const boards = await prisma.board.findMany({
    where: {
      ownerId: session.user.id,
    },
    include: {
      sessions: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <>
      <AppHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <main className="home-shell">
        <section className="home-header">
        <div>
          <p className="eyebrow">White Board</p>
          <h1>共享白板</h1>
          <p className="subtitle">
            和团队一起画图、写想法、整理讨论内容。
          </p>
        </div>
        <div className="home-actions">
          <form action={createBoardSession}>
            <button className="primary-action" type="submit">
              新建会话
            </button>
          </form>
        </div>
        </section>

        <section className="board-list" aria-label="白板列表">
        {boards.length === 0 ? (
          <div className="empty-state">还没有白板会话，先创建一个。</div>
        ) : (
          boards.map((board) => {
            const latestSession = board.sessions[0];

            return (
              <Link
                className="board-row"
                href={latestSession ? `/session/${latestSession.id}` : `/board/${board.id}`}
                key={board.id}
              >
                <span>
                  <strong>{board.title}</strong>
                  <small>{latestSession ? `会话 ${latestSession.id}` : board.id}</small>
                </span>
                <time>{board.updatedAt.toLocaleString("zh-CN", { hour12: false })}</time>
              </Link>
            );
          })
        )}
        </section>
      </main>
    </>
  );
}
