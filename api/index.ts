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
import * as authHandler from "@/lib/api-handlers/auth";
import * as purchasesHandler from "@/lib/api-handlers/purchases";

/**
 * ⚡ [Vercel 최상단 가상 API 서버 통합 핸들러]
 *
 * 최상단 /api 폴더에 위치하여 Vercel Serverless Function 가상 API 서버 역할을 수행합니다.
 * Next.js App Router(src/app/api/[[...slug]]/route.ts)에서도 이 핸들러를 공유하여
 * 404 에러 없이 로컬 및 Vercel 배포 환경에서 100% 동일하게 동작합니다.
 */

interface RouteContext {
  params?: Promise<{ slug?: string[] }> | { slug?: string[] };
}

async function resolveDomain(request: Request, context?: RouteContext) {
  const paramsResolved = context?.params ? await context.params : undefined;
  const { slug } = paramsResolved || {};
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

export async function GET(request: NextRequest, context?: RouteContext) {
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
      case "auth":
        return await authHandler.VERIFY(request);
      case "purchases":
        return await purchasesHandler.GET();
      case "":
        return NextResponse.json({
          success: true,
          message: "Balon Online Virtual API Server (Root /api Active)",
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
    console.error("[Virtual API Server GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context?: RouteContext) {
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
      case "auth":
        return await authHandler.LOGIN(request);
      case "purchases":
        return await purchasesHandler.POST(request);
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
    console.error("[Virtual API Server POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context?: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.PUT(request);
      case "purchases":
        return await purchasesHandler.PUT(request);
      default:
        return NextResponse.json(
          { success: false, message: `PUT method not supported for '/api/${domain}'` },
          { status: 405 }
        );
    }
  } catch (error: any) {
    console.error("[Virtual API Server PUT Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context?: RouteContext) {
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
    console.error("[Virtual API Server PATCH Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context?: RouteContext) {
  try {
    const { domain } = await resolveDomain(request, context);

    switch (domain) {
      case "posts":
        return await postsHandler.DELETE(request);
      case "gallery":
        return await galleryHandler.DELETE(request);
      case "purchases":
        return await purchasesHandler.DELETE(request);
      default:
        return NextResponse.json(
          { success: false, message: `DELETE method not supported for '/api/${domain}'` },
          { status: 405 }
        );
    }
  } catch (error: any) {
    console.error("[Virtual API Server DELETE Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
