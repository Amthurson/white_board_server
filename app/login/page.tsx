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
        <p className="eyebrow">Whiteboard Service</p>
        <h1>登录团队白板</h1>
        <p className="subtitle">使用 Google 账号进入白板列表，创建会话并保存协作记录。</p>
        <form action={signInWithGoogle}>
          <button className="primary-action" type="submit">
            使用 Google 登录
          </button>
        </form>
      </section>
    </main>
  );
}
