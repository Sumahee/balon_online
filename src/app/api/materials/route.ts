import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let materials = serverStore.getMaterials();
  if (category && category !== "전체") {
    materials = materials.filter((m) => m.category === category);
  }

  return NextResponse.json({ success: true, data: materials });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, code, thickness, finish, manufacturer, colorHex, textureType, description, inStock } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, message: "Name and code are required" }, { status: 400 });
    }

    const newMaterial = serverStore.addMaterial({
      name,
      category: category || "PET",
      code,
      thickness: thickness || "18T",
      finish: finish || "Matt",
      manufacturer: manufacturer || "바론 INT",
      colorHex: colorHex || "#4B5563",
      textureType: textureType || "기본",
      description: description || "",
      inStock: inStock !== undefined ? inStock : true,
    });

    return NextResponse.json({ success: true, data: newMaterial }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
