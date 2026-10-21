export interface PhotoMetadata { id: string; takenAt?: number; latitude?: number; longitude?: number }
// Adjacent capture gaps define a group. Missing EXIF is never guessed from file modification time.
export function groupPhotos<T extends PhotoMetadata>(photos: T[]): T[][] {
  const dated = photos.filter(p => Number.isFinite(p.takenAt)).sort((a,b)=>a.takenAt!-b.takenAt!);
  const groups: T[][] = [];
  for (const photo of dated) {
    const last = groups[groups.length-1];
    if (last && photo.takenAt! - last[last.length-1].takenAt! <= 60_000) last.push(photo);
    else groups.push([photo]);
  }
  const unknown = photos.filter(p=>!Number.isFinite(p.takenAt));
  if(unknown.length) groups.push(unknown);
  return groups;
}
