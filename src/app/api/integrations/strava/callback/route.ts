import { NextRequest, NextResponse } from "next/server";
import { exchangeStravaCodeAction } from "@/app/actions/strava";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        console.error("Strava OAuth Error:", error);
        return NextResponse.redirect(new URL("/dashboard?strava_error=access_denied", request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL("/dashboard?strava_error=no_code", request.url));
    }

    const result = await exchangeStravaCodeAction(code);

    if (result.error) {
        return NextResponse.redirect(new URL(`/dashboard?strava_error=${encodeURIComponent(result.error)}`, request.url));
    }

    return NextResponse.redirect(new URL("/dashboard?strava_success=true", request.url));
}
