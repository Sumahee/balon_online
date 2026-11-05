export const AS_PHOTO_COUNT = 4;
export const AS_PHOTO_BYTES = 200 * 1024;
export type AsPhotoKind = "intake" | "result";

export function asPhotoUrl(id: string, kind: AsPhotoKind, index: number, revision: number) {
  return `/api/posts?type=as&photo=${encodeURIComponent(id)}&kind=${kind}&index=${index}&v=${revision}`;
}

export function asPhotoSummary(id: string, intakeCount: number, resultCount: number, revision: number) {
  return {
    intakePhotos: Array.from({ length: intakeCount }, (_, index) => asPhotoUrl(id, "intake", index, revision)),
    resultPhotos: Array.from({ length: resultCount }, (_, index) => asPhotoUrl(id, "result", index, revision)),
    photosRevision: revision,
  };
}
