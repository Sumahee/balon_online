import { NextRequest, NextResponse } from "next/server";
import { calculateDrawer } from "@/lib/drawerEngine";
import { DrawerCalcInput } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cabinetWidth,
      cabinetHeight,
      cabinetDepth,
      boardThickness,
      drawerCount,
      railType,
      marginGap,
    } = body;

    if (!cabinetWidth || !cabinetHeight || !cabinetDepth) {
      return NextResponse.json(
        { success: false, message: "Cabinet width, height, and depth are required" },
        { status: 400 }
      );
    }

    const input: DrawerCalcInput = {
      cabinetWidth: Number(cabinetWidth),
      cabinetHeight: Number(cabinetHeight),
      cabinetDepth: Number(cabinetDepth),
      boardThickness: Number(boardThickness) || 18,
      drawerCount: Number(drawerCount) || 3,
      railType: railType === "ball3stage" ? "ball3stage" : "undermount",
      marginGap: marginGap !== undefined ? Number(marginGap) : 3,
    };

    if (
      input.cabinetWidth < 200 ||
      input.cabinetHeight < 150 ||
      input.cabinetDepth < 250
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Dimensions too small for drawer manufacturing (Min: W200 x H150 x D250mm)",
        },
        { status: 400 }
      );
    }

    const calculation = calculateDrawer(input);
    return NextResponse.json({ success: true, data: calculation });
  } catch {
    return NextResponse.json({ success: false, message: "Calculation failed" }, { status: 500 });
  }
}
