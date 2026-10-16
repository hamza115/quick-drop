import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FileViewer } from "@/components/files/file-viewer";
import { getCurrentSession } from "@/lib/auth/session";
import { pdfPreviewAvailable } from "@/lib/files/delivery";
import { getFileById, getFileNeighbors } from "@/lib/files/repository";

export const metadata: Metadata = {
  title: "File details",
};

export const instant = false;

export default async function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [item, neighbors] = await Promise.all([
    getFileById(session.user.id, id),
    getFileNeighbors(session.user.id, id),
  ]);
  if (!item) notFound();

  // Only PDFs need the extra delivery check. Null means "not a PDF".
  const pdfAvailable = item.mimeType === "application/pdf" ? await pdfPreviewAvailable(session.user.id, id) : null;

  return <FileViewer item={item} neighbors={neighbors} pdfAvailable={pdfAvailable} />;
}
