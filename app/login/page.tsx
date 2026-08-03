import { SignInForm } from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <main className="flex-1 bg-zinc-50 dark:bg-black">
      <div className="px-6">
        <SignInForm />
      </div>
    </main>
  );
}
