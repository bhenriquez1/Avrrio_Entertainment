import { Sidebar } from "@/components/studio/Sidebar";

export default async function ProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar productionId={id} productionTitle="Production" />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
