import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Received presence update:", body);
    
    // In future: update presence state in a store or database
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating presence:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
