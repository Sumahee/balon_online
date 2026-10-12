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
      productType,
      cabinetQuantity,
      hasGrain,
    } = body;

    if (!cabinetWidth || ((!productType || productType === "custom") && (!cabinetHeight || !cabinetDepth))) {
      return NextResponse.json(
        { success: false, message: "Cabinet width, height, and depth are required" },
        { status: 400 }
      );
    }

    const input: DrawerCalcInput = {
      productType,
      cabinetQuantity: cabinetQuantity === undefined ? 1 : Number(cabinetQuantity),
      hasGrain: hasGrain === true,
      cabinetWidth: Number(cabinetWidth),
      cabinetHeight: Number(cabinetHeight ?? 850),
      cabinetDepth: Number(cabinetDepth ?? 600),
      boardThickness: Number(boardThickness) || 18,
      drawerCount: Number(drawerCount) || 3,
      railType: railType === "ball3stage" ? "ball3stage" : "undermount",
      marginGap: marginGap !== undefined ? Number(marginGap) : 3,
    };

    if ([input.cabinetWidth, input.cabinetHeight, input.cabinetDepth, input.boardThickness, input.drawerCount, input.marginGap].some(v => !Number.isFinite(v)) || !Number.isInteger(input.drawerCount) || input.drawerCount < 1 || input.drawerCount > 4) {
      return NextResponse.json({ success: false, message: "치수와 단수를 확인해주세요." }, { status: 400 });
    }
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

    let calculation;
    try {
      calculation = calculateDrawer(input);
    } catch (error) {
      return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "제작 입력을 확인해주세요." }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: calculation });
  } catch {
    return NextResponse.json({ success: false, message: "Calculation failed" }, { status: 500 });
  }
}
