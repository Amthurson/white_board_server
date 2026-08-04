import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle } from "@/app/actions";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">White Board</p>
        <h1>登录白板</h1>
        <p className="subtitle">进入你的白板空间，继续画图、记录和分享想法。</p>
        <form action={signInWithGoogle}>
          <button className="primary-action" type="submit">
            使用 Google 登录
          </button>
        </form>
      </section>
    </main>
  );
}
