// Some browsers expose screenshots through items, others only through files.
export function clipboardFiles(data: Pick<DataTransfer, "items" | "files">): File[] {
  const files = Array.from(data.items || [])
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null);
  return files.length ? files : Array.from(data.files || []);
}
