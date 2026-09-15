import { NextRequest, NextResponse } from "next/server";

import * as postsHandler from "@/lib/api-handlers/posts";
import * as clientsHandler from "@/lib/api-handlers/clients";
import * as commentsHandler from "@/lib/api-handlers/comments";
import * as drawingRequestsHandler from "@/lib/api-handlers/drawing-requests";
import * as uploadHandler from "@/lib/api-handlers/upload";
import * as galleryHandler from "@/lib/api-handlers/gallery";
import * as materialsHandler from "@/lib/api-handlers/materials";
import * as dashboardHandler from "@/lib/api-handlers/dashboard";
import * as usersHandler from "@/lib/api-handlers/users";
import * as drawerHandler from "@/lib/api-handlers/drawer";

/**
 * ⚡ [Vercel 통합 Serverless API Router]
 * 
 * Vercel 무료(Hobby) 플랜의 'Serverless Function 최대 12개' 제한을 완벽히 준수하기 위해,
 * 모든 API를 단 1개의 Optional Catch-all Router(/api/[[...slug]])로 통합했습니다.
 * 
 * 기존 10개의 개별 route.ts를 단 1개의 Serverless Function으로 축소하여
 * Vercel 배포 시 함수 제한 에러를 방지하고 배포 안정성을 극대화합니다.
 * 
 * 모든 프론트엔드 엔드포인트(/api/posts, /api/clients, /api/upload 등)는
 * 100% 동일한 URL과 파라미터로 투명하게 라우팅됩니다.
 */

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

async function resolveDomain(request: Request, context: RouteContext) {
  const { slug } = (await context.params) || {};
  if (slug && slug.length > 0) {
    return {
      domain: slug[0],
      subPath: slug.slice(1).join("/"),
    };
  }
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return {
    domain: segments[0] || "",
    subPath: segments.slice(1).join("/"),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.GET(request);
      case "clients":
        return await clientsHandler.GET(request);
      case "comments":
        return await commentsHandler.GET(request);
      case "drawing-requests":
        return await drawingRequestsHandler.GET(request);
      case "gallery":
        return await galleryHandler.GET(request);
      case "materials":
        return await materialsHandler.GET(request);
      case "dashboard":
        return await dashboardHandler.GET();
      case "users":
        return await usersHandler.GET();
      case "":
        return NextResponse.json({
          success: true,
          message: "Balon Online Unified API Serverless Function (Active)",
          functionQuota: "1 Serverless Function used for all endpoints",
          endpoints: [
            "/api/posts",
            "/api/clients",
            "/api/comments",
            "/api/drawing-requests",
            "/api/upload",
            "/api/gallery",
            "/api/materials",
            "/api/dashboard",
            "/api/users",
            "/api/drawer/calculate",
          ],
        });
      default:
        return NextResponse.json(
          { success: false, message: `API endpoint '/api/${domain}' not found` },
          { status: 404 }
        );
    }
  } catch (error: any) {
    console.error("[API Gateway GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { domain, subPath } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.POST(request);
      case "clients":
        return await clientsHandler.POST();
      case "comments":
        return await commentsHandler.POST(request);
      case "drawing-requests":
        return await drawingRequestsHandler.POST(request);
      case "upload":
        return await uploadHandler.POST(request);
      case "gallery":
        return await galleryHandler.POST(request);
      case "materials":
        return await materialsHandler.POST(request);
      case "drawer":
        if (subPath === "calculate" || !subPath) {
          return await drawerHandler.POST(request);
        }
        return NextResponse.json({ success: false, message: "Unknown drawer subpath" }, { status: 404 });
      default:
        return NextResponse.json(
          { success: false, message: `API endpoint '/api/${domain}' not found` },
          { status: 404 }
        );
    }
  } catch (error: any) {
    console.error("[API Gateway POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.PUT(request);
      default:
        return NextResponse.json(
          { success: false, message: `PUT method not supported for '/api/${domain}'` },
          { status: 405 }
        );
    }
  } catch (error: any) {
    console.error("[API Gateway PUT Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "drawing-requests":
        return await drawingRequestsHandler.PATCH(request);
      default:
        return NextResponse.json(
          { success: false, message: `PATCH method not supported for '/api/${domain}'` },
          { status: 405 }
        );
    }
  } catch (error: any) {
    console.error("[API Gateway PATCH Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.DELETE(request);
      case "gallery":
        return await galleryHandler.DELETE(request);
      default:
        return NextResponse.json(
          { success: false, message: `DELETE method not supported for '/api/${domain}'` },
          { status: 405 }
        );
    }
  } catch (error: any) {
    console.error("[API Gateway DELETE Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
