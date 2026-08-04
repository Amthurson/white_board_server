"use server";

import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/login" });
}

export async function createBoardSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const board = await prisma.board.create({
    data: {
      ownerId: session.user.id,
      title: `白板 ${now.toLocaleString("zh-CN", { hour12: false })}`,
      sessions: {
        create: {
          createdById: session.user.id,
          title: "默认会话",
          snapshots: {
            create: {
              elements: [],
              files: {},
              savedById: session.user.id,
            },
          },
        },
      },
    },
    include: {
      sessions: {
        select: {
          id: true,
        },
      },
    },
  });

  redirect(`/session/${board.sessions[0].id}`);
}
