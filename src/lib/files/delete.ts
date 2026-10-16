import "server-only";
import { CloudinaryNotConfiguredError, destroyAsset } from "@/lib/cloudinary/server";
import { deleteFileRecord, getFileAssetRef } from "@/lib/files/repository";

export type DeleteOutcome =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: "not_found" | "uploads_unavailable" | "storage_delete_failed" | "delete_partial";
      message: string;
    };

/**
 * Deletes the stored file first, then the library record. If storage fails, nothing changes.
 * If storage succeeds but the record cannot be removed, the outcome says so; deleting again
 * finishes the job, because a file that is already gone from storage counts as removed.
 */
export async function deleteItem(ownerId: string, id: string): Promise<DeleteOutcome> {
  const ref = await getFileAssetRef(ownerId, id);
  if (!ref) return { ok: false, status: 404, code: "not_found", message: "That item doesn't exist. It may already be deleted." };

  if (ref.cloudinaryPublicId && ref.resourceType) {
    try {
      await destroyAsset(ref.cloudinaryPublicId, ref.resourceType, ref.deliveryType);
    } catch (error) {
      if (error instanceof CloudinaryNotConfiguredError) {
        return {
          ok: false,
          status: 503,
          code: "uploads_unavailable",
          message: "Storage isn't set up, so this file can't be removed yet. Nothing was deleted.",
        };
      }
      return {
        ok: false,
        status: 502,
        code: "storage_delete_failed",
        message: "Couldn't remove the file from storage. Nothing was deleted. Try again.",
      };
    }
  }

  try {
    await deleteFileRecord(ownerId, id);
  } catch (error) {
    console.error("[files] delete record failed:", error instanceof Error ? error.name : "unknown error");
    return {
      ok: false,
      status: 500,
      code: "delete_partial",
      message: "The file was removed from storage, but it's still listed in your library. Delete it again to finish.",
    };
  }
  return { ok: true };
}
