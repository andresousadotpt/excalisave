import { CollabEditor } from "@/components/CollabEditor";

export default async function CollabPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return (
    <div className="h-dvh w-screen">
      <CollabEditor roomId={roomId} />
    </div>
  );
}
