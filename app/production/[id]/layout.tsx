import { Sidebar } from "@/components/studio/Sidebar";
import { CreativeRoomDock } from "@/components/studio/CreativeRoomDock";

export default async function ProductionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="relative flex flex-1 overflow-hidden bg-[#080c18]">
      <Sidebar productionId={id} productionTitle="Production" />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <CreativeRoomDock productionId={id} />
    </div>
  );
}
