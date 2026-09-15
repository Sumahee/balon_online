import { NextRequest } from "next/server";
import {
  GET as rootGET,
  POST as rootPOST,
  PUT as rootPUT,
  PATCH as rootPATCH,
  DELETE as rootDELETE,
} from "@api/index";

/**
 * ⚡ [Next.js App Router & Vercel 최상단 API Bridge]
 *
 * 최상단 /api 폴더에 구축된 Vercel 가상 API 서버 로직을 Next.js App Router와 연결하는 라우터입니다.
 * Vercel Serverless Function 배포와 Next.js local dev/build 환경 모두에서 100% 호환 동작합니다.
 */

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return rootGET(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return rootPOST(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return rootPUT(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return rootPATCH(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return rootDELETE(request, context);
}

