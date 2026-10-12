// Construction photos: max 1920px, JPEG, target <=500KiB, never larger than source.
export function readPhotoFile(file: File): Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error("사진을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
export async function compressPhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const image = new Image();
  image.src = dataUrl;
  try { await image.decode(); } catch { throw new Error("사진을 읽지 못했습니다. JPEG/PNG/WebP 사진을 선택해주세요."); }
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1920 / Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width = Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height = Math.max(1,Math.round(image.naturalHeight*ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 압축을 시작하지 못했습니다.");
  const target = 500 * 1024 * 4 / 3;
  let encoded = ratio === 1 && /^data:image\/(jpeg|png|webp);/.test(dataUrl) ? dataUrl : "";
  for (let attempt=0; attempt<4; attempt++) {
    context.fillStyle="#fff"; context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for (const quality of [0.82,0.72,0.62]) {
      const candidate=canvas.toDataURL("image/jpeg",quality);
      if (!encoded || candidate.length < encoded.length) encoded=candidate;
      if (encoded.length <= target) return encoded;
    }
    canvas.width=Math.max(1,Math.round(canvas.width*0.8));
    canvas.height=Math.max(1,Math.round(canvas.height*0.8));
  }
  if (encoded.length > target) throw new Error("사진을 500KB 이하로 줄이지 못했습니다. 작은 사진으로 다시 첨부해주세요.");
  return encoded;
}
