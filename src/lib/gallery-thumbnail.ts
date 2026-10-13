import sharp from "sharp";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Bounded cache avoids repeatedly decoding the same full-size database photo.
const cache = new Map<string, { source: string; bytes: Uint8Array }>();
export async function photoResponse(url: string, requestUrl: string, width: number | null, key: string): Promise<Response> {
  if(width && url.startsWith("/uploads/")) {
    const root=path.resolve(process.cwd(),"public","uploads");
    const file=path.resolve(root,decodeURIComponent(url.slice("/uploads/".length)));
    if(!file.startsWith(`${root}${path.sep}`)) return new Response("Invalid photo",{status:400});
    const info=await stat(file);
    const cacheKey=`${key}:${width}`;
    const signature=`${url}:${info.mtimeMs}`;
    const existing=cache.get(cacheKey);
    const bytes=existing?.source === signature ? existing.bytes : new Uint8Array(await sharp(await readFile(file)).rotate().resize({width,height:width,fit:"inside",withoutEnlargement:true}).webp({quality:72}).toBuffer());
    if(existing?.source !== signature) {if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(cacheKey,{source:signature,bytes});}
    return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}});
  }
  const match = url.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (match) {
    let bytes: Uint8Array = Buffer.from(match[2], "base64");
    let contentType = match[1];
    if (width) {
      const cacheKey = `${key}:${width}`;
      const existing = cache.get(cacheKey);
      if (existing?.source === url) bytes = existing.bytes;
      else {
        bytes = new Uint8Array(await sharp(bytes).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer());
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(cacheKey, { source: url, bytes });
      }
      contentType = "image/webp";
    }
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }
  if (/^(https?:\/\/|\/uploads\/)/.test(url)) return Response.redirect(new URL(url, requestUrl));
  return new Response("Invalid photo", { status: 400 });
}
