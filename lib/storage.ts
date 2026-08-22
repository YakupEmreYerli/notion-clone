/**
 * Client-side helpers for the self-hosted file storage.
 *
 * Uploaded files are addressed by a same-origin path (`/api/files/<key>`) so
 * moving the deployment to another domain never breaks existing documents.
 */

export const FILE_ROUTE_PREFIX = "/api/files/";

/** True for anything that is an actual uploaded/remote file (vs. a CSS color). */
export const isFileUrl = (value?: string | null): value is string =>
  !!value &&
  (value.startsWith(FILE_ROUTE_PREFIX) || /^https?:\/\//.test(value));

/** Files we are allowed to delete from our own bucket. */
export const isManagedFileUrl = (value?: string | null): value is string =>
  !!value && value.startsWith(FILE_ROUTE_PREFIX);

export const uploadFile = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/files", { method: "POST", body });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "Upload failed");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
};

export const deleteFile = async (url?: string | null): Promise<void> => {
  if (!isManagedFileUrl(url)) return;

  await fetch(url, { method: "DELETE" });
};

export const deleteFiles = async (urls: string[]): Promise<void> => {
  await Promise.allSettled(urls.map((url) => deleteFile(url)));
};

const MEDIA_BLOCK_TYPES = new Set(["image", "video", "audio", "file", "pdf"]);

/** Collects every stored file referenced by a document (cover + editor media). */
export const getDocumentUrls = (document: any): string[] => {
  const urls: string[] = [];

  if (isManagedFileUrl(document?.coverImage)) {
    urls.push(document.coverImage);
  }

  if (document?.content) {
    try {
      const blocks = JSON.parse(document.content);
      const traverse = (blocks: any[]) => {
        for (const block of blocks) {
          if (MEDIA_BLOCK_TYPES.has(block.type) && block.props?.url) {
            urls.push(block.props.url);
          }
          if (block.children?.length) traverse(block.children);
        }
      };
      traverse(blocks);
    } catch {}
  }

  return urls.filter(isManagedFileUrl);
};
