import { ExcalidrawEditor } from "@/components/ExcalidrawEditor";
import { UnlockModal } from "@/components/UnlockModal";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="h-screen w-screen">
      <UnlockModal />
      <ExcalidrawEditor key={id} drawingId={id} />
    </div>
  );
}
