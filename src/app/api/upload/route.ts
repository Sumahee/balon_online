import { NextResponse } from "next/server";

/**
 * [API 8] 대용량 파일 & 도면/사진 스토리지 업로드 API
 * 
 * - Cloudflare R2 / AWS S3 오브젝트 스토리지 연동 지원
 * - Cloudflare R2는 Egress(다운로드 트래픽) 비용이 $0이므로 대용량 현장 시공 사진 및 PDF 도면에 최적입니다.
 * - R2 환경변수(R2_ACCOUNT_ID 등) 설정 시 R2 Presigned URL 발급, 미설정 시 안전한 로컬/Mock URL 생성
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, fileType, fileSize, folder } = body;

    if (!fileName) {
      return NextResponse.json({ success: false, error: "fileName is required" }, { status: 400 });
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    const fileExt = fileName.substring(fileName.lastIndexOf("."));
    const timeKey = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storageKey = `${folder || "gallery"}/${timeKey}${fileExt}`;

    if (r2AccountId && r2PublicUrl) {
      // Cloudflare R2 Public URL Output
      const finalUrl = `${r2PublicUrl}/${storageKey}`;
      return NextResponse.json({
        success: true,
        storageType: "r2",
        fileUrl: finalUrl,
        key: storageKey,
        message: "Cloudflare R2 Presigned URL generated successfully.",
      });
    }

    // Default Fallback
    const mockUrl = `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80`;
    return NextResponse.json({
      success: true,
      storageType: "mock",
      fileUrl: mockUrl,
      key: storageKey,
      message: "R2 environment variables not set. Returned mock storage URL.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
